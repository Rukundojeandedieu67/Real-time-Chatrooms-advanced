from django.db.models import Count, Q
from django.db.models.functions import ExtractHour

from apps.chat.models import Message
from apps.rooms.access import require_room_member
from apps.rooms.models import Room, RoomMember


def messages_per_room(user):
    if user.global_role == "admin":
        rooms = Room.objects.all()
    else:
        room_ids = RoomMember.objects.filter(user=user.profile).values("room_id")
        rooms = Room.objects.filter(id__in=room_ids)
    return (
        rooms.annotate(
            message_count=Count(
                "messages",
                filter=Q(messages__deleted_at__isnull=True),
            )
        )
        .order_by("name")
    )


def room_stats(profile, room_id):
    room, _member = require_room_member(room_id, profile, action="read")
    messages = Message.objects.filter(room=room, deleted_at__isnull=True)
    hours = (
        messages.annotate(hour=ExtractHour("created_at"))
        .values("hour")
        .annotate(total=Count("id"))
        .order_by("-total", "hour")
    )
    busiest = hours[0]["hour"] if hours else None
    top_senders = [
        {
            "user_id": row["sender_id"],
            "username": row["sender__username"],
            "message_count": row["message_count"],
        }
        for row in messages.values("sender_id", "sender__username")
        .annotate(message_count=Count("id"))
        .order_by("-message_count", "sender__username")[:5]
    ]
    return {
        "room_id": room.id,
        "member_count": room.memberships.count(),
        "message_count": messages.count(),
        "busiest_hour": busiest,
        "top_senders": top_senders,
    }
