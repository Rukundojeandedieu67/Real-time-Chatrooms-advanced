"""Supabase Storage uploads, deletes and signed URLs."""

import logging

import requests
from django.conf import settings
from django.core.cache import cache

from services.http import service_headers
from services.supabase_auth import SupabaseError

logger = logging.getLogger(__name__)


def _require_storage():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseError("not_configured", 503)


def upload_bytes(bucket, path, data, content_type):
    _require_storage()
    headers = service_headers(json_body=False)
    headers["Content-Type"] = content_type
    headers["x-upsert"] = "false"
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    try:
        response = requests.post(
            url,
            headers=headers,
            data=data,
            timeout=settings.SUPABASE_HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise SupabaseError("unavailable", 503) from exc
    if response.status_code >= 400:
        logger.warning("storage upload failed status=%s", response.status_code)
        raise SupabaseError("upload_failed", 502)


def delete_object(bucket, path):
    """Best-effort delete. A failed delete must not fail the API request."""
    if not path or not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    try:
        response = requests.delete(
            url,
            headers=service_headers(json_body=False),
            timeout=settings.SUPABASE_HTTP_TIMEOUT,
        )
    except requests.RequestException:
        logger.exception("storage delete failed")
        return
    if response.status_code >= 400 and response.status_code != 404:
        logger.warning("storage delete status=%s", response.status_code)


def create_signed_url(bucket, path):
    if not path or not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    cache_key = f"signed-url:{bucket}:{path}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    url = f"{settings.SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}"
    try:
        response = requests.post(
            url,
            headers=service_headers(),
            json={"expiresIn": settings.SUPABASE_SIGNED_URL_TTL},
            timeout=settings.SUPABASE_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError):
        logger.warning("signed url failed")
        return None
    signed = payload.get("signedURL") or payload.get("signedUrl")
    if not isinstance(signed, str) or not signed:
        return None
    if signed.startswith("http://") or signed.startswith("https://"):
        full = signed
    else:
        prefix = signed if signed.startswith("/") else f"/{signed}"
        full = f"{settings.SUPABASE_URL}/storage/v1{prefix}"
    cache.set(cache_key, full, timeout=max(settings.SUPABASE_SIGNED_URL_TTL - 60, 30))
    return full
