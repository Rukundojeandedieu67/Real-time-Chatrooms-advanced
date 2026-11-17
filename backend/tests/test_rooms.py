from datetime import timedelta

import pytest
from django.utils import timezone

from apps.rooms.models import Room, RoomMember
from tests.conftest import auth_user
from tests.factories import ProfileFactory, RoomFactory

pytestmark = pytest.mark.django_db


def _as(api, profile, role="member"):
    api.force_authenticate(user=auth_user(profile, role=role), token="access-token")
    return api


def test_room_crud_and_role_checks(client, profile, api):
    created = client.post(
        "/api/v1/rooms",
        {"name": "Design", "description": "Notes", "is_private": False, "max_members": 25},
        format="json",
    )
    assert created.status_code == 201
    room_id = created.json()["id"]
    assert created.json()["my_role"] == "owner"

    listed = client.get("/api/v1/rooms")
    assert listed.status_code == 200
    assert listed.json()["results"][0]["name"] == "Design"

    public = api.get("/api/v1/rooms?scope=public")
    assert public.status_code == 401

    stranger = ProfileFactory()
    _as(api, stranger)
    preview = api.get(f"/api/v1/rooms/{room_id}")
    assert preview.status_code == 200
    assert preview.json()["is_member"] is False

    member = ProfileFactory()
    RoomMember.objects.create(room_id=room_id, user=member, role=RoomMember.Role.MEMBER)
    _as(api, member)
    forbidden = api.patch(f"/api/v1/rooms/{room_id}", {"description": "nope"}, format="json")
    assert forbidden.status_code == 403

    RoomMember.objects.filter(user=member).update(role=RoomMember.Role.ADMIN)
    updated = api.patch(f"/api/v1/rooms/{room_id}", {"description": "Updated"}, format="json")
    assert updated.status_code == 200
    assert updated.json()["description"] == "Updated"

    not_owner = api.delete(f"/api/v1/rooms/{room_id}")
    assert not_owner.status_code == 403
    deleted = client.delete(f"/api/v1/rooms/{room_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/rooms/{room_id}").status_code == 404


def test_join_rules(client, profile, api):
    public = RoomFactory(created_by=profile, max_members=2, name="openspace")
    other = ProfileFactory()
    _as(api, other)
    joined = api.post(f"/api/v1/rooms/{public.id}/join")
    assert joined.status_code == 201
    again = api.post(f"/api/v1/rooms/{public.id}/join")
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "already_member"

    third = ProfileFactory()
    _as(api, third)
    full = api.post(f"/api/v1/rooms/{public.id}/join")
    assert full.status_code == 409
    assert full.json()["error"]["code"] == "room_full"

    private = RoomFactory(is_private=True, name="secretroom")
    hidden = api.post(f"/api/v1/rooms/{private.id}/join")
    assert hidden.status_code == 404
    missing = api.post(f"/api/v1/rooms/{profile.id}/join")
    assert missing.status_code == 404


def test_membership_management_and_invites(client, profile, api):
    room = RoomFactory(created_by=profile, is_private=True, name="cabinet")
    member = ProfileFactory()
    admin = ProfileFactory()
    other_admin = ProfileFactory()
    RoomMember.objects.create(room=room, user=member, role=RoomMember.Role.MEMBER)
    RoomMember.objects.create(room=room, user=admin, role=RoomMember.Role.ADMIN)
    RoomMember.objects.create(room=room, user=other_admin, role=RoomMember.Role.ADMIN)

    _as(api, admin)
    cannot_admin = api.delete(f"/api/v1/rooms/{room.id}/members/{other_admin.id}")
    assert cannot_admin.status_code == 403
    cannot_owner = api.delete(f"/api/v1/rooms/{room.id}/members/{profile.id}")
    assert cannot_owner.status_code == 403
    cannot_role = api.patch(
        f"/api/v1/rooms/{room.id}/members/{member.id}",
        {"role": "admin"},
        format="json",
    )
    assert cannot_role.status_code == 403

    removed = client.delete(f"/api/v1/rooms/{room.id}/members/{member.id}")
    assert removed.status_code == 204
    _as(api, member)
    lost = api.get(f"/api/v1/rooms/{room.id}/messages")
    assert lost.status_code == 404

    promoted = client.patch(
        f"/api/v1/rooms/{room.id}/members/{admin.id}",
        {"role": "member"},
        format="json",
    )
    assert promoted.status_code == 200
    assert promoted.json()["role"] == "member"

    invite = client.post(
        f"/api/v1/rooms/{room.id}/invites",
        {"max_uses": 2, "expires_in_hours": 4},
        format="json",
    )
    assert invite.status_code == 201
    code = invite.json()["code"]
    guest = ProfileFactory()
    _as(api, guest)
    accepted = api.post(f"/api/v1/invites/{code}/accept")
    assert accepted.status_code == 201
    assert RoomMember.objects.filter(room=room, user=guest).exists()

    from apps.rooms.models import RoomInvite

    RoomInvite.objects.filter(code=code).update(expires_at=timezone.now() - timedelta(minutes=1))
    late = ProfileFactory()
    _as(api, late)
    expired = api.post(f"/api/v1/invites/{code}/accept")
    assert expired.status_code == 404
    assert expired.json()["error"]["code"] == "invite_invalid"


def test_ownership_transfer_and_archive(api):
    owner = ProfileFactory()
    admin = ProfileFactory()
    member = ProfileFactory()
    room = RoomFactory(created_by=owner, name="handoff")
    older = RoomMember.objects.create(room=room, user=member, role=RoomMember.Role.MEMBER)
    newer = RoomMember.objects.create(room=room, user=admin, role=RoomMember.Role.ADMIN)
    RoomMember.objects.filter(pk=older.pk).update(joined_at=timezone.now() - timedelta(days=5))
    RoomMember.objects.filter(pk=newer.pk).update(joined_at=timezone.now() - timedelta(days=1))

    _as(api, owner)
    left = api.post(f"/api/v1/rooms/{room.id}/leave")
    assert left.status_code == 204
    newer.refresh_from_db()
    assert newer.role == RoomMember.Role.OWNER
    assert not RoomMember.objects.filter(room=room, user=owner).exists()

    sole = RoomFactory(name="soloowner")
    _as(api, sole.created_by)
    archived = api.post(f"/api/v1/rooms/{sole.id}/leave")
    assert archived.status_code == 204
    assert not Room.objects.filter(pk=sole.id).exists()
    assert Room.all_objects.get(pk=sole.id).deleted_at is not None
