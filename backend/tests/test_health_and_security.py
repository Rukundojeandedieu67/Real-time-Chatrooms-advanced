import importlib

import pytest
from django.db import DatabaseError

pytestmark = pytest.mark.django_db


def test_health_ok(api):
    response = api.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["X-Frame-Options"] == "DENY"
    assert response["Referrer-Policy"] == "same-origin"
    assert response["X-Request-ID"]


def test_health_database_failure(api, monkeypatch):
    def explode():
        raise DatabaseError("secret-dsn")

    monkeypatch.setattr("apps.core.views.connection.cursor", explode)
    response = api.get("/health")
    assert response.status_code == 503
    body = response.json()
    assert body["error"]["code"] == "unavailable"
    assert "secret-dsn" not in response.content.decode()


def test_request_id_is_echoed_when_safe(api):
    response = api.get("/health", HTTP_X_REQUEST_ID="abc-123")
    assert response["X-Request-ID"] == "abc-123"


def test_request_id_rejects_unsafe_values(api):
    response = api.get("/health", HTTP_X_REQUEST_ID="bad value\r\nX-Evil: 1")
    assert response["X-Request-ID"] != "bad value\r\nX-Evil: 1"
    assert "\n" not in response["X-Request-ID"]


def test_unknown_route_is_json(api):
    response = api.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_unhandled_error_hides_internals(client, monkeypatch):
    def explode(*args, **kwargs):
        raise RuntimeError("postgres://secret-user:secret-pass@db/chat")

    monkeypatch.setattr("apps.rooms.views.list_rooms", explode)
    response = client.get("/api/v1/rooms")
    assert response.status_code == 500
    payload = response.content.decode()
    assert "secret-pass" not in payload
    assert response.json()["error"]["code"] == "server_error"


def test_schema_and_docs_are_public(api):
    schema = api.get("/schema?format=json")
    assert schema.status_code == 200
    body = schema.json()
    paths = body["paths"]
    for path in (
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/rooms/{id}/messages",
        "/api/v1/health",
    ):
        assert path in paths
    docs = api.get("/docs")
    assert docs.status_code == 200
    assert api.get("/api/v1/schema?format=json").status_code == 200
    assert api.get("/api/v1/docs").status_code == 200


def test_prod_settings_lock_down(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "a-real-production-secret")
    monkeypatch.setenv("ALLOWED_HOSTS", "api.example.com")
    monkeypatch.setenv("DATABASE_URL", "postgres://localhost/chat")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service")
    monkeypatch.setenv("CORS_ORIGIN", "https://app.example.com")
    monkeypatch.setenv("DEBUG", "True")
    import config.settings.base as base
    import config.settings.prod as prod

    importlib.reload(base)
    reloaded = importlib.reload(prod)
    assert reloaded.DEBUG is False
    assert reloaded.SECURE_SSL_REDIRECT is True
    assert reloaded.SECURE_HSTS_SECONDS == 31536000
    assert reloaded.SESSION_COOKIE_SECURE is True
    assert reloaded.CSRF_COOKIE_HTTPONLY is True
    assert reloaded.SECURE_HSTS_INCLUDE_SUBDOMAINS is True


def test_service_role_is_not_in_api_responses(client):
    response = client.get("/api/v1/users/me")
    assert "test-service-role-key" not in response.content.decode()
