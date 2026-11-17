from django.db import models

from apps.accounts.models import Profile
from apps.core.models import UUIDModel
from apps.rooms.models import Room


class TypingState(UUIDModel):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="typing_states")
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="typing_states")
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "typing_state"
        constraints = [
            models.UniqueConstraint(fields=["room", "user"], name="unique_typing_state"),
        ]
        indexes = [
            models.Index(fields=["expires_at"], name="typing_expires_idx"),
        ]
