import secrets
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Case, IntegerField, Value, When
from django.utils import timezone

from apps.chat.models import Message
from apps.core.exceptions import DomainError
from apps.core.images import prepare_image, read_limited
from apps.realtime.publishing import publish
from apps.rooms.access import get_member, require_manager, require_owner, require_room_member
from apps.rooms.models import Room, RoomInvite, RoomMember
from services.supabase_auth import SupabaseError
from services.supabase_storage import create_signed_url, delete_object, upload_bytes

INVITE_INVALID = "Invite is invalid or expired"


def list_rooms(profile, *, scope):
    if scope in (None, "", "mine"):
        return Room.objects.filter(memberships__user=profile).distinct().order_by("name")
    if scope == "public":
        return Room.objects.filter(is_private=False).order_by("name")
    raise DomainError(
        "validation_error",
        "scope must be mine or public",
        400,
        {"scope": ["Invalid scope."]},
    )


def room_card(room, profile):
    member = (
        RoomMember.objects.filter(room=room, user=profile)
        .select_related("last_read_message")
        .first()
    )
    latest = (
        Message.objects.filter(room=room).select_related("sender").order_by("-created_at", "-id").first()
    )
    unread = 0
    if member is not None:
        unread_qs = Message.objects.filter(room=room, deleted_at__isnull=True).exclude(sender=profile)
        if member.last_read_message_id:
            unread_qs = unread_qs.filter(created_at__gt=member.last_read_message.created_at)
        unread = unread_qs.count()
    preview = None
    if latest is not None:
        if latest.deleted_at:
            body = "Message deleted"
        elif latest.body:
            body = latest.body[:140]
        else:
            body = "Attachment"
        preview = {
            "id": latest.id,
            "body": body,
            "created_at": latest.created_at,
            "sender_username": latest.sender.username,
        }
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "is_private": room.is_private,
        "avatar_url": _avatar_url(room.avatar_path),
        "max_members": room.max_members,
        "member_count": room.memberships.count(),
        "unread_count": unread,
        "last_message": preview,
        "my_role": member.role if member else None,
        "created_at": room.created_at,
    }


def room_detail(room, member):
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "is_private": room.is_private,
        "avatar_url": _avatar_url(room.avatar_path),
        "max_members": room.max_members,
        "member_count": room.memberships.count(),
        "is_member": member is not None,
        "my_role": member.role if member else None,
        "created_by": room.created_by_id,
        "created_at": room.created_at,
        "updated_at": room.updated_at,
    }


def create_room(profile, *, name, description, is_private, max_members):
    name = _clean_name(name)
    description = _clean_description(description)
    _check_capacity(max_members)
    with transaction.atomic():
        room = Room(
            name=name,
            description=description,
            is_private=is_private,
            max_members=max_members,
            created_by=profile,
        )
        try:
            with transaction.atomic():
                room.save()
        except IntegrityError as exc:
            raise DomainError(
                "name_taken",
                "A public room with this name already exists",
                409,
            ) from exc
        member = RoomMember.objects.create(
            room=room,
            user=profile,
            role=RoomMember.Role.OWNER,
        )
    return room, member


def update_room(profile, room_id, data):
    room, member = require_room_member(room_id, profile)
    require_manager(member)
    if "name" in data:
        room.name = _clean_name(data["name"])
    if "description" in data:
        room.description = _clean_description(data["description"])
    if "is_private" in data:
        room.is_private = bool(data["is_private"])
    if "max_members" in data:
        _check_capacity(data["max_members"])
        if data["max_members"] < room.memberships.count():
            raise DomainError(
                "validation_error",
                "max_members cannot be below the current member count",
                400,
                {"max_members": ["Below the current member count."]},
            )
        room.max_members = data["max_members"]
    try:
        with transaction.atomic():
            room.save()
    except IntegrityError as exc:
        raise DomainError(
            "name_taken",
            "A public room with this name already exists",
            409,
        ) from exc
    return room, member


def delete_room(profile, room_id):
    room, member = require_room_member(room_id, profile)
    require_owner(member)
    room.deleted_at = timezone.now()
    room.save(update_fields=["deleted_at", "updated_at"])
    return room


def save_room_avatar(profile, room_id, upload):
    room, member = require_room_member(room_id, profile)
    require_manager(member)
    prepared = prepare_image(read_limited(upload, settings.AVATAR_MAX_BYTES), settings.AVATAR_MAX_BYTES)
    path = f"rooms/{room.id}/{secrets.token_hex(16)}.{prepared.ext}"
    try:
        upload_bytes(settings.SUPABASE_AVATAR_BUCKET, path, prepared.data, prepared.content_type)
    except SupabaseError as exc:
        from apps.accounts.services import map_storage

        raise map_storage(exc) from exc
    previous = room.avatar_path
    room.avatar_path = path
    room.save(update_fields=["avatar_path", "updated_at"])
    if previous and previous != path:
        delete_object(settings.SUPABASE_AVATAR_BUCKET, previous)
    return room, member


