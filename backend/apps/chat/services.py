import uuid
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.chat.constants import ALLOWED_REACTIONS
from apps.chat.models import Message, MessageAttachment, MessageReaction
from apps.core.exceptions import DomainError
from apps.core.images import prepare_image, read_limited
from apps.realtime.publishing import publish
from apps.rooms.access import require_room_member
from apps.rooms.models import Room
from services.supabase_auth import SupabaseError
from services.supabase_storage import create_signed_url, delete_object, upload_bytes


def list_messages(profile, room_id, *, before=None, limit=None, query=None):
    room, _member = require_room_member(room_id, profile, action="read")
    page_size = _page_size(limit)
    queryset = (
        Message.objects.filter(room=room)
        .select_related("sender", "reply_to")
        .prefetch_related(
            "attachments",
            "reactions",
        )
    )
    if query:
        if len(query) > 100:
            raise DomainError("validation_error", "q is too long", 400, {"q": ["Too long."]})
        queryset = queryset.filter(deleted_at__isnull=True, body__icontains=query)
    if before:
        anchor = Message.objects.filter(room=room, pk=before).first()
        if anchor is None:
            raise DomainError("invalid_cursor", "Unknown cursor", 400)
        queryset = queryset.filter(
            Q(created_at__lt=anchor.created_at) | Q(created_at=anchor.created_at, id__lt=anchor.id)
        )
    rows = list(queryset.order_by("-created_at", "-id")[: page_size + 1])
    has_more = len(rows) > page_size
    rows = rows[:page_size]
    next_before = rows[-1].id if has_more and rows else None
    return rows, next_before, has_more


def send_message(profile, room_id, *, body, client_message_id, reply_to=None, attachment_ids=None):
    room, _member = require_room_member(room_id, profile, action="send")
    body = (body or "").strip()
    if len(body) > 2000:
        raise DomainError(
            "validation_error",
            "Message body must be 2000 characters or fewer",
            400,
            {"body": ["Too long."]},
        )
    attachment_ids = list(dict.fromkeys(attachment_ids or []))
    if len(attachment_ids) > 4:
        raise DomainError(
            "validation_error",
            "A message can include at most 4 attachments",
            400,
            {"attachment_ids": ["Too many attachments."]},
        )
    reply = None
    if reply_to is not None:
        reply = Message.objects.filter(pk=reply_to, room=room).first()
        if reply is None:
            raise DomainError(
                "validation_error",
                "reply_to is not a message in this room",
                400,
                {"reply_to": ["Unknown message."]},
            )
    with transaction.atomic():
        existing = Message.objects.filter(
            room=room,
            sender=profile,
            client_message_id=client_message_id,
        ).first()
        if existing is not None:
            return _loaded(existing), False
        if not body and not attachment_ids:
            raise DomainError(
                "validation_error",
                "A message needs text or an attachment",
                400,
                {"body": ["This field is required."]},
            )
        try:
            with transaction.atomic():
                message = Message.objects.create(
                    room=room,
                    sender=profile,
                    body=body,
                    reply_to=reply,
                    client_message_id=client_message_id,
                )
                if attachment_ids:
                    _link_attachments(message, profile, room, attachment_ids)
                if not message.body and not message.attachments.exists():
                    raise DomainError(
                        "validation_error",
                        "A message needs text or an attachment",
                        400,
                        {"body": ["This field is required."]},
                    )
        except IntegrityError:
            message = Message.objects.get(
                room=room,
                sender=profile,
                client_message_id=client_message_id,
            )
            return _loaded(message), False
    publish(room.id, "message.created", message_event(message))
    return _loaded(message), True


def get_message(profile, message_id):
    return _message_for_member(profile, message_id, action="read")


def edit_message(profile, message_id, body):
    message = _message_for_member(profile, message_id, action="send")
    if message.deleted_at:
        raise DomainError("message_deleted", "Deleted messages cannot be edited", 409)
    if message.sender_id != profile.id:
        raise DomainError("permission_denied", "Only the author can edit this message", 403)
    window = timedelta(seconds=settings.MESSAGE_EDIT_WINDOW_SECONDS)
    if timezone.now() - message.created_at > window:
        raise DomainError("edit_window_closed", "Messages can only be edited for 15 minutes", 403)
    body = (body or "").strip()
    if not body or len(body) > 2000:
        raise DomainError(
            "validation_error",
            "Message body must be 1-2000 characters",
            400,
            {"body": ["Invalid body."]},
        )
    message.body = body
    message.edited_at = timezone.now()
    message.save(update_fields=["body", "edited_at", "updated_at"])
    message = _loaded(message)
    publish(message.room_id, "message.updated", message_event(message))
    return message


def delete_message(profile, message_id):
    message = _message_for_member(profile, message_id, action="send")
    member = require_room_member(message.room_id, profile, action="send")[1]
    is_author = message.sender_id == profile.id
    is_manager = member.role in {"owner", "admin"}
    if not is_author and not is_manager:
        raise DomainError("permission_denied", "You cannot delete this message", 403)
    if message.deleted_at:
        return _loaded(message)
    for attachment in message.attachments.all():
        if attachment.storage_path:
            delete_object(settings.SUPABASE_ATTACHMENT_BUCKET, attachment.storage_path)
            attachment.storage_path = ""
            attachment.save(update_fields=["storage_path", "updated_at"])
    message.body = ""
    message.deleted_at = timezone.now()
    message.save(update_fields=["body", "deleted_at", "updated_at"])
    message = _loaded(message)
    publish(message.room_id, "message.deleted", message_event(message))
    return message


def upload_attachment(profile, room_id, upload):
    room, _member = require_room_member(room_id, profile, action="send")
    prepared = prepare_image(
        read_limited(upload, settings.ATTACHMENT_MAX_BYTES),
        settings.ATTACHMENT_MAX_BYTES,
    )
    path = f"{room.id}/{profile.id}/{uuid.uuid4().hex}.{prepared.ext}"
    try:
        upload_bytes(
            settings.SUPABASE_ATTACHMENT_BUCKET,
            path,
            prepared.data,
            prepared.content_type,
        )
    except SupabaseError as exc:
        from apps.accounts.services import map_storage

        raise map_storage(exc) from exc
    return MessageAttachment.objects.create(
        room=room,
        uploaded_by=profile,
        storage_path=path,
        content_type=prepared.content_type,
        size_bytes=len(prepared.data),
        width=prepared.width,
        height=prepared.height,
    )


def add_reaction(profile, message_id, emoji):
    if emoji not in ALLOWED_REACTIONS:
        raise DomainError(
            "validation_error",
            "Unsupported reaction",
            400,
            {"emoji": ["Unsupported reaction."]},
        )
    message = _message_for_member(profile, message_id, action="send")
    if message.deleted_at:
        raise DomainError("message_deleted", "Deleted messages cannot be reacted to", 409)
    try:
        with transaction.atomic():
            _reaction, created = MessageReaction.objects.get_or_create(
                message=message,
                user=profile,
                emoji=emoji,
            )
    except IntegrityError:
        created = False
    count = MessageReaction.objects.filter(message=message, emoji=emoji).count()
    publish(
        message.room_id,
        "reaction.changed",
        _reaction_event(message, profile, emoji, count, "added"),
    )
    return {"emoji": emoji, "glyph": ALLOWED_REACTIONS[emoji], "count": count, "created": created}


