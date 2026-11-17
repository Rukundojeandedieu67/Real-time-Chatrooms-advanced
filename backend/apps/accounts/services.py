import logging
import uuid

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.authentication import user_from_claims, verify_token
from apps.accounts.models import Profile
from apps.accounts.validators import (
    validate_bio,
    validate_display_name,
    validate_password,
    validate_status,
    validate_username,
)
from apps.core.exceptions import DomainError
from apps.core.images import prepare_image, read_limited
from services.supabase_auth import SupabaseError
from services.supabase_auth import delete_user as delete_supabase_user
from services.supabase_auth import (
    disable_user,
    logout,
    recover,
    refresh,
    resend_signup,
    sign_in,
    sign_up,
    update_password,
)
from services.supabase_storage import delete_object, upload_bytes

logger = logging.getLogger(__name__)

FORGOT_DETAIL = "If an account exists for that email, a reset message has been sent."
RESEND_DETAIL = "If an account is waiting for verification, a message has been sent."


def map_supabase(exc):
    if exc.code == "not_configured":
        return DomainError(
            "upstream_not_configured",
            "Authentication service is not configured",
            503,
        )
    if exc.code == "duplicate":
        return DomainError("email_taken", "An account with this email already exists", 409)
    if exc.code == "logout_failed":
        return DomainError("upstream_unavailable", "The session could not be revoked", 502)
    if exc.code == "disable_failed":
        return DomainError("upstream_unavailable", "The account could not be disabled", 502)
    if exc.code == "password_update_failed":
        return DomainError("invalid_token", "Recovery token is invalid or expired", 400)
    return DomainError("upstream_unavailable", "Authentication service is unavailable", 503)


def map_storage(exc):
    if exc.code == "not_configured":
        return DomainError("upstream_not_configured", "File storage is not configured", 503)
    return DomainError("upstream_unavailable", "File storage is unavailable", 503)


def register(*, email, password, username, display_name):
    email = email.strip().lower()
    username = username.strip()
    display_name = validate_display_name(display_name)
    validate_password(password)
    validate_username(username)
    if Profile.all_objects.filter(username=username).exists():
        raise DomainError("username_taken", "That username is already taken", 409)
    try:
        created = sign_up(email, password, username, display_name)
    except SupabaseError as exc:
        raise map_supabase(exc) from exc
    try:
        profile_id = uuid.UUID(created["user_id"])
    except ValueError as exc:
        raise DomainError("upstream_unavailable", "Authentication service is unavailable", 503) from exc
    try:
        profile = Profile.objects.create(
            id=profile_id,
            username=username,
            display_name=display_name,
        )
    except IntegrityError:
        _compensate(profile_id)
        raise DomainError("username_taken", "That username is already taken", 409) from None
    except Exception:
        _compensate(profile_id)
        logger.exception("profile create failed")
        raise DomainError("server_error", "Something went wrong", 500) from None
    return {
        "profile": profile,
        "access_token": created.get("access_token"),
        "refresh_token": created.get("refresh_token"),
        "expires_in": created.get("expires_in"),
        "email_confirmation_required": not bool(created.get("access_token")),
    }


def _compensate(user_id):
    try:
        delete_supabase_user(str(user_id))
    except SupabaseError:
        logger.exception("failed to compensate supabase user")


def login(*, email, password):
    email = email.strip().lower()
    try:
        result = sign_in(email, password)
    except SupabaseError as exc:
        if exc.code == "invalid_credentials":
            raise DomainError("invalid_credentials", "Invalid email or password", 401) from exc
        raise map_supabase(exc) from exc
    profile = Profile.objects.filter(pk=result["user_id"]).first()
    if profile is None:
        raise DomainError("invalid_credentials", "Invalid email or password", 401)
    return _session(profile, result)


def refresh_session(*, refresh_token):
    try:
        result = refresh(refresh_token)
    except SupabaseError as exc:
        if exc.code == "invalid_refresh":
            raise DomainError("invalid_token", "Invalid or expired token", 401) from exc
        raise map_supabase(exc) from exc
    access = result.get("access_token")
    if not access:
        raise DomainError("invalid_token", "Invalid or expired token", 401)
    user = user_from_claims(verify_token(access))
    return _session(user.profile, result)


def _session(profile, result):
    return {
        "profile": profile,
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "expires_in": result.get("expires_in"),
    }


def logout_session(*, access_token):
    if not access_token:
        raise DomainError("invalid_token", "Invalid or expired token", 401)
    try:
        logout(access_token)
    except SupabaseError as exc:
        raise map_supabase(exc) from exc


