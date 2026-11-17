import io
import re
import uuid
from datetime import timedelta

import pytest
import responses
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from apps.chat.models import Message, MessageReaction
from apps.rooms.models import RoomMember
from tests.conftest import auth_user
from tests.factories import MessageFactory, ProfileFactory, RoomFactory

pytestmark = pytest.mark.django_db


def _as(api, profile):
    api.force_authenticate(user=auth_user(profile), token="access-token")
    return api


def _png():
    image = Image.new("RGB", (2, 2), "blue")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_membership_gates_messages(client, profile, api):
    room = RoomFactory(created_by=profile, name="lobbychat")
    private = RoomFactory(is_private=True, name="whisper")
    stranger = ProfileFactory()
    _as(api, stranger)

    read_public = api.get(f"/api/v1/rooms/{room.id}/messages")
    assert read_public.status_code == 403
    assert read_public.json()["error"]["code"] == "not_a_member"
    send_public = api.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "hi", "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    assert send_public.status_code == 403
    assert api.get(f"/api/v1/rooms/{private.id}/messages").status_code == 404
    assert api.get(f"/api/v1/rooms/{uuid.uuid4()}/messages").status_code == 404

    sent = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "hello room", "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    assert sent.status_code == 201
    assert sent.json()["body"] == "hello room"


def test_validation_idempotency_edit_delete_and_reactions(client, profile, api):
    room = RoomFactory(created_by=profile, name="threadroom")
    empty = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "   ", "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    assert empty.status_code == 400
    huge = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "x" * 2001, "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    assert huge.status_code == 400

    client_id = str(uuid.uuid4())
    first = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "once", "client_message_id": client_id},
        format="json",
    )
    second = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "twice", "client_message_id": client_id},
        format="json",
    )
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert second.json()["body"] == "once"
    assert Message.objects.filter(client_message_id=client_id).count() == 1

    message_id = first.json()["id"]
    edited = client.patch(f"/api/v1/messages/{message_id}", {"body": "edited"}, format="json")
    assert edited.status_code == 200
    assert edited.json()["edited_at"] is not None

    Message.objects.filter(pk=message_id).update(created_at=timezone.now() - timedelta(minutes=16))
    late = client.patch(f"/api/v1/messages/{message_id}", {"body": "too late"}, format="json")
    assert late.status_code == 403
    assert late.json()["error"]["code"] == "edit_window_closed"

    other = ProfileFactory()
    RoomMember.objects.create(room=room, user=other, role=RoomMember.Role.MEMBER)
    _as(api, other)
    not_author = api.patch(f"/api/v1/messages/{message_id}", {"body": "nope"}, format="json")
    assert not_author.status_code == 403
    not_delete = api.delete(f"/api/v1/messages/{message_id}")
    assert not_delete.status_code == 403

    RoomMember.objects.filter(user=other).update(role=RoomMember.Role.ADMIN)
    deleted = api.delete(f"/api/v1/messages/{message_id}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True
    assert deleted.json()["body"] is None

    fresh = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {"body": "react to me", "client_message_id": str(uuid.uuid4())},
        format="json",
    )
    target = fresh.json()["id"]
    added = client.put(f"/api/v1/messages/{target}/reactions/like")
    again = client.put(f"/api/v1/messages/{target}/reactions/like")
    assert added.status_code == 201
    assert again.status_code == 200
    assert again.json()["count"] == 1
    assert MessageReaction.objects.filter(message_id=target, emoji="like").count() == 1
    bad = client.put(f"/api/v1/messages/{target}/reactions/rocket")
    assert bad.status_code == 400
    removed = client.delete(f"/api/v1/messages/{target}/reactions/like")
    assert removed.status_code == 204


def test_cursor_pagination_and_read_marker(client, profile, settings):
    room = RoomFactory(created_by=profile, name="historyroom")
    for index in range(3):
        MessageFactory(room=room, sender=profile, body=f"line {index}")
    settings.MESSAGE_PAGE_SIZE_MAX = 2
    page = client.get(f"/api/v1/rooms/{room.id}/messages?limit=50")
    assert page.status_code == 200
    body = page.json()
    assert len(body["results"]) == 2
    assert body["has_more"] is True
    assert body["results"][0]["created_at"] >= body["results"][1]["created_at"]
    older = client.get(f"/api/v1/rooms/{room.id}/messages?before={body['next_before']}&limit=2")
    assert older.status_code == 200
    assert older.json()["results"][0]["id"] not in {row["id"] for row in body["results"]}

    newest = body["results"][0]["id"]
    oldest = older.json()["results"][0]["id"]
    marked = client.post(
        f"/api/v1/rooms/{room.id}/read",
        {"last_read_message_id": newest},
        format="json",
    )
    assert marked.status_code == 200
    assert str(marked.json()["last_read_message_id"]) == newest
    backwards = client.post(
        f"/api/v1/rooms/{room.id}/read",
        {"last_read_message_id": oldest},
        format="json",
    )
    assert backwards.status_code == 200
    assert str(backwards.json()["last_read_message_id"]) == newest

    listing = client.get("/api/v1/rooms")
    card = next(item for item in listing.json()["results"] if item["name"] == "historyroom")
    assert card["unread_count"] == 0
    assert card["last_message"]["body"]


@responses.activate
def test_attachment_can_be_the_only_body(client, profile):
    room = RoomFactory(created_by=profile, name="filesroom")
    responses.add(
        responses.POST,
        re.compile(r"http://supabase.test/storage/v1/object/attachments/.+"),
        json={"Key": "attachments/x"},
        status=200,
    )
    responses.add(
        responses.POST,
        re.compile(r"http://supabase.test/storage/v1/object/sign/.+"),
        json={"signedURL": "/object/sign/attachments/x?token=t"},
        status=200,
    )
    uploaded = client.post(
        f"/api/v1/rooms/{room.id}/attachments",
        {"file": SimpleUploadedFile("pic.png", _png(), content_type="image/png")},
        format="multipart",
    )
    assert uploaded.status_code == 201
    sent = client.post(
        f"/api/v1/rooms/{room.id}/messages",
        {
            "body": "",
            "client_message_id": str(uuid.uuid4()),
            "attachment_ids": [uploaded.json()["id"]],
        },
        format="json",
    )
    assert sent.status_code == 201
    assert sent.json()["attachments"]
