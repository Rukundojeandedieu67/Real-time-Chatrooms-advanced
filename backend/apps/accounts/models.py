from django.db import models

from apps.core.models import AliveManager, UUIDModel


class Profile(UUIDModel):
    class Status(models.TextChoices):
        ONLINE = "online", "Online"
        AWAY = "away", "Away"
        OFFLINE = "offline", "Offline"

    username = models.CharField(max_length=30, unique=True)
    display_name = models.CharField(max_length=60)
    bio = models.CharField(max_length=160, blank=True, default="")
    avatar_path = models.CharField(max_length=300, blank=True, default="")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OFFLINE)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    all_objects = models.Manager()
    objects = AliveManager()

    class Meta:
        db_table = "profiles"
        default_manager_name = "objects"
        base_manager_name = "all_objects"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(username__regex=r"^[a-z0-9_]{3,30}$"),
                name="profile_username_format",
            ),
            models.CheckConstraint(
                condition=models.Q(display_name__regex=r"^.{1,60}$"),
                name="profile_display_name_length",
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=["online", "away", "offline"]),
                name="profile_status_valid",
            ),
        ]

    def __str__(self):
        return self.username
