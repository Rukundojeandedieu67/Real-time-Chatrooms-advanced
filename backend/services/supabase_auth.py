"""Server-side Supabase Auth calls. Views never talk to Auth directly."""

import logging

import requests
from django.conf import settings

from services.http import anon_headers, service_headers

logger = logging.getLogger(__name__)


class SupabaseError(Exception):
    def __init__(self, code, status_code=502):
        super().__init__(code)
        self.code = code
        self.status_code = status_code


def _request(method, path, *, headers, json_body=None, service=False):
    if not settings.SUPABASE_URL:
        raise SupabaseError("not_configured", 503)
    if service and not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseError("not_configured", 503)
    if not service and not settings.SUPABASE_ANON_KEY:
        raise SupabaseError("not_configured", 503)
    try:
        response = requests.request(
            method,
            f"{settings.SUPABASE_URL}{path}",
            headers=headers,
            json=json_body,
            timeout=settings.SUPABASE_HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise SupabaseError("unavailable", 503) from exc
    return response


def _json(response):
    if not response.content:
        return {}
    try:
        data = response.json()
    except ValueError as exc:
        raise SupabaseError("invalid_response", 502) from exc
    if not isinstance(data, dict):
        raise SupabaseError("invalid_response", 502)
    return data


def _error_parts(response):
    try:
        data = response.json()
    except ValueError:
        return "", ""
    if not isinstance(data, dict):
        return "", ""
    code = str(data.get("error_code") or data.get("error") or data.get("code") or "")
    message = str(data.get("msg") or data.get("error_description") or data.get("message") or "")
    return code.lower(), message.lower()


def _user_id(payload):
    user = payload.get("user")
    if isinstance(user, dict) and user.get("id"):
        return str(user["id"])
    if payload.get("id"):
        return str(payload["id"])
    return ""


def _duplicate(response):
    code, message = _error_parts(response)
    blob = f"{code} {message}"
    return response.status_code in {409, 422} or "already" in blob or "exists" in blob


def sign_up(email, password, username, display_name):
    response = _request(
        "POST",
        "/auth/v1/signup",
        headers=anon_headers(),
        json_body={
            "email": email,
            "password": password,
            "data": {"username": username, "display_name": display_name},
        },
    )
    if response.status_code >= 400:
        if _duplicate(response):
            raise SupabaseError("duplicate", 409)
        logger.warning("supabase signup failed status=%s", response.status_code)
        raise SupabaseError("rejected", 502)
    payload = _json(response)
    user = payload.get("user") if isinstance(payload.get("user"), dict) else payload
    if isinstance(user, dict) and user.get("identities") == []:
        raise SupabaseError("duplicate", 409)
    user_id = _user_id(payload)
    if not user_id:
        raise SupabaseError("invalid_response", 502)
    return {
        "user_id": user_id,
        "access_token": payload.get("access_token"),
        "refresh_token": payload.get("refresh_token"),
        "expires_in": payload.get("expires_in"),
    }


def sign_in(email, password):
    response = _request(
        "POST",
        "/auth/v1/token?grant_type=password",
        headers=anon_headers(),
        json_body={"email": email, "password": password},
    )
    if response.status_code >= 400:
        raise SupabaseError("invalid_credentials", 401)
    payload = _json(response)
    if not payload.get("access_token") or not _user_id(payload):
        raise SupabaseError("invalid_credentials", 401)
    payload["user_id"] = _user_id(payload)
    return payload


def refresh(refresh_token):
    response = _request(
        "POST",
        "/auth/v1/token?grant_type=refresh_token",
        headers=anon_headers(),
        json_body={"refresh_token": refresh_token},
    )
    if response.status_code >= 400:
        raise SupabaseError("invalid_refresh", 401)
    payload = _json(response)
    if not payload.get("access_token"):
        raise SupabaseError("invalid_refresh", 401)
    return payload


def logout(access_token):
    response = _request(
        "POST",
        "/auth/v1/logout",
        headers=anon_headers(access_token),
    )
    if response.status_code >= 400:
        logger.warning("supabase logout failed status=%s", response.status_code)
        raise SupabaseError("logout_failed", 502)


def recover(email):
    return _request(
        "POST",
        "/auth/v1/recover",
        headers=anon_headers(),
        json_body={"email": email},
    )


def update_password(access_token, new_password):
    response = _request(
        "PUT",
        "/auth/v1/user",
        headers=anon_headers(access_token),
        json_body={"password": new_password},
    )
    if response.status_code >= 400:
        logger.warning("supabase password update failed status=%s", response.status_code)
        raise SupabaseError("password_update_failed", 400)


def resend_signup(email):
    return _request(
        "POST",
        "/auth/v1/resend",
        headers=anon_headers(),
        json_body={"type": "signup", "email": email},
    )


def disable_user(user_id):
    response = _request(
        "PUT",
        f"/auth/v1/admin/users/{user_id}",
        headers=service_headers(),
        json_body={"ban_duration": "876000h"},
        service=True,
    )
    if response.status_code >= 400:
        logger.warning("supabase disable failed status=%s", response.status_code)
        raise SupabaseError("disable_failed", 502)


def delete_user(user_id):
    response = _request(
        "DELETE",
        f"/auth/v1/admin/users/{user_id}",
        headers=service_headers(),
        service=True,
    )
    if response.status_code >= 400:
        logger.warning("supabase delete user failed status=%s", response.status_code)
        raise SupabaseError("delete_failed", 502)
