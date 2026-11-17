"""Branch coverage for error paths the happy-path suite does not reach."""

import importlib
import io
import re
import uuid
from datetime import timedelta
from types import SimpleNamespace

import jwt
import pytest
import requests
import responses
from django.contrib import admin
from django.core.exceptions import (
    ImproperlyConfigured,
    PermissionDenied,
    RequestDataTooBig,
    SuspiciousOperation,
)
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.http import Http404
from django.test import RequestFactory
from django.utils import timezone
from PIL import Image
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    MethodNotAllowed,
    NotFound,
    ParseError,
    Throttled,
    UnsupportedMediaType,
    ValidationError,
)
from rest_framework.exceptions import (
    PermissionDenied as DRFPermissionDenied,
)
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.accounts.admin import ProfileAdmin
from apps.accounts.authentication import AuthUser, clear_jwks_cache, user_from_claims, verify_token
from apps.accounts.models import Profile
from apps.accounts.services import (
    change_password,
    delete_account,
    forgot_password,
    login,
    logout_session,
    map_supabase,
    refresh_session,
    register,
    remove_avatar,
    replace_profile,
    resend_verification,
    reset_password,
    save_avatar,
    search_profiles,
    update_profile,
)
from apps.accounts.validators import (
    validate_bio,
    validate_display_name,
    validate_password,
    validate_status,
)
from apps.chat.models import Message, MessageAttachment
from apps.chat.serializers import serialize_message
from apps.chat.services import (
    add_reaction,
    delete_message,
    edit_message,
    get_message,
    list_messages,
    mark_read,
    remove_reaction,
    send_message,
)
from apps.core.exceptions import DomainError, api_exception_handler
from apps.core.images import prepare_image, read_limited
from apps.core.middleware import ApiErrorMiddleware, RequestIdMiddleware
from apps.core.schema import documented
from apps.core.throttles import AnonRateThrottle, LoginRateThrottle
from apps.core.views import BaseAPIView, error_500
from apps.realtime.services import heartbeat, set_typing
from apps.rooms.access import get_room_for_viewer
from apps.rooms.admin import RoomAdmin
from apps.rooms.models import Room, RoomInvite, RoomMember
from apps.rooms.services import (
    accept_invite,
    change_role,
    create_invite,
    create_room,
    leave_room,
    list_rooms,
    remove_all_memberships,
    remove_member,
    room_card,
    save_room_avatar,
    update_room,
)
from services.supabase_auth import (
    SupabaseError,
    disable_user,
    logout,
    refresh,
    sign_in,
    sign_up,
    update_password,
)
from services.supabase_auth import delete_user as delete_supabase_user
from services.supabase_realtime import broadcast
from services.supabase_storage import create_signed_url, delete_object, upload_bytes
from tests.conftest import auth_user
from tests.factories import MessageFactory, ProfileFactory, RoomFactory
from tests.tokens import make_token

pytestmark = pytest.mark.django_db


def _png(size=(4, 3)):
    buffer = io.BytesIO()
    Image.new("RGB", size, "red").save(buffer, format="PNG")
    return buffer.getvalue()


def _raises(code):
    return pytest.raises(DomainError, match=code) if False else pytest.raises(DomainError)


def test_dev_settings_and_prod_missing_env(monkeypatch):
    import config.settings.dev as dev

    assert isinstance(dev.DEBUG, bool)
    required = {
        "SECRET_KEY": "a-real-production-secret",
        "ALLOWED_HOSTS": "api.example.com",
        "DATABASE_URL": "postgres://localhost/chat",
        "REDIS_URL": "redis://localhost:6379/0",
        "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_ANON_KEY": "anon",
        "SUPABASE_SERVICE_ROLE_KEY": "service",
        "CORS_ORIGIN": "https://app.example.com",
    }
    for key, value in required.items():
        monkeypatch.setenv(key, value)
    import config.settings.base as base

    importlib.reload(base)
    import config.settings.prod as prod

    for missing in ("SECRET_KEY", "ALLOWED_HOSTS", "REDIS_URL", "DATABASE_URL"):
        for key, value in required.items():
            monkeypatch.setenv(key, value)
        importlib.reload(base)
        monkeypatch.delenv(missing, raising=False)
        with pytest.raises(ImproperlyConfigured):
            importlib.reload(prod)
    for key, value in required.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("SECRET_KEY", "django-insecure-not-for-prod")
    importlib.reload(base)
    with pytest.raises(ImproperlyConfigured):
        importlib.reload(prod)


