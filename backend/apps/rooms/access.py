from apps.core.exceptions import DomainError
from apps.rooms.models import Room, RoomMember


def get_alive_room(room_id):
    try:
        return Room.objects.get(pk=room_id)
    except Room.DoesNotExist as exc:
        raise DomainError("not_found", "Not found", 404) from exc


def get_member(room, profile):
    return RoomMember.objects.filter(room=room, user=profile).first()


def require_member(room, profile, *, action="access"):
    member = get_member(room, profile)
    if member is not None:
        return member
    if room.is_private:
        raise DomainError("not_found", "Not found", 404)
    messages = {
        "read": "Join this room before reading messages",
        "send": "Join this room before sending messages",
        "access": "Join this room before doing that",
    }
    raise DomainError("not_a_member", messages.get(action, messages["access"]), 403)


def require_room_member(room_id, profile, *, action="access"):
    room = get_alive_room(room_id)
    member = require_member(room, profile, action=action)
    return room, member


def get_room_for_viewer(room_id, profile):
    room = get_alive_room(room_id)
    member = get_member(room, profile)
    if member is not None or not room.is_private:
        return room, member
    raise DomainError("not_found", "Not found", 404)


def require_manager(member):
    if member is None or member.role not in {RoomMember.Role.OWNER, RoomMember.Role.ADMIN}:
        raise DomainError("permission_denied", "Only an owner or admin can do that", 403)
    return member


def require_owner(member):
    if member is None or member.role != RoomMember.Role.OWNER:
        raise DomainError("permission_denied", "Only the owner can do that", 403)
    return member
