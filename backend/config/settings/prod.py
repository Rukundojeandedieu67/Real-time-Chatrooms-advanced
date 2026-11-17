"""Production lockdown. DEBUG cannot be turned on from the environment."""

import os
import sys

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False


def _building():
    return any(arg in sys.argv for arg in ("collectstatic", "makemigrations"))


if not _building():
    if not os.getenv("SECRET_KEY") or SECRET_KEY.startswith("django-insecure"):  # noqa: F405
        raise ImproperlyConfigured("SECRET_KEY must be set to a unique value in production")
    if not os.getenv("ALLOWED_HOSTS"):
        raise ImproperlyConfigured("ALLOWED_HOSTS must be set explicitly in production")
    if not os.getenv("REDIS_URL"):
        raise ImproperlyConfigured("REDIS_URL is required in production so rate limits are shared")
    for name in (
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "CORS_ORIGIN",
    ):
        if not os.getenv(name):
            raise ImproperlyConfigured(f"{name} is required in production")

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Load balancers can probe HTTP /health without a redirect loop.
SECURE_REDIRECT_EXEMPT = [r"^health$"]
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
