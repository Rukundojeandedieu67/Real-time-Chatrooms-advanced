"""HTTP helpers for Supabase. The service-role key is read only in this package."""

from django.conf import settings


def anon_headers(token=None):
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def service_headers(*, json_body=True):
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    if json_body:
        headers["Content-Type"] = "application/json"
    return headers