def join_public(profile, room_id):
    with transaction.atomic():
        try:
            room = Room.objects.select_for_update().get(pk=room_id)
        except Room.DoesNotExist as exc:
            raise DomainError("not_found", "Not found", 404) from exc
        if room.is_private:
            raise DomainError("not_found", "Not found", 404)
        member = _add_member(room, profile)
    publish(room.id, "member.joined", _member_event(room, member))
    return member


def leave_room(profile, room_id):
    return _leave(profile, room_id, allow_archived=False)


def remove_all_memberships(profile):
    room_ids = list(RoomMember.objects.filter(user=profile).values_list("room_id", flat=True))
    for room_id in room_ids:
        _leave(profile, room_id, allow_archived=True)


def list_members(profile, room_id):
    room, _member = require_room_member(room_id, profile)
    return RoomMember.objects.filter(room=room).select_related("user").order_by("joined_at", "id")


def change_role(profile, room_id, target_user_id, role):
    if role not in {RoomMember.Role.OWNER, RoomMember.Role.ADMIN, RoomMember.Role.MEMBER}:
        raise DomainError(
            "validation_error",
            "Role must be owner, admin or member",
            400,
            {"role": ["Invalid role."]},
        )
    with transaction.atomic():
        room, actor = _lock_member(profile, room_id)
        require_owner(actor)
        target = _locked_target(room, target_user_id)
        if target.user_id == actor.user_id:
            raise DomainError(
                "validation_error",
                "Transfer ownership by promoting another member",
                400,
            )
        if role == RoomMember.Role.OWNER:
            actor.role = RoomMember.Role.ADMIN
            actor.save(update_fields=["role", "updated_at"])
            target.role = RoomMember.Role.OWNER
            target.save(update_fields=["role", "updated_at"])
            events = [
                ("member.role_changed", _member_event(room, target)),
                ("member.role_changed", _member_event(room, actor)),
            ]
        else:
            if target.role == RoomMember.Role.OWNER:
                raise DomainError(
                    "validation_error",
                    "Assign a new owner before changing the owner's role",
                    400,
                )
            target.role = role
            target.save(update_fields=["role", "updated_at"])
            events = [("member.role_changed", _member_event(room, target))]
    for event, data in events:
        publish(room.id, event, data)
    return target


def remove_member(profile, room_id, target_user_id):
    with transaction.atomic():
        room, actor = _lock_member(profile, room_id)
        require_manager(actor)
        target = _locked_target(room, target_user_id)
        if target.user_id == actor.user_id:
            raise DomainError("validation_error", "Leave the room instead of removing yourself", 400)
        if target.role == RoomMember.Role.OWNER:
            raise DomainError("permission_denied", "The owner cannot be removed", 403)
        if actor.role == RoomMember.Role.ADMIN and target.role == RoomMember.Role.ADMIN:
            raise DomainError("permission_denied", "Admins cannot remove other admins", 403)
        payload = _member_event(room, target)
        target.delete()
    publish(room.id, "member.left", payload)


def create_invite(profile, room_id, *, max_uses, expires_in_hours):
    room, member = require_room_member(room_id, profile)
    require_manager(member)
    if expires_in_hours < 1 or expires_in_hours > 720:
        raise DomainError(
            "validation_error",
            "expires_in_hours must be between 1 and 720",
            400,
            {"expires_in_hours": ["Out of range."]},
        )
    if max_uses < 1 or max_uses > 100:
        raise DomainError(
            "validation_error",
            "max_uses must be between 1 and 100",
            400,
            {"max_uses": ["Out of range."]},
        )
    expires_at = timezone.now() + timedelta(hours=expires_in_hours)
    for _ in range(5):
        code = secrets.token_urlsafe(16)
        try:
            return RoomInvite.objects.create(
                room=room,
                code=code,
                created_by=profile,
                expires_at=expires_at,
                max_uses=max_uses,
                uses=0,
            )
        except IntegrityError:
            continue
    raise DomainError("server_error", "Something went wrong", 500)


