import uuid

import pytest
from django.core.cache import cache

from tests.factories import RoomFactory

pytestmark = [pytest.mark.django_db, pytest.mark.throttle]


def _rates(settings, **overrides):
    framework = dict(settings.REST_FRAMEWORK)
    rates = dict(framework["DEFAULT_THROTTLE_RATES"])
    rates.update(overrides)
    framework["DEFAULT_THROTTLE_RATES"] = rates
    settings.REST_FRAMEWORK = framework
    settings.THROTTLES_ENABLED = True
    cache.clear()


def test_anon_throttle(api, settings):
    _rates(settings, anon="1/minute")
    first = api.get("/api/v1/rooms")
    second = api.get("/api/v1/rooms")
    assert first.status_code == 401
    assert second.status_code == 429
    assert second["Retry-After"]
    assert second.json()["error"]["code"] == "rate_limited"


def test_login_register_and_password_throttles(api, settings):
    _rates(settings, auth_login="1/minute", anon="100/minute")
    payload = {"email": "ada@example.com", "password": "CorrectHorse1"}
    first = api.post("/api/v1/auth/login", payload, format="json")
    limited = api.post("/api/v1/auth/login", payload, format="json")
    assert first.status_code != 429
    assert limited.status_code == 429
    assert limited["Retry-After"]

    cache.clear()
    _rates(settings, auth_register="1/hour", anon="100/minute")
    body = {
        "email": "ada@example.com",
        "password": "short",
        "username": "ada_lovelace",
        "display_name": "Ada",
    }
    assert api.post("/api/v1/auth/register", body, format="json").status_code == 400
    assert api.post("/api/v1/auth/register", body, format="json").status_code == 429

    cache.clear()
    _rates(settings, auth_password="1/hour", anon="100/minute")
    forgot = {"email": "ada@example.com"}
    assert api.post("/api/v1/auth/password/forgot", forgot, format="json").status_code == 202
    assert api.post("/api/v1/auth/password/forgot", forgot, format="json").status_code == 429


def test_message_typing_upload_and_user_throttles(client, profile, settings):
    room = RoomFactory(created_by=profile, name="ratelimit")
    _rates(settings, message_send="1/minute", user="100/minute")
    first = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "one", "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    second = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "two", "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    assert first.status_code == 201
    assert second.status_code == 429
    assert second["Retry-After"]

    cache.clear()
    _rates(settings, typing="1/minute", user="100/minute")
    assert client.post(
        f"/api/v1/rooms/{room.id}/typing",
        {"is_typing": True},
        format="json",
    ).status_code == 204
    assert client.post(
        f"/api/v1/rooms/{room.id}/typing",
        {"is_typing": True},
        format="json",
    ).status_code == 429

    cache.clear()
    _rates(settings, upload="1/minute", user="100/minute")
    assert client.put("/api/v1/users/me/avatar", {}, format="multipart").status_code == 400
    assert client.put("/api/v1/users/me/avatar", {}, format="multipart").status_code == 429

    cache.clear()
    _rates(settings, user="1/minute")
    assert client.get("/api/v1/users/me").status_code == 200
    limited = client.get("/api/v1/users/me")
    assert limited.status_code == 429
    assert limited["Retry-After"]