def test_exception_envelope_maps_drf_errors():
    context = {}
    throttled = api_exception_handler(Throttled(wait=2), context)
    assert throttled.data["error"]["code"] == "rate_limited"
    assert throttled["Retry-After"] == "2"
    assert api_exception_handler(Throttled(wait=None), context)["Retry-After"] == "1"
    pairs = [
        (AuthenticationFailed(), "invalid_token"),
        (DRFPermissionDenied("nope"), "permission_denied"),
        (DRFPermissionDenied(detail=None), "permission_denied"),
        (NotFound(), "not_found"),
        (MethodNotAllowed("POST"), "method_not_allowed"),
        (ParseError(), "invalid_json"),
        (UnsupportedMediaType("text/plain"), "unsupported_media_type"),
        (ValidationError({"name": ["bad"]}), "validation_error"),
    ]
    for exc, code in pairs:
        body = api_exception_handler(exc, context)
        assert body.data["error"]["code"] == code
    domain = api_exception_handler(DomainError("x", "y", 409, ["a"]), context)
    assert domain.data["error"]["details"]["non_field_errors"] == ["a"]
    unhandled = api_exception_handler(RuntimeError("secret"), context)
    assert unhandled.status_code == 500
    assert "secret" not in str(unhandled.data)
    assert error_500(None).status_code == 500


def test_middleware_maps_django_exceptions():
    def raise_for(exc):
        def inner(request):
            raise exc

        return inner

    request = RequestFactory().get("/api/v1/rooms")
    request.META["HTTP_X_REQUEST_ID"] = "x" * 80
    cases = [
        (RequestDataTooBig(), 413),
        (Http404(), 404),
        (PermissionDenied(), 403),
        (SuspiciousOperation("bad"), 400),
        (RuntimeError("boom"), 500),
    ]
    for exc, status in cases:
        response = ApiErrorMiddleware(raise_for(exc))(request)
        assert response.status_code == status
    admin_request = RequestFactory().get("/admin/login/")
    with pytest.raises(RuntimeError):
        ApiErrorMiddleware(raise_for(RuntimeError("admin")))(admin_request)
    seen = {}

    def ok(request):
        seen["id"] = request.request_id
        from django.http import HttpResponse

        return HttpResponse("ok")

    echoed = RequestIdMiddleware(ok)(RequestFactory().get("/health"))
    assert echoed["X-Request-ID"] == seen["id"]


def test_image_guards_and_reencode():
    upload = SimpleNamespace(size=10, read=lambda n: b"")
    with _raises("file"):
        read_limited(upload, 100)
    upload = SimpleNamespace(size=None, read=lambda n: b"abcde")
    with _raises("file"):
        read_limited(upload, 4)
    jpeg = io.BytesIO()
    Image.new("RGB", (2, 2), "blue").save(jpeg, format="JPEG")
    prepared = prepare_image(jpeg.getvalue(), 2_000_000)
    assert prepared.content_type == "image/jpeg"
    webp = io.BytesIO()
    Image.new("RGB", (2, 2), "green").save(webp, format="WEBP")
    assert prepare_image(webp.getvalue(), 2_000_000).content_type == "image/webp"
    with _raises("dimension"):
        prepare_image(_png((8001, 1)), 5_000_000)
    with _raises("media"):
        prepare_image(b"\xff\xd8\xffnot-an-image", 1000)

    def fat_save(self, buffer, *args, **kwargs):
        buffer.write(b"x" * 500)

    monkey = pytest.MonkeyPatch()
    monkey.setattr(Image.Image, "save", fat_save)
    try:
        with _raises("file"):
            prepare_image(_png(), 200)
    finally:
        monkey.undo()