def remove_reaction(profile, message_id, emoji):
    if emoji not in ALLOWED_REACTIONS:
        raise DomainError(
            "validation_error",
            "Unsupported reaction",
            400,
            {"emoji": ["Unsupported reaction."]},
        )
    message = _message_for_member(profile, message_id, action="send")
    deleted, _ignored = MessageReaction.objects.filter(
        message=message,
        user=profile,
        emoji=emoji,
    ).delete()
    if not deleted:
        raise DomainError("not_found", "Reaction not found", 404)
    count = MessageReaction.objects.filter(message=message, emoji=emoji).count()
    publish(
        message.room_id,
        "reaction.changed",
        _reaction_event(message, profile, emoji, count, "removed"),
    )


def mark_read(profile, room_id, message_id):
    _room, member = require_room_member(room_id, profile, action="read")
    try:
        message = Message.objects.get(pk=message_id, room_id=room_id)
    except Message.DoesNotExist as exc:
        raise DomainError(
            "validation_error",
            "Message is not in this room",
            400,
            {"last_read_message_id": ["Unknown message."]},
        ) from exc
    current = member.last_read_message
    if current is not None and message.created_at <= current.created_at:
        return member
    member.last_read_message = message
    member.save(update_fields=["last_read_message", "updated_at"])
    return member


def message_event(message):
    deleted = message.deleted_at is not None
    sender = message.sender
    return {
        "id": str(message.id),
        "room_id": str(message.room_id),
        "sender": {
            "id": str(sender.id),
            "username": sender.username,
            "display_name": sender.display_name,
        },
        "body": None if deleted else message.body,
        "deleted": deleted,
        "reply_to": str(message.reply_to_id) if message.reply_to_id else None,
        "client_message_id": str(message.client_message_id),
        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        "created_at": message.created_at.isoformat(),
        "attachments": []
        if deleted
        else [
            {"id": str(item.id), "content_type": item.content_type}
            for item in message.attachments.all()
        ],
    }


def attachment_payload(attachment):
    return {
        "id": attachment.id,
        "content_type": attachment.content_type,
        "size_bytes": attachment.size_bytes,
        "width": attachment.width,
        "height": attachment.height,
        "url": None
        if not attachment.storage_path
        else create_signed_url(settings.SUPABASE_ATTACHMENT_BUCKET, attachment.storage_path),
    }


def _link_attachments(message, profile, room, attachment_ids):
    attachments = list(
        MessageAttachment.objects.filter(
            id__in=attachment_ids,
            room=room,
            uploaded_by=profile,
            message__isnull=True,
        )
    )
    if len(attachments) != len(attachment_ids):
        raise DomainError(
            "validation_error",
            "One or more attachments are invalid",
            400,
            {"attachment_ids": ["Invalid attachment."]},
        )
    for attachment in attachments:
        attachment.message = message
        attachment.save(update_fields=["message", "updated_at"])


def _message_for_member(profile, message_id, *, action):
    try:
        message = Message.objects.select_related("sender").get(pk=message_id)
    except Message.DoesNotExist as exc:
        raise DomainError("not_found", "Not found", 404) from exc
    try:
        room = Room.objects.get(pk=message.room_id)
    except Room.DoesNotExist as exc:
        raise DomainError("not_found", "Not found", 404) from exc
    require_room_member(room.id, profile, action=action)
    return message


def _loaded(message):
    return (
        Message.objects.select_related("sender")
        .prefetch_related("attachments", "reactions")
        .get(pk=message.pk)
    )


def _page_size(limit):
    if limit in (None, ""):
        return settings.MESSAGE_PAGE_SIZE_DEFAULT
    try:
        value = int(limit)
    except (TypeError, ValueError) as exc:
        raise DomainError("validation_error", "limit must be an integer", 400) from exc
    if value < 1:
        raise DomainError("validation_error", "limit must be at least 1", 400)
    return min(value, settings.MESSAGE_PAGE_SIZE_MAX)


def _reaction_event(message, profile, emoji, count, action):
    return {
        "message_id": str(message.id),
        "emoji": emoji,
        "glyph": ALLOWED_REACTIONS[emoji],
        "count": count,
        "user_id": str(profile.id),
        "action": action,
    }
