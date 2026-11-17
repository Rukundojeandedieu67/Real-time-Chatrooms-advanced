from rest_framework import serializers

from apps.core.serializers import StrictSerializer


class TypingSerializer(StrictSerializer):
    is_typing = serializers.BooleanField()


class HeartbeatSerializer(StrictSerializer):
    status = serializers.ChoiceField(choices=["online", "away", "offline"])