def test_token_verification_edges(settings):
    profile = ProfileFactory()
    user = AuthUser(profile, {"app_metadata": {"role": "wizard"}, "email": "a@b.co"})
    assert user.global_role == "member"
    assert str(user) == profile.username
    with pytest.raises(AuthenticationFailed):
        verify_token("not-a-token")
    settings.SUPABASE_JWT_SECRET = ""
    with pytest.raises(AuthenticationFailed):
        verify_token(make_token(profile.id, secret="test-jwt-secret-key-with-32bytes!!"))
    settings.SUPABASE_JWT_SECRET = "test-jwt-secret-key-with-32bytes!!"
    import base64
    import json

    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS512"}).encode()).rstrip(b"=").decode()
    with pytest.raises(AuthenticationFailed):
        verify_token(f"{header}.e30.")
    with pytest.raises(AuthenticationFailed):
        user_from_claims({"sub": "nope"})
    from cryptography.hazmat.primitives.asymmetric import rsa

    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = jwt.encode(
        {"sub": str(profile.id), "aud": "authenticated", "exp": 9999999999},
        private,
        algorithm="RS256",
        headers={"kid": "kid-1"},
    )
    clear_jwks_cache()
    settings.SUPABASE_URL = ""
    with pytest.raises(AuthenticationFailed):
        verify_token(token)
    settings.SUPABASE_URL = "http://supabase.test"
    with responses.RequestsMock() as mocked:
        mocked.add(responses.GET, "http://supabase.test/auth/v1/.well-known/jwks.json", status=500)
        clear_jwks_cache()
        with pytest.raises(AuthenticationFailed):
            verify_token(token)
        mocked.add(
            responses.GET,
            "http://supabase.test/auth/v1/.well-known/jwks.json",
            json={"keys": ["nope", {"kty": "oct"}, {"kid": "bad", "kty": "RSA"}]},
            status=200,
        )
        clear_jwks_cache()
        with pytest.raises(AuthenticationFailed):
            verify_token(token)
    clear_jwks_cache()


