import uuid

import pytest
import responses
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from apps.accounts.authentication import clear_jwks_cache
from apps.accounts.models import Profile
from apps.rooms.models import RoomMember
from tests.factories import ProfileFactory, RoomFactory
from tests.tokens import make_token, unsigned_token

pytestmark = pytest.mark.django_db


def test_missing_token_is_401(api):
    response = api.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"


def test_expired_and_tampered_tokens_are_401(api, profile):
    expired = make_token(profile.id, exp=1)
    tampered = make_token(profile.id)[:-1] + ("a" if make_token(profile.id)[-1] != "a" else "b")
    wrong_aud = make_token(profile.id, aud="other")
    for token in (expired, tampered, wrong_aud, unsigned_token(profile.id)):
        response = api.get("/api/v1/users/me", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_token"


def test_unknown_jwks_kid_is_rejected(api, profile, settings):
    clear_jwks_cache()
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    jwk["kid"] = "known"
    import jwt

    token = jwt.encode(
        {
            "sub": str(profile.id),
            "aud": "authenticated",
            "exp": 9999999999,
            "app_metadata": {"role": "member"},
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "missing"},
    )
    with responses.RequestsMock() as mocked:
        mocked.add(
            responses.GET,
            "http://supabase.test/auth/v1/.well-known/jwks.json",
            json={"keys": [jwk]},
            status=200,
        )
        clear_jwks_cache()
        response = api.get("/api/v1/users/me", HTTP_AUTHORIZATION=f"Bearer {token}")
    assert response.status_code == 401
    clear_jwks_cache()


@responses.activate
def test_register_login_refresh_logout_and_password_flows(api):
    user_id = str(uuid.uuid4())
    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/signup",
        json={
            "access_token": "access",
            "refresh_token": "refresh",
            "expires_in": 3600,
            "user": {"id": user_id, "email": "ada@example.com"},
        },
        status=200,
    )
    registered = api.post(
        "/api/v1/auth/register",
        {
            "email": "Ada@Example.com",
            "password": "CorrectHorse1",
            "username": "ada_lovelace",
            "display_name": "Ada Lovelace",
        },
        format="json",
    )
    assert registered.status_code == 201
    assert registered.json()["email_confirmation_required"] is False
    assert "email" not in registered.json()["user"]
    assert Profile.objects.filter(username="ada_lovelace").exists()

    profile = Profile.objects.get(username="ada_lovelace")
    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/token?grant_type=password",
        json={
            "access_token": make_token(profile.id, email="ada@example.com"),
            "refresh_token": "refresh-2",
            "expires_in": 1800,
            "user": {"id": str(profile.id)},
        },
        status=200,
    )
    logged_in = api.post(
        "/api/v1/auth/login",
        {"email": "ada@example.com", "password": "CorrectHorse1"},
        format="json",
    )
    assert logged_in.status_code == 200
    assert logged_in.json()["expires_in"] == 1800

    assert logged_in.json()["user"]["id"] == str(profile.id)


@responses.activate
def test_login_failure_is_generic(api, profile):
    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/token?grant_type=password",
        json={"error": "invalid_grant", "error_description": "Invalid login credentials"},
        status=400,
    )
    missing = api.post(
        "/api/v1/auth/login",
        {"email": "nobody@example.com", "password": "CorrectHorse1"},
        format="json",
    )
    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/token?grant_type=password",
        json={"error": "invalid_grant"},
        status=400,
    )
    wrong = api.post(
        "/api/v1/auth/login",
        {"email": "ada@example.com", "password": "wrong-password-1"},
        format="json",
    )
    assert missing.status_code == 401
    assert wrong.status_code == 401
    assert missing.json() == wrong.json()
    assert missing.json()["error"]["message"] == "Invalid email or password"


