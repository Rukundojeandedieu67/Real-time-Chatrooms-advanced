from django.contrib import admin

from apps.realtime.models import TypingState


@admin.register(TypingState)
class TypingStateAdmin(admin.ModelAdmin):
    list_display = ("room", "user", "expires_at")