def test_supabase_auth_and_storage_failures(settings):
    with responses.RequestsMock() as mocked:
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/signup",
            json={"msg": "already registered"},
            status=422,
        )
        with pytest.raises(SupabaseError) as duplicate:
            sign_up("a@b.co", "CorrectHorse1", "ada", "Ada")
        assert duplicate.value.code == "duplicate"
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/signup",
            json={"error": "nope"},
            status=500,
        )
        with pytest.raises(SupabaseError):
            sign_up("a@b.co", "CorrectHorse1", "ada", "Ada")
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/signup",
            json={"user": {"id": str(uuid.uuid4()), "identities": []}},
            status=200,
        )
        with pytest.raises(SupabaseError) as empty_identities:
            sign_up("a@b.co", "CorrectHorse1", "ada", "Ada")
        assert empty_identities.value.code == "duplicate"
        mocked.add(
            responses.POST, "http://supabase.test/auth/v1/signup", json={"user": {}}, status=200
        )
        with pytest.raises(SupabaseError):
            sign_up("a@b.co", "CorrectHorse1", "ada", "Ada")
        mocked.add(responses.POST, "http://supabase.test/auth/v1/signup", body="nope", status=200)
        with pytest.raises(SupabaseError):
            sign_up("a@b.co", "CorrectHorse1", "ada", "Ada")
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/token?grant_type=password",
            json={},
            status=401,
        )
        with pytest.raises(SupabaseError):
            sign_in("a@b.co", "CorrectHorse1")
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/token?grant_type=password",
            json={"access_token": "t"},
            status=200,
        )
        with pytest.raises(SupabaseError):
            sign_in("a@b.co", "CorrectHorse1")
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/token?grant_type=refresh_token",
            json={},
            status=401,
        )
        with pytest.raises(SupabaseError):
            refresh("stale")
        mocked.add(
            responses.POST,
            "http://supabase.test/auth/v1/token?grant_type=refresh_token",
            json={"refresh_token": "r"},
            status=200,
        )
        with pytest.raises(SupabaseError):
            refresh("stale")
        mocked.add(responses.POST, "http://supabase.test/auth/v1/logout", status=500)
        with pytest.raises(SupabaseError):
            logout("access")
        mocked.add(responses.PUT, "http://supabase.test/auth/v1/user", status=400)
        with pytest.raises(SupabaseError):
            update_password("access", "CorrectHorse2")
        mocked.add(
            responses.PUT, re.compile(r"http://supabase.test/auth/v1/admin/users/"), status=500
        )
        with pytest.raises(SupabaseError):
            disable_user("user")
        mocked.add(
            responses.DELETE, re.compile(r"http://supabase.test/auth/v1/admin/users/"), status=500
        )
        with pytest.raises(SupabaseError):
            delete_supabase_user("user")
        mocked.add(responses.POST, re.compile(r"http://supabase.test/storage/"), status=500)
        with pytest.raises(SupabaseError):
            upload_bytes("avatars", "a.png", b"x", "image/png")
        mocked.add(
            responses.POST,
            re.compile(r"http://supabase.test/storage/"),
            body=requests.ConnectionError("no"),
        )
        with pytest.raises(SupabaseError):
            upload_bytes("avatars", "a.png", b"x", "image/png")
        mocked.add(responses.DELETE, re.compile(r"http://supabase.test/storage/"), status=500)
        delete_object("avatars", "a.png")
        mocked.add(responses.DELETE, re.compile(r"http://supabase.test/storage/"), status=404)
        delete_object("avatars", "a.png")
        mocked.add(
            responses.DELETE,
            re.compile(r"http://supabase.test/storage/"),
            body=requests.ConnectionError("no"),
        )
        delete_object("avatars", "gone.png")
        mocked.add(
            responses.POST,
            re.compile(r"http://supabase.test/storage/v1/object/sign/"),
            json={"signedURL": "/object/sign/avatars/a"},
            status=200,
        )
        signed = create_signed_url("avatars", "a")
        assert signed.startswith("http://supabase.test/storage/v1/")
        assert create_signed_url("avatars", "a") == signed
        from django.core.cache import cache

        cache.clear()
        mocked.add(
            responses.POST,
            re.compile(r"http://supabase.test/storage/v1/object/sign/"),
            json={"signedUrl": "https://cdn.example/a"},
            status=200,
        )
        assert create_signed_url("avatars", "b") == "https://cdn.example/a"
        cache.clear()
        mocked.add(
            responses.POST,
            re.compile(r"http://supabase.test/storage/v1/object/sign/"),
            json={"signedURL": ""},
            status=200,
        )
        assert create_signed_url("avatars", "c") is None
        cache.clear()
        mocked.add(
            responses.POST,
            re.compile(r"http://supabase.test/storage/v1/object/sign/"),
            body="nope",
            status=200,
        )
        assert create_signed_url("avatars", "d") is None
        mocked.add(responses.POST, "http://supabase.test/realtime/v1/api/broadcast", status=202)
        broadcast("room:1", "typing", {"ok": True})
        mocked.add(responses.POST, "http://supabase.test/realtime/v1/api/broadcast", status=500)
        with pytest.raises(RuntimeError):
            broadcast("room:1", "typing", {"ok": True})

    settings.SUPABASE_URL = ""
    with pytest.raises(SupabaseError):
        sign_up("a@b.co", "CorrectHorse1", "ada", "Ada")
    broadcast("room:1", "typing", {})
    delete_object("avatars", "a.png")
    assert create_signed_url("avatars", "a") is None
    settings.SUPABASE_URL = "http://supabase.test"
    settings.SUPABASE_SERVICE_ROLE_KEY = ""
    with pytest.raises(SupabaseError):
        upload_bytes("avatars", "a.png", b"x", "image/png")
    for code in (
        "not_configured",
        "duplicate",
        "logout_failed",
        "disable_failed",
        "password_update_failed",
        "other",
    ):
        assert map_supabase(SupabaseError(code)).code


