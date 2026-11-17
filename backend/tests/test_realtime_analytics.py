import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.chat.models import Message
from apps.realtime.models import TypingState
from apps.rooms.models import RoomMember
from tests.conftest import auth_user
from tests.factories import ProfileFactory, RoomFactory

pytestmark = pytest.mark.django_db


def test_broadcast_runs_after_commit_and_failure_is_ignored(
    client, profile, django_capture_on_commit_callbacks
):
    room = RoomFactory(created_by=profile, name="livechat")
    calls = []

    def spy(*args, **kwargs):
        calls.append(args)

    with patch("apps.realtime.publishing.send_broadcast", spy):
        with django_capture_on_commit_callbacks(execute=False) as callbacks:
            response = client.post(
                f"/api/v1/rooms/{room.id}/messages",
                {"body": "live", "client_message_id": str(uuid.uuid4())},
                format="json",
            )
            assert response.status_code == 201
            assert calls == []
        assert callbacks
        assert calls == []
        callbacks[0]()
    assert calls
    assert calls[0][0] == f"room:{room.id}"
    assert calls[0][1] == "message.created"

    def boom(*args, **kwargs):
        raise RuntimeError("realtime down")

    with patch("apps.realtime.publishing.send_broadcast", boom):
        with django_capture_on_commit_callbacks(execute=True):
            failed = client.post(
                f"/api/v1/rooms/{room.id}/messages",
                {"body": "still saved", "client_message_id": str(uuid.uuid4())},
                format="json",
            )
    assert failed.status_code == 201
    assert Message.objects.filter(body="still saved").exists()


def test_typing_presence_and_expiry(client, profile, api):
    room = RoomFactory(created_by=profile, name="presence")
    stranger = ProfileFactory()
    api.force_authenticate(user=auth_user(stranger), token="access-token")
    blocked = api.post(f"/api/v1/rooms/{room.id}/typing", {"is_typing": True}, format="json")
    assert blocked.status_code == 403

    started = client.post(f"/api/v1/rooms/{room.id}/typing", {"is_typing": True}, format="json")
    assert started.status_code == 204
    current = client.get(f"/api/v1/rooms/{room.id}/typing")
    assert current.status_code == 200
    assert current.json()["results"][0]["user_id"] == str(profile.id)
    TypingState.objects.filter(room=room, user=profile).update(
        expires_at=timezone.now() - timedelta(seconds=1)
    )
    expired = client.get(f"/api/v1/rooms/{room.id}/typing")
    assert expired.json()["results"] == []

    beat = client.post("/api/v1/presence/heartbeat", {"status": "online"}, format="json")
    assert beat.status_code == 200
    online = client.get(f"/api/v1/rooms/{room.id}/presence")
    assert online.json()["results"][0]["username"] == profile.username
    profile.last_seen_at = timezone.now() - timedelta(minutes=10)
    profile.save(update_fields=["last_seen_at"])
    stale = client.get(f"/api/v1/rooms/{room.id}/presence")
    assert stale.json()["results"] == []


def test_analytics_are_scoped(client, profile, api):
    mine = RoomFactory(created_by=profile, name="mineonly")
    other_owner = ProfileFactory()
    other = RoomFactory(created_by=other_owner, name="notmine")
    Message.objects.create(
        room=mine,
        sender=profile,
        body="one",
        client_message_id=uuid.uuid4(),
    )
    Message.objects.create(
        room=other,
        sender=other_owner,
        body="two",
        client_message_id=uuid.uuid4(),
    )
    own = client.get("/api/v1/analytics/messages-per-room")
    names = {row["room_name"] for row in own.json()["results"]}
    assert "mineonly" in names
    assert "notmine" not in names
    stats = client.get(f"/api/v1/rooms/{mine.id}/stats")
    assert stats.status_code == 200
    assert stats.json()["member_count"] == 1
    assert stats.json()["message_count"] == 1
    assert stats.json()["top_senders"][0]["username"] == profile.username

    api.force_authenticate(user=auth_user(profile, role="admin"), token="access-token")
    everything = api.get("/api/v1/analytics/messages-per-room")
    seen = {row["room_name"] for row in everything.json()["results"]}
    assert {"mineonly", "notmine"} <= seen

    stranger = ProfileFactory()
    api.force_authenticate(user=auth_user(stranger), token="access-token")
    hidden = api.get(f"/api/v1/rooms/{other.id}/stats")
    assert hidden.status_code == 403
    RoomMember.objects.filter(room=other).delete()
    other.is_private = True
    other.save(update_fields=["is_private", "updated_at"])
    # The owner membership was deleted, so recreate privacy without members.
    private_hidden = api.get(f"/api/v1/rooms/{other.id}/stats")
    assert private_hidden.status_code == 404
