from django.contrib import admin

from apps.chat.models import Message, MessageAttachment, MessageReaction


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "sender", "created_at", "deleted_at")


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "content_type", "size_bytes")


@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ("message", "user", "emoji")
