from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.core.exceptions import DomainError
from apps.realtime.models import TypingState
from apps.realtime.publishing import publish
from apps.rooms.access import require_room_member
from apps.rooms.models import RoomMember


def set_typing(profile, room_id, *, is_typing):
    room, _member = require_room_member(room_id, profile, action="send")
    if is_typing:
        TypingState.objects.update_or_create(
            room=room,
            user=profile,
            defaults={
                "expires_at": timezone.now() + timedelta(seconds=settings.TYPING_TTL_SECONDS)
            },
        )
    else:
        TypingState.objects.filter(room=room, user=profile).delete()
    publish(
        room.id,
        "typing",
        {
            "user_id": str(profile.id),
            "display_name": profile.display_name,
            "is_typing": bool(is_typing),
        },
    )


def list_typing(profile, room_id):
    room, _member = require_room_member(room_id, profile, action="read")
    now = timezone.now()
    TypingState.objects.filter(room=room, expires_at__lte=now).delete()
    rows = TypingState.objects.filter(room=room, expires_at__gt=now).select_related("user")
    return [
        {
            "user_id": row.user_id,
            "display_name": row.user.display_name,
            "expires_at": row.expires_at,
        }
        for row in rows
    ]


def heartbeat(profile, status):
    if status not in {"online", "away", "offline"}:
        raise DomainError(
            "validation_error",
            "Status must be online, away or offline",
            400,
            {"status": ["Invalid status."]},
        )
    profile.status = status
    profile.last_seen_at = timezone.now()
    profile.save(update_fields=["status", "last_seen_at", "updated_at"])
    return profile


def room_presence(profile, room_id):
    room, _member = require_room_member(room_id, profile, action="read")
    cutoff = timezone.now() - timedelta(seconds=settings.PRESENCE_WINDOW_SECONDS)
    members = (
        RoomMember.objects.filter(
            room=room,
            user__status__in=["online", "away"],
            user__last_seen_at__gte=cutoff,
        )
        .select_related("user")
        .order_by("user__username")
    )
    return [
        {
            "user_id": item.user_id,
            "username": item.user.username,
            "display_name": item.user.display_name,
            "status": item.user.status,
            "last_seen_at": item.user.last_seen_at,
        }
        for item in members
    ]
