"""Shared settings. Environment-specific modules import this and override."""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _csv(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def _cache():
    redis_url = os.getenv("REDIS_URL", "").strip()
    if redis_url:
        return {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": redis_url,
            }
        }
    return {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "chat-rooms",
        }
    }


SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-dev-only-change-me")
DEBUG = False
ALLOWED_HOSTS = _csv("ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.rooms",
    "apps.chat",
    "apps.realtime",
    "apps.analytics",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "apps.core.middleware.RequestIdMiddleware",
    "apps.core.middleware.ApiErrorMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL", "postgres://chat:chat@localhost:5432/chat"),
        conn_max_age=int(os.getenv("DB_CONN_MAX_AGE", "60")),
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = _csv("CORS_ORIGIN", "http://localhost:5173")
CORS_ALLOW_CREDENTIALS = False

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

THROTTLES_ENABLED = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.SupabaseJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "apps.core.renderers.UTF8JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "apps.core.throttles.AnonRateThrottle",
        "apps.core.throttles.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "20/minute"),
        "user": os.getenv("THROTTLE_USER", "120/minute"),
        "auth_login": os.getenv("THROTTLE_AUTH_LOGIN", "5/minute"),
        "auth_register": os.getenv("THROTTLE_AUTH_REGISTER", "5/hour"),
        "auth_password": os.getenv("THROTTLE_AUTH_PASSWORD", "3/hour"),
        "message_send": os.getenv("THROTTLE_MESSAGE_SEND", "30/minute"),
        "typing": os.getenv("THROTTLE_TYPING", "60/minute"),
        "upload": os.getenv("THROTTLE_UPLOAD", "10/minute"),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Real-Time Chat Rooms API",
    "DESCRIPTION": (
        "Django is the only API the client calls for writes. "
        "Supabase provides Auth, Postgres, Storage and Realtime."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
    "SERVE_AUTHENTICATION": [],
    "COMPONENT_SPLIT_REQUEST": True,
    "SECURITY": [{"bearerAuth": []}],
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWT_AUD = os.getenv("SUPABASE_JWT_AUD", "authenticated")
SUPABASE_HTTP_TIMEOUT = float(os.getenv("SUPABASE_HTTP_TIMEOUT", "10"))
SUPABASE_AVATAR_BUCKET = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")
SUPABASE_ATTACHMENT_BUCKET = os.getenv("SUPABASE_ATTACHMENT_BUCKET", "attachments")
SUPABASE_SIGNED_URL_TTL = int(os.getenv("SUPABASE_SIGNED_URL_TTL", "3600"))

AVATAR_MAX_BYTES = int(os.getenv("AVATAR_MAX_BYTES", str(2 * 1024 * 1024)))
ATTACHMENT_MAX_BYTES = int(os.getenv("ATTACHMENT_MAX_BYTES", str(5 * 1024 * 1024)))
MESSAGE_EDIT_WINDOW_SECONDS = int(os.getenv("MESSAGE_EDIT_WINDOW_SECONDS", "900"))
TYPING_TTL_SECONDS = int(os.getenv("TYPING_TTL_SECONDS", "5"))
PRESENCE_WINDOW_SECONDS = int(os.getenv("PRESENCE_WINDOW_SECONDS", "60"))
MESSAGE_PAGE_SIZE_DEFAULT = 50
MESSAGE_PAGE_SIZE_MAX = 100
INVITE_DEFAULT_HOURS = 168
INVITE_DEFAULT_USES = 10

DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

CACHES = _cache()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "apps.core.logging.RequestIdFilter"},
    },
    "formatters": {
        "standard": {
            "format": "%(asctime)s %(levelname)s %(request_id)s %(name)s %(message)s",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": "standard",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.server": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
