"""Test settings. Uses TEST_DATABASE_URL, never the application DATABASE_URL."""

import os

import dj_database_url

from .base import *  # noqa: F403

DEBUG = False
SECRET_KEY = "test-secret-key"  # nosec B105
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

DATABASES = {
    "default": dj_database_url.parse(
        os.getenv("TEST_DATABASE_URL", "postgres://chat:chat@localhost:5432/chat")
    )
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "chat-tests",
    }
}

SUPABASE_URL = "http://supabase.test"
SUPABASE_ANON_KEY = "test-anon-key"
SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"  # nosec B105
SUPABASE_JWT_SECRET = "test-jwt-secret-key-with-32bytes!!"  # nosec B105
STATIC_ROOT.mkdir(exist_ok=True)
SUPABASE_JWT_AUD = "authenticated"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