def accept_invite(profile, code):
    with transaction.atomic():
        try:
            invite = RoomInvite.objects.select_for_update().get(code=code)
        except RoomInvite.DoesNotExist as exc:
            raise DomainError("invite_invalid", INVITE_INVALID, 404) from exc
        if invite.expires_at <= timezone.now() or invite.uses >= invite.max_uses:
            raise DomainError("invite_invalid", INVITE_INVALID, 404)
        try:
            room = Room.objects.select_for_update().get(pk=invite.room_id)
        except Room.DoesNotExist as exc:
            raise DomainError("invite_invalid", INVITE_INVALID, 404) from exc
        member = _add_member(room, profile)
        invite.uses += 1
        invite.save(update_fields=["uses", "updated_at"])
    publish(room.id, "member.joined", _member_event(room, member))
    return member


def _add_member(room, profile):
    if get_member(room, profile) is not None:
        raise DomainError("already_member", "You are already a member of this room", 409)
    if room.memberships.count() >= room.max_members:
        raise DomainError("room_full", "This room is full", 409)
    try:
        with transaction.atomic():
            return RoomMember.objects.create(
                room=room,
                user=profile,
                role=RoomMember.Role.MEMBER,
            )
    except IntegrityError as exc:
        raise DomainError("already_member", "You are already a member of this room", 409) from exc


def _leave(profile, room_id, *, allow_archived):
    with transaction.atomic():
        manager = Room.all_objects if allow_archived else Room.objects
        try:
            room = manager.select_for_update().get(pk=room_id)
        except Room.DoesNotExist as exc:
            raise DomainError("not_found", "Not found", 404) from exc
        member = (
            RoomMember.objects.select_for_update().filter(room=room, user=profile).first()
        )
        if member is None:
            if room.is_private or room.deleted_at:
                raise DomainError("not_found", "Not found", 404)
            raise DomainError("not_a_member", "Join this room before doing that", 403)
        if room.deleted_at:
            member.delete()
            return
        successor = None
        if member.role == RoomMember.Role.OWNER:
            successor = (
                RoomMember.objects.select_for_update()
                .filter(room=room)
                .exclude(pk=member.pk)
                .annotate(
                    role_rank=Case(
                        When(role=RoomMember.Role.ADMIN, then=Value(0)),
                        When(role=RoomMember.Role.MEMBER, then=Value(1)),
                        default=Value(2),
                        output_field=IntegerField(),
                    )
                )
                .order_by("role_rank", "joined_at", "id")
                .first()
            )
            if successor is not None:
                successor.role = RoomMember.Role.OWNER
                successor.save(update_fields=["role", "updated_at"])
            else:
                room.deleted_at = timezone.now()
                room.save(update_fields=["deleted_at", "updated_at"])
        left = _member_event(room, member)
        promoted = _member_event(room, successor) if successor is not None else None
        member.delete()
    publish(room.id, "member.left", left)
    if promoted is not None:
        publish(room.id, "member.role_changed", promoted)


def _lock_member(profile, room_id):
    try:
        room = Room.objects.select_for_update().get(pk=room_id)
    except Room.DoesNotExist as exc:
        raise DomainError("not_found", "Not found", 404) from exc
    member = RoomMember.objects.select_for_update().filter(room=room, user=profile).first()
    if member is None:
        if room.is_private:
            raise DomainError("not_found", "Not found", 404)
        raise DomainError("not_a_member", "Join this room before doing that", 403)
    return room, member


def _locked_target(room, user_id):
    target = RoomMember.objects.select_for_update().filter(room=room, user_id=user_id).first()
    if target is None:
        raise DomainError("not_found", "Member not found", 404)
    return target


def _member_event(room, member):
    return {
        "room_id": str(room.id),
        "user_id": str(member.user_id),
        "username": member.user.username,
        "display_name": member.user.display_name,
        "role": member.role,
    }


def _avatar_url(path):
    if not path:
        return None
    return create_signed_url(settings.SUPABASE_AVATAR_BUCKET, path)


def _clean_name(name):
    cleaned = (name or "").strip()
    if len(cleaned) < 3 or len(cleaned) > 60 or "\n" in cleaned or "\r" in cleaned:
        raise DomainError(
            "validation_error",
            "Room name must be 3-60 characters",
            400,
            {"name": ["Invalid room name."]},
        )
    return cleaned


def _clean_description(description):
    cleaned = (description or "").strip()
    if len(cleaned) > 300:
        raise DomainError(
            "validation_error",
            "Description must be 300 characters or fewer",
            400,
            {"description": ["Too long."]},
        )
    return cleaned


def _check_capacity(max_members):
    if not isinstance(max_members, int) or isinstance(max_members, bool):
        raise DomainError(
            "validation_error",
            "max_members must be an integer",
            400,
            {"max_members": ["Invalid number."]},
        )
    if max_members < 1 or max_members > 10000:
        raise DomainError(
            "validation_error",
            "max_members must be between 1 and 10000",
            400,
            {"max_members": ["Out of range."]},
        )