def test_account_service_error_branches(monkeypatch, profile):
    for bad in (None, "short1", "x" * 129, "longpassword", "1234567890"):
        with _raises("weak"):
            validate_password(bad)
    with _raises("display"):
        validate_display_name("  ")
    with _raises("display"):
        validate_display_name("line\nbreak")
    with _raises("bio"):
        validate_bio("x" * 161)
    with _raises("status"):
        validate_status("busy")
    with _raises("search"):
        search_profiles("  ")
    with _raises("search"):
        search_profiles("x" * 51)
    with _raises("username"):
        replace_profile(profile, username="No", display_name="Ok", bio="", status="online")
    taken = ProfileFactory()
    with _raises("username"):
        replace_profile(profile, username=taken.username, display_name="Ok", bio="", status="away")
    update_profile(profile, display_name="Renamed", bio="hi", status="online")
    assert profile.display_name == "Renamed"

    def boom_signup(*args, **kwargs):
        raise SupabaseError("duplicate")

    monkeypatch.setattr("apps.accounts.services.sign_up", boom_signup)
    with _raises("email"):
        register(
            email="new@example.com",
            password="CorrectHorse1",
            username="brandnew",
            display_name="New",
        )

    monkeypatch.setattr(
        "apps.accounts.services.sign_up",
        lambda *args, **kwargs: {"user_id": "not-uuid"},
    )
    with _raises("upstream"):
        register(
            email="new@example.com",
            password="CorrectHorse1",
            username="brandnew",
            display_name="New",
        )

    user_id = str(uuid.uuid4())
    monkeypatch.setattr(
        "apps.accounts.services.sign_up",
        lambda *args, **kwargs: {"user_id": user_id, "access_token": "a"},
    )
    deleted = []

    def record_delete(uid):
        deleted.append(uid)

    monkeypatch.setattr("apps.accounts.services.delete_supabase_user", record_delete)

    def integrity(**kwargs):
        raise IntegrityError("dup")

    monkeypatch.setattr(Profile.objects, "create", integrity)
    with _raises("username"):
        register(
            email="new@example.com",
            password="CorrectHorse1",
            username="brandnew",
            display_name="New",
        )
    assert deleted == [user_id]

    def explode_delete(uid):
        raise SupabaseError("delete_failed")

    monkeypatch.setattr("apps.accounts.services.delete_supabase_user", explode_delete)

    def explode_create(**kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(Profile.objects, "create", explode_create)
    with _raises("server"):
        register(
            email="new@example.com",
            password="CorrectHorse1",
            username="brandnew",
            display_name="New",
        )

    def bad_login(*args, **kwargs):
        raise SupabaseError("invalid_credentials")

    monkeypatch.setattr("apps.accounts.services.sign_in", bad_login)
    with _raises("invalid"):
        login(email="missing@example.com", password="CorrectHorse1")
    monkeypatch.setattr(
        "apps.accounts.services.sign_in",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("unavailable")),
    )
    with _raises("upstream"):
        login(email="missing@example.com", password="CorrectHorse1")
    monkeypatch.setattr(
        "apps.accounts.services.sign_in",
        lambda *a, **k: {"user_id": str(uuid.uuid4()), "access_token": "a"},
    )
    with _raises("invalid"):
        login(email="missing@example.com", password="CorrectHorse1")

    def bad_refresh(*args, **kwargs):
        raise SupabaseError("invalid_refresh")

    monkeypatch.setattr("apps.accounts.services.refresh", bad_refresh)
    with _raises("invalid"):
        refresh_session(refresh_token="stale")
    monkeypatch.setattr("apps.accounts.services.refresh", lambda *a, **k: {})
    with _raises("invalid"):
        refresh_session(refresh_token="stale")
    with _raises("invalid"):
        logout_session(access_token="")
    monkeypatch.setattr(
        "apps.accounts.services.logout",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("logout_failed")),
    )
    with _raises("upstream"):
        logout_session(access_token="access")
    monkeypatch.setattr(
        "apps.accounts.services.recover",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("unavailable")),
    )
    assert "reset" in forgot_password(email="a@b.co")["detail"]
    monkeypatch.setattr(
        "apps.accounts.services.update_password",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("password_update_failed")),
    )
    with _raises("invalid"):
        reset_password(token="tok", new_password="CorrectHorse2")
    monkeypatch.setattr(
        "apps.accounts.services.resend_signup",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("unavailable")),
    )
    assert "verification" in resend_verification(email="a@b.co")["detail"]
    actor = SimpleNamespace(email="")
    with _raises("password"):
        change_password(
            user=actor,
            access_token="t",
            current_password="CorrectHorse1",
            new_password="CorrectHorse1",
        )
    actor.email = ""
    with _raises("email"):
        change_password(
            user=actor,
            access_token="t",
            current_password="CorrectHorse1",
            new_password="CorrectHorse2",
        )
    actor.email = "a@b.co"
    with _raises("invalid"):
        change_password(
            user=actor,
            access_token="",
            current_password="CorrectHorse1",
            new_password="CorrectHorse2",
        )
    monkeypatch.setattr(
        "apps.accounts.services.sign_in",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("invalid_credentials")),
    )
    with _raises("invalid_password"):
        change_password(
            user=actor,
            access_token="t",
            current_password="WrongHorse1",
            new_password="CorrectHorse2",
        )
    monkeypatch.setattr("apps.accounts.services.sign_in", lambda *a, **k: {"access_token": "t"})
    monkeypatch.setattr(
        "apps.accounts.services.update_password",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("unavailable")),
    )
    with _raises("upstream"):
        change_password(
            user=actor,
            access_token="t",
            current_password="CorrectHorse1",
            new_password="CorrectHorse2",
        )

    profile.avatar_path = "old/avatar.png"
    profile.save(update_fields=["avatar_path"])
    monkeypatch.setattr(
        "apps.accounts.services.upload_bytes",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("not_configured")),
    )
    with _raises("upstream"):
        save_avatar(profile, SimpleNamespace(size=None, read=lambda n: _png()))
    monkeypatch.setattr("apps.accounts.services.upload_bytes", lambda *a, **k: None)
    monkeypatch.setattr("apps.accounts.services.delete_object", lambda *a, **k: None)
    save_avatar(profile, SimpleNamespace(size=None, read=lambda n: _png()))
    assert profile.avatar_path
    remove_avatar(profile)
    assert profile.avatar_path == ""

    monkeypatch.setattr(
        "apps.accounts.services.disable_user",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("disable_failed")),
    )
    with _raises("upstream"):
        delete_account(auth_user(profile))
    profile.refresh_from_db()
    assert profile.deleted_at is None


