from django.conf import settings
from rest_framework import serializers

from apps.accounts.models import Profile
from apps.core.serializers import StrictSerializer
from services.supabase_storage import create_signed_url


class ProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "display_name",
            "bio",
            "status",
            "avatar_url",
            "last_seen_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_avatar_url(self, obj):
        if not obj.avatar_path:
            return None
        return create_signed_url(settings.SUPABASE_AVATAR_BUCKET, obj.avatar_path)


class RegisterSerializer(StrictSerializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)
    username = serializers.RegexField(r"^[a-z0-9_]{3,30}$", max_length=30)
    display_name = serializers.CharField(min_length=1, max_length=60)


class LoginSerializer(StrictSerializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)


class RefreshSerializer(StrictSerializer):
    refresh_token = serializers.CharField(max_length=4096)


class ForgotSerializer(StrictSerializer):
    email = serializers.EmailField(max_length=254)


class ResetSerializer(StrictSerializer):
    token = serializers.CharField(max_length=4096)
    new_password = serializers.CharField(max_length=128, trim_whitespace=False)


class ChangePasswordSerializer(StrictSerializer):
    current_password = serializers.CharField(max_length=128, trim_whitespace=False)
    new_password = serializers.CharField(max_length=128, trim_whitespace=False)


class ResendSerializer(StrictSerializer):
    email = serializers.EmailField(max_length=254)


class ProfileReplaceSerializer(StrictSerializer):
    username = serializers.RegexField(r"^[a-z0-9_]{3,30}$", max_length=30)
    display_name = serializers.CharField(min_length=1, max_length=60)
    bio = serializers.CharField(allow_blank=True, max_length=160)
    status = serializers.ChoiceField(choices=["online", "away", "offline"])


class ProfilePatchSerializer(StrictSerializer):
    display_name = serializers.CharField(min_length=1, max_length=60, required=False)
    bio = serializers.CharField(allow_blank=True, max_length=160, required=False)
    status = serializers.ChoiceField(choices=["online", "away", "offline"], required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs
