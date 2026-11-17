from django.db import models

from apps.accounts.models import Profile
from apps.chat.constants import ALLOWED_REACTIONS
from apps.core.models import UUIDModel
from apps.rooms.models import Room


class Message(UUIDModel):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="messages_sent")
    body = models.TextField(blank=True, default="")
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    client_message_id = models.UUIDField()
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        constraints = [
            models.UniqueConstraint(
                fields=["room", "sender", "client_message_id"],
                name="unique_client_message",
            ),
        ]
        indexes = [
            models.Index(fields=["room", "-created_at"], name="message_room_created_idx"),
        ]


class MessageAttachment(UUIDModel):
    message = models.ForeignKey(
        Message,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(
        Profile,
        on_delete=models.PROTECT,
        related_name="attachments_uploaded",
    )
    storage_path = models.CharField(max_length=300, blank=True, default="")
    content_type = models.CharField(max_length=64)
    size_bytes = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    class Meta:
        db_table = "message_attachments"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(content_type__in=["image/jpeg", "image/png", "image/webp"]),
                name="attachment_content_type_valid",
            ),
            models.CheckConstraint(condition=models.Q(size_bytes__gte=1), name="attachment_size_positive"),
        ]


class MessageReaction(UUIDModel):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="reactions")
    emoji = models.CharField(max_length=16)

    class Meta:
        db_table = "message_reactions"
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user", "emoji"],
                name="unique_message_reaction",
            ),
            models.CheckConstraint(
                condition=models.Q(emoji__in=list(ALLOWED_REACTIONS)),
                name="reaction_emoji_allowed",
            ),
        ]
