from rest_framework import serializers


class StrictSerializer(serializers.Serializer):
    """Reject fields the client invented instead of silently dropping them."""

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown = sorted(set(data.keys()) - set(self.fields))
            if unknown:
                raise serializers.ValidationError({field: ["Unknown field."] for field in unknown})
        return super().to_internal_value(data)
