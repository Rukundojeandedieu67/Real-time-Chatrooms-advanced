from django.conf import settings
from rest_framework import serializers

from apps.chat.constants import ALLOWED_REACTIONS
from apps.chat.services import attachment_payload
from apps.core.serializers import StrictSerializer
from services.supabase_storage import create_signed_url


class SendMessageSerializer(StrictSerializer):
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    reply_to = serializers.UUIDField(required=False, allow_null=True)
    client_message_id = serializers.UUIDField()
    attachment_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        max_length=4,
    )


class EditMessageSerializer(StrictSerializer):
    body = serializers.CharField(allow_blank=False, max_length=2000)


class ReadSerializer(StrictSerializer):
    last_read_message_id = serializers.UUIDField()


def serialize_message(message, viewer_id):
    deleted = message.deleted_at is not None
    reactions = {}
    for reaction in message.reactions.all():
        bucket = reactions.setdefault(
            reaction.emoji,
            {
                "emoji": reaction.emoji,
                "glyph": ALLOWED_REACTIONS.get(reaction.emoji, ""),
                "count": 0,
                "reacted_by_me": False,
            },
        )
        bucket["count"] += 1
        if viewer_id and reaction.user_id == viewer_id:
            bucket["reacted_by_me"] = True
    sender = message.sender
    avatar_url = None
    if sender.avatar_path:
        avatar_url = create_signed_url(settings.SUPABASE_AVATAR_BUCKET, sender.avatar_path)
    return {
        "id": str(message.id),
        "room_id": str(message.room_id),
        "sender": {
            "id": str(sender.id),
            "username": sender.username,
            "display_name": sender.display_name,
            "avatar_url": avatar_url,
        },
        "body": None if deleted else message.body,
        "deleted": deleted,
        "reply_to": str(message.reply_to_id) if message.reply_to_id else None,
        "client_message_id": str(message.client_message_id),
        "attachments": []
        if deleted
        else [attachment_payload(item) for item in message.attachments.all()],
        "reactions": list(reactions.values()),
        "edited_at": message.edited_at,
        "created_at": message.created_at,
        "updated_at": message.updated_at,
    }