def forgot_password(*, email):
    email = email.strip().lower()
    try:
        recover(email)
    except SupabaseError:
        logger.warning("password recovery upstream failed")
    return {"detail": FORGOT_DETAIL}


def reset_password(*, token, new_password):
    validate_password(new_password)
    try:
        update_password(token, new_password)
    except SupabaseError as exc:
        if exc.code == "password_update_failed":
            raise DomainError("invalid_token", "Recovery token is invalid or expired", 400) from exc
        raise map_supabase(exc) from exc


def change_password(*, user, access_token, current_password, new_password):
    validate_password(new_password)
    if current_password == new_password:
        raise DomainError(
            "validation_error",
            "New password must be different from the current password",
            400,
        )
    if not user.email:
        raise DomainError("validation_error", "This session has no email claim", 400)
    if not access_token:
        raise DomainError("invalid_token", "Invalid or expired token", 401)
    try:
        sign_in(user.email, current_password)
    except SupabaseError as exc:
        if exc.code == "invalid_credentials":
            raise DomainError("invalid_password", "Current password is incorrect", 400) from exc
        raise map_supabase(exc) from exc
    try:
        update_password(access_token, new_password)
    except SupabaseError as exc:
        raise map_supabase(exc) from exc


def resend_verification(*, email):
    email = email.strip().lower()
    try:
        resend_signup(email)
    except SupabaseError:
        logger.warning("resend verification upstream failed")
    return {"detail": RESEND_DETAIL}


def replace_profile(profile, *, username, display_name, bio, status):
    username = username.strip()
    validate_username(username)
    display_name = validate_display_name(display_name)
    bio = validate_bio(bio)
    status = validate_status(status)
    if Profile.all_objects.exclude(pk=profile.pk).filter(username=username).exists():
        raise DomainError("username_taken", "That username is already taken", 409)
    profile.username = username
    profile.display_name = display_name
    profile.bio = bio
    profile.status = status
    try:
        profile.save()
    except IntegrityError as exc:
        raise DomainError("username_taken", "That username is already taken", 409) from exc
    return profile


def update_profile(profile, **fields):
    if "display_name" in fields:
        profile.display_name = validate_display_name(fields["display_name"])
    if "bio" in fields:
        profile.bio = validate_bio(fields["bio"])
    if "status" in fields:
        profile.status = validate_status(fields["status"])
    profile.save()
    return profile


def save_avatar(profile, upload):
    prepared = prepare_image(read_limited(upload, settings.AVATAR_MAX_BYTES), settings.AVATAR_MAX_BYTES)
    path = f"{profile.id}/{uuid.uuid4().hex}.{prepared.ext}"
    try:
        upload_bytes(settings.SUPABASE_AVATAR_BUCKET, path, prepared.data, prepared.content_type)
    except SupabaseError as exc:
        raise map_storage(exc) from exc
    previous = profile.avatar_path
    profile.avatar_path = path
    profile.save(update_fields=["avatar_path", "updated_at"])
    if previous and previous != path:
        delete_object(settings.SUPABASE_AVATAR_BUCKET, previous)
    return profile


def remove_avatar(profile):
    previous = profile.avatar_path
    profile.avatar_path = ""
    profile.save(update_fields=["avatar_path", "updated_at"])
    if previous:
        delete_object(settings.SUPABASE_AVATAR_BUCKET, previous)


def search_profiles(term):
    term = (term or "").strip()
    if not term:
        raise DomainError("validation_error", "search is required", 400, {"search": ["This field is required."]})
    if len(term) > 50:
        raise DomainError("validation_error", "search is too long", 400, {"search": ["Too long."]})
    return Profile.objects.filter(
        Q(username__icontains=term) | Q(display_name__icontains=term)
    ).order_by("username")


def delete_account(user):
    from apps.rooms.services import remove_all_memberships

    profile = Profile.objects.get(pk=user.profile.id)
    with transaction.atomic():
        remove_all_memberships(profile)
        previous_avatar = profile.avatar_path
        profile.username = f"d{profile.id.hex[:29]}"
        profile.display_name = "Deleted user"
        profile.bio = ""
        profile.avatar_path = ""
        profile.status = Profile.Status.OFFLINE
        profile.deleted_at = timezone.now()
        profile.save()
        try:
            disable_user(str(profile.id))
        except SupabaseError as exc:
            raise map_supabase(exc) from exc
    if previous_avatar:
        delete_object(settings.SUPABASE_AVATAR_BUCKET, previous_avatar)