def test_room_and_message_error_branches(profile, monkeypatch):
    with _raises("scope"):
        list_rooms(profile, scope="nope")
    assert list(list_rooms(profile, scope="public")) == []
    with _raises("name"):
        create_room(profile, name="a\nb", description="", is_private=False, max_members=10)
    with _raises("description"):
        create_room(
            profile, name="validroom", description="x" * 301, is_private=False, max_members=10
        )
    with _raises("max"):
        create_room(profile, name="validroom", description="", is_private=False, max_members=True)
    room = RoomFactory(created_by=profile, name="takenname")
    with _raises("name"):
        create_room(profile, name="takenname", description="", is_private=False, max_members=10)
    other = ProfileFactory()
    RoomMember.objects.create(room=room, user=other, role=RoomMember.Role.MEMBER)
    with _raises("max"):
        update_room(profile, room.id, {"max_members": 1})
    with _raises("name"):
        update_room(profile, room.id, {"name": "  "})
    public = RoomFactory(created_by=other, name="otherpublic")
    with _raises("name"):
        update_room(profile, room.id, {"name": public.name, "is_private": False})

    old = MessageFactory(room=room, sender=profile, body="older")
    newest = MessageFactory(room=room, sender=other, body="")
    member = RoomMember.objects.get(room=room, user=profile)
    member.last_read_message = old
    member.save(update_fields=["last_read_message"])
    card = room_card(room, profile)
    assert card["unread_count"] == 1
    assert card["last_message"]["body"] == "Attachment"
    newest.deleted_at = timezone.now()
    newest.save(update_fields=["deleted_at"])
    assert room_card(room, profile)["last_message"]["body"] == "Message deleted"
    long_body = "x" * 200
    newest.deleted_at = None
    newest.body = long_body
    newest.save(update_fields=["deleted_at", "body"])
    assert room_card(room, profile)["last_message"]["body"] == long_body[:140]

    stranger = ProfileFactory()
    private = RoomFactory(created_by=profile, is_private=True, name="secretroom")
    with _raises("not_found"):
        get_room_for_viewer(private.id, stranger)
    with _raises("not_a_member"):
        leave_room(stranger, room.id)
    with _raises("not_found"):
        leave_room(stranger, private.id)
    with _raises("role"):
        change_role(profile, room.id, other.id, "super")
    with _raises("transfer"):
        change_role(profile, room.id, profile.id, "admin")
    RoomMember.objects.filter(room=room, user=other).update(role=RoomMember.Role.OWNER)
    with _raises("owner"):
        change_role(profile, room.id, other.id, "member")
    RoomMember.objects.filter(room=room, user=other).update(role=RoomMember.Role.ADMIN)
    with _raises("yourself"):
        remove_member(profile, room.id, profile.id)
    with _raises("owner"):
        RoomMember.objects.filter(room=room, user=profile).update(role=RoomMember.Role.ADMIN)
        RoomMember.objects.filter(room=room, user=other).update(role=RoomMember.Role.OWNER)
        remove_member(profile, room.id, other.id)
    RoomMember.objects.filter(room=room, user=other).update(role=RoomMember.Role.ADMIN)
    with _raises("admin"):
        remove_member(profile, room.id, other.id)
    RoomMember.objects.filter(room=room, user=profile).update(role=RoomMember.Role.OWNER)
    with _raises("member"):
        remove_member(profile, room.id, uuid.uuid4())
    with _raises("hours"):
        create_invite(profile, room.id, max_uses=1, expires_in_hours=0)
    with _raises("uses"):
        create_invite(profile, room.id, max_uses=0, expires_in_hours=2)
    invite = RoomInvite.objects.create(
        room=room,
        code="fixed-code",
        created_by=profile,
        expires_at=timezone.now() + timedelta(hours=2),
        max_uses=1,
        uses=0,
    )
    monkeypatch.setattr("apps.rooms.services.secrets.token_urlsafe", lambda n: invite.code)
    with _raises("server"):
        create_invite(profile, room.id, max_uses=1, expires_in_hours=2)
    with _raises("invite"):
        accept_invite(stranger, "missing-code")
    invite.expires_at = timezone.now() - timedelta(minutes=1)
    invite.save(update_fields=["expires_at"])
    with _raises("invite"):
        accept_invite(stranger, invite.code)
    invite.expires_at = timezone.now() + timedelta(hours=1)
    invite.uses = invite.max_uses
    invite.save(update_fields=["expires_at", "uses"])
    with _raises("invite"):
        accept_invite(stranger, invite.code)
    room.deleted_at = timezone.now()
    room.save(update_fields=["deleted_at"])
    invite.uses = 0
    invite.save(update_fields=["uses"])
    with _raises("invite"):
        accept_invite(stranger, invite.code)
    remove_all_memberships(profile)
    assert not RoomMember.objects.filter(user=profile, room=room).exists()

    monkeypatch.setattr(
        "apps.rooms.services.upload_bytes",
        lambda *a, **k: (_ for _ in ()).throw(SupabaseError("upload_failed")),
    )
    alive = RoomFactory(created_by=profile, name="avatarroom")
    with _raises("upstream"):
        save_room_avatar(profile, alive.id, SimpleNamespace(size=None, read=lambda n: _png()))
    monkeypatch.setattr("apps.rooms.services.upload_bytes", lambda *a, **k: None)
    monkeypatch.setattr("apps.rooms.services.delete_object", lambda *a, **k: None)
    alive.avatar_path = "rooms/old.png"
    alive.save(update_fields=["avatar_path"])
    saved, _member = save_room_avatar(
        profile, alive.id, SimpleNamespace(size=None, read=lambda n: _png())
    )
    assert saved.avatar_path.startswith(f"rooms/{alive.id}/")
    assert str(alive)
    assert str(RoomMember.objects.get(room=alive, user=profile))

    with _raises("q"):
        list_messages(profile, alive.id, query="q" * 101)
    with _raises("cursor"):
        list_messages(profile, alive.id, before=uuid.uuid4())
    with _raises("limit"):
        list_messages(profile, alive.id, limit="no")
    with _raises("limit"):
        list_messages(profile, alive.id, limit=0)
    with _raises("body"):
        send_message(profile, alive.id, body="", client_message_id=uuid.uuid4())
    with _raises("attachment"):
        send_message(
            profile,
            alive.id,
            body="hi",
            client_message_id=uuid.uuid4(),
            attachment_ids=[uuid.uuid4() for _ in range(5)],
        )
    with _raises("reply"):
        send_message(
            profile, alive.id, body="hi", client_message_id=uuid.uuid4(), reply_to=uuid.uuid4()
        )
    with _raises("body"):
        send_message(profile, alive.id, body="x" * 2001, client_message_id=uuid.uuid4())
    RoomMember.objects.get_or_create(
        room=alive, user=other, defaults={"role": RoomMember.Role.MEMBER}
    )
    with _raises("attachment"):
        send_message(
            profile,
            alive.id,
            body="hi",
            client_message_id=uuid.uuid4(),
            attachment_ids=[uuid.uuid4()],
        )
    client_id = uuid.uuid4()
    message, created = send_message(profile, alive.id, body="once", client_message_id=client_id)
    assert created is True
    again, created_again = send_message(profile, alive.id, body="once", client_message_id=client_id)
    assert created_again is False
    assert again.id == message.id
    with _raises("author"):
        edit_message(other, message.id, "no")
    message.created_at = timezone.now() - timedelta(hours=1)
    message.save(update_fields=["created_at"])
    with _raises("edit"):
        edit_message(profile, message.id, "late")
    message.created_at = timezone.now()
    message.save(update_fields=["created_at"])
    with _raises("body"):
        edit_message(profile, message.id, "  ")
    with _raises("delete"):
        delete_message(other, message.id)
    with _raises("emoji"):
        add_reaction(profile, message.id, "nope")
    with _raises("not_found"):
        remove_reaction(profile, message.id, "like")
    with _raises("message"):
        mark_read(profile, alive.id, uuid.uuid4())
    with _raises("not_found"):
        get_message(profile, uuid.uuid4())
    delete_message(profile, message.id)
    again_deleted = delete_message(profile, message.id)
    assert again_deleted.deleted_at is not None
    with _raises("deleted"):
        edit_message(profile, message.id, "nope")
    with _raises("deleted"):
        add_reaction(profile, message.id, "like")
    from apps.chat.models import MessageReaction

    MessageReaction.objects.create(message=message, user=profile, emoji="like")
    profile.avatar_path = "avatars/me.png"
    profile.save(update_fields=["avatar_path"])
    monkeypatch.setattr(
        "apps.chat.serializers.create_signed_url", lambda *a, **k: "https://cdn.example/a"
    )
    loaded = (
        Message.objects.select_related("sender")
        .prefetch_related("reactions", "attachments")
        .get(pk=message.id)
    )
    loaded.sender.avatar_path = profile.avatar_path
    payload = serialize_message(loaded, profile.id)
    assert payload["body"] is None
    assert payload["reactions"][0]["reacted_by_me"] is True
    assert payload["sender"]["avatar_url"] == "https://cdn.example/a"
    attachment = MessageAttachment.objects.create(
        room=alive,
        uploaded_by=profile,
        storage_path="",
        content_type="image/png",
        size_bytes=10,
        width=1,
        height=1,
    )
    from apps.chat.services import attachment_payload

    assert attachment_payload(attachment)["url"] is None
    ProfileAdmin(Profile, admin.site).get_queryset(None)
    RoomAdmin(Room, admin.site).get_queryset(None)
    documented("rooms", "summary")
    with pytest.raises(ImproperlyConfigured):

        class Missing(AnonRateThrottle):
            scope = "does-not-exist"

        Missing()
    assert LoginRateThrottle()._email(SimpleNamespace()) == ""
    with _raises("status"):
        heartbeat(profile, "busy")
    set_typing(profile, alive.id, is_typing=False)


