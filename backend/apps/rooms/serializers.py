from rest_framework import serializers

from apps.core.serializers import StrictSerializer


class RoomWriteSerializer(StrictSerializer):
    name = serializers.CharField(min_length=3, max_length=60)
    description = serializers.CharField(allow_blank=True, max_length=300, required=False, default="")
    is_private = serializers.BooleanField(required=False, default=False)
    max_members = serializers.IntegerField(required=False, min_value=1, max_value=10000, default=100)


class RoomReplaceSerializer(StrictSerializer):
    name = serializers.CharField(min_length=3, max_length=60)
    description = serializers.CharField(allow_blank=True, max_length=300)
    is_private = serializers.BooleanField()
    max_members = serializers.IntegerField(min_value=1, max_value=10000)


class RoomPatchSerializer(StrictSerializer):
    name = serializers.CharField(min_length=3, max_length=60, required=False)
    description = serializers.CharField(allow_blank=True, max_length=300, required=False)
    is_private = serializers.BooleanField(required=False)
    max_members = serializers.IntegerField(required=False, min_value=1, max_value=10000)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs


class RoleSerializer(StrictSerializer):
    role = serializers.ChoiceField(choices=["owner", "admin", "member"])


class InviteSerializer(StrictSerializer):
    max_uses = serializers.IntegerField(required=False, min_value=1, max_value=100, default=10)
    expires_in_hours = serializers.IntegerField(required=False, min_value=1, max_value=720, default=168)