@responses.activate
def test_duplicate_email_and_username_and_weak_password(api):
    ProfileFactory(username="taken_name")
    weak = api.post(
        "/api/v1/auth/register",
        {
            "email": "new@example.com",
            "password": "short",
            "username": "fresh_name",
            "display_name": "Fresh",
        },
        format="json",
    )
    assert weak.status_code == 400
    assert weak.json()["error"]["code"] == "weak_password"
    assert len(responses.calls) == 0

    taken = api.post(
        "/api/v1/auth/register",
        {
            "email": "other@example.com",
            "password": "CorrectHorse1",
            "username": "taken_name",
            "display_name": "Other",
        },
        format="json",
    )
    assert taken.status_code == 409
    assert taken.json()["error"]["code"] == "username_taken"
    assert len(responses.calls) == 0

    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/signup",
        json={"error_code": "user_already_exists", "msg": "User already registered"},
        status=422,
    )
    duplicate_email = api.post(
        "/api/v1/auth/register",
        {
            "email": "ada@example.com",
            "password": "CorrectHorse1",
            "username": "brand_new",
            "display_name": "Ada",
        },
        format="json",
    )
    assert duplicate_email.status_code == 409
    assert duplicate_email.json()["error"]["code"] == "email_taken"


def test_unknown_register_field_is_rejected(api):
    response = api.post(
        "/api/v1/auth/register",
        {
            "email": "ada@example.com",
            "password": "CorrectHorse1",
            "username": "ada_lovelace",
            "display_name": "Ada",
            "role": "admin",
        },
        format="json",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


@responses.activate
def test_refresh_logout_forgot_reset_change_and_resend(api, client, profile):
    token = make_token(profile.id, email="user@example.com")
    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/token?grant_type=refresh_token",
        json={"access_token": token, "refresh_token": "next", "expires_in": 1200},
        status=200,
    )
    refreshed = api.post("/api/v1/auth/refresh", {"refresh_token": "old"}, format="json")
    assert refreshed.status_code == 200
    assert refreshed.json()["user"]["username"] == profile.username

    responses.add(responses.POST, "http://supabase.test/auth/v1/logout", status=204)
    logged_out = client.post("/api/v1/auth/logout")
    assert logged_out.status_code == 204

    responses.add(responses.POST, "http://supabase.test/auth/v1/recover", status=200)
    known = api.post("/api/v1/auth/password/forgot", {"email": "user@example.com"}, format="json")
    responses.add(responses.POST, "http://supabase.test/auth/v1/recover", status=400)
    unknown = api.post("/api/v1/auth/password/forgot", {"email": "ghost@example.com"}, format="json")
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()

    responses.add(responses.PUT, "http://supabase.test/auth/v1/user", status=200)
    reset = api.post(
        "/api/v1/auth/password/reset",
        {"token": "recovery-token", "new_password": "CorrectHorse2"},
        format="json",
    )
    assert reset.status_code == 204

    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/token?grant_type=password",
        json={
            "access_token": token,
            "refresh_token": "r",
            "expires_in": 10,
            "user": {"id": str(profile.id)},
        },
        status=200,
    )
    responses.add(responses.PUT, "http://supabase.test/auth/v1/user", status=200)
    changed = client.post(
        "/api/v1/auth/password/change",
        {"current_password": "CorrectHorse1", "new_password": "CorrectHorse2"},
        format="json",
    )
    assert changed.status_code == 204

    responses.add(
        responses.POST,
        "http://supabase.test/auth/v1/token?grant_type=password",
        json={"error": "invalid_grant"},
        status=400,
    )
    rejected = client.post(
        "/api/v1/auth/password/change",
        {"current_password": "wrong-password", "new_password": "CorrectHorse3"},
        format="json",
    )
    assert rejected.status_code == 400
    assert rejected.json()["error"]["code"] == "invalid_password"

    responses.add(responses.POST, "http://supabase.test/auth/v1/resend", status=200)
    resent = api.post("/api/v1/auth/email/resend", {"email": "user@example.com"}, format="json")
    assert resent.status_code == 202


@responses.activate
def test_delete_account_soft_deletes_and_disables_user(api, client, profile):
    room = RoomFactory(created_by=profile)
    responses.add(
        responses.PUT,
        f"http://supabase.test/auth/v1/admin/users/{profile.id}",
        json={"id": str(profile.id)},
        status=200,
    )
    response = client.delete("/api/v1/users/me")
    assert response.status_code == 204
    profile.refresh_from_db()
    assert profile.deleted_at is not None
    assert profile.username != "user0000"
    assert not RoomMember.objects.filter(user=profile, room=room).exists()
    denied = api.get(
        "/api/v1/users/me",
        HTTP_AUTHORIZATION=f"Bearer {make_token(profile.id)}",
    )
    assert denied.status_code == 401