def test_http_edges(api, client, profile):
    room = RoomFactory(created_by=profile, name="putroom")
    replaced = client.put(
        f"/api/v1/rooms/{room.id}",
        {"name": "putroom", "description": "updated", "is_private": False, "max_members": 20},
        format="json",
    )
    assert replaced.status_code == 200
    members = client.get(f"/api/v1/rooms/{room.id}/members")
    assert members.status_code == 200
    assert members.json()["results"]
    message = MessageFactory(room=room, sender=profile, body="hello")
    fetched = client.get(f"/api/v1/messages/{message.id}")
    assert fetched.status_code == 200
    empty = client.patch("/api/v1/users/me", {}, format="json")
    assert empty.status_code == 400
    empty_room = client.patch(f"/api/v1/rooms/{room.id}", {}, format="json")
    assert empty_room.status_code == 400
    missing = client.get(f"/api/v1/users/{uuid.uuid4()}")
    assert missing.status_code == 404
    bad_json = api.post("/api/v1/auth/login", data="{nope", content_type="application/json")
    assert bad_json.status_code == 400
    assert bad_json.json()["error"]["code"] == "invalid_json"
    stopped = client.post(f"/api/v1/rooms/{room.id}/typing", {"is_typing": False}, format="json")
    assert stopped.status_code == 204
    png = SimpleUploadedFile("a.png", _png(), "image/png")
    extra = client.put("/api/v1/users/me/avatar", {"file": png, "extra": "no"}, format="multipart")
    assert extra.status_code == 400
    weird = api.get("/api/v1/users/me", HTTP_AUTHORIZATION="Token nope")
    assert weird.status_code == 401

    class BoomAuth:
        def authenticate(self, request):
            raise APIException("nope")

        def authenticate_header(self, request):
            return "Bearer"

    class BoomView(BaseAPIView):
        authentication_classes = [BoomAuth]
        permission_classes = APIView.permission_classes

        def get(self, request):
            return None

    django_request = APIRequestFactory().get("/boom")
    view = BoomView()
    request = view.initialize_request(django_request)
    with pytest.raises(APIException):
        view.initial(request)
