import logging
import time
import uuid

import jwt
import requests
from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.models import Profile

logger = logging.getLogger(__name__)

_jwks_cache = {"loaded_at": 0.0, "keys": {}}


class AuthUser:
    """Request user built from a verified Supabase access token and the local profile."""

    is_authenticated = True
    is_anonymous = False
    is_active = True

    def __init__(self, profile, claims):
        self.profile = profile
        self.claims = claims
        self.id = profile.id
        self.pk = profile.id
        self.username = profile.username
        metadata = claims.get("app_metadata") or {}
        role = metadata.get("role") or "member"
        self.global_role = role if role in {"member", "admin"} else "member"
        self.email = claims.get("email")

    def __str__(self):
        return self.username


class SupabaseJWTAuthentication(BaseAuthentication):
    www_authenticate_realm = "api"

    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header:
            return None
        scheme, _, token = header.partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            raise AuthenticationFailed("Invalid or expired token")
        claims = verify_token(token.strip())
        return user_from_claims(claims), token.strip()

    def authenticate_header(self, request):
        return 'Bearer realm="api"'


class SupabaseJWTScheme(OpenApiAuthenticationExtension):
    target_class = "apps.accounts.authentication.SupabaseJWTAuthentication"
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}


def clear_jwks_cache():
    _jwks_cache["loaded_at"] = 0.0
    _jwks_cache["keys"] = {}


def verify_token(token):
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed("Invalid or expired token") from exc
    algorithm = header.get("alg")
    if not algorithm or str(algorithm).lower() == "none":
        raise AuthenticationFailed("Invalid or expired token")
    if algorithm == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise AuthenticationFailed("Invalid or expired token")
        return _decode(token, settings.SUPABASE_JWT_SECRET, ["HS256"])
    if algorithm in {"RS256", "ES256"}:
        key = _key_for_kid(header.get("kid"))
        return _decode(token, key, [algorithm])
    raise AuthenticationFailed("Invalid or expired token")


def _decode(token, key, algorithms):
    try:
        return jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=settings.SUPABASE_JWT_AUD,
            options={"require": ["exp", "sub", "aud"]},
        )
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed("Invalid or expired token") from exc


def _key_for_kid(kid):
    if not kid:
        raise AuthenticationFailed("Invalid or expired token")
    keys = _jwks()
    key = keys.get(kid)
    if key is None:
        raise AuthenticationFailed("Invalid or expired token")
    return key


def _jwks():
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["loaded_at"] < 600:
        return _jwks_cache["keys"]
    if not settings.SUPABASE_URL:
        raise AuthenticationFailed("Invalid or expired token")
    try:
        response = requests.get(
            f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json",
            timeout=settings.SUPABASE_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise AuthenticationFailed("Invalid or expired token") from exc
    keys = {}
    for item in payload.get("keys", []):
        if not isinstance(item, dict):
            continue
        kid = item.get("kid")
        if not kid:
            continue
        try:
            keys[kid] = jwt.PyJWK.from_dict(item).key
        except jwt.InvalidKeyError:
            logger.warning("skipping unreadable jwks key")
    _jwks_cache["keys"] = keys
    _jwks_cache["loaded_at"] = now
    return keys


def user_from_claims(claims):
    try:
        profile_id = uuid.UUID(str(claims.get("sub")))
    except (TypeError, ValueError) as exc:
        raise AuthenticationFailed("Invalid or expired token") from exc
    try:
        profile = Profile.objects.get(pk=profile_id)
    except Profile.DoesNotExist as exc:
        raise AuthenticationFailed("Invalid or expired token") from exc
    return AuthUser(profile, claims)
