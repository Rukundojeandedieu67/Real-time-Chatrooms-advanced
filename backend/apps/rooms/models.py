from django.db import models
from django.db.models.functions import Lower

from apps.accounts.models import Profile
from apps.core.models import AliveManager, UUIDModel


class Room(UUIDModel):
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=300, blank=True, default="")
    is_private = models.BooleanField(default=False)
    avatar_path = models.CharField(max_length=300, blank=True, default="")
    max_members = models.PositiveIntegerField(default=100)
    created_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="rooms_created")
    deleted_at = models.DateTimeField(null=True, blank=True)

    all_objects = models.Manager()
    objects = AliveManager()

    class Meta:
        db_table = "rooms"
        default_manager_name = "objects"
        base_manager_name = "all_objects"
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                condition=models.Q(is_private=False, deleted_at__isnull=True),
                name="unique_active_public_room_name",
            ),
            models.CheckConstraint(
                condition=models.Q(name__regex=r"^.{3,60}$"),
                name="room_name_length",
            ),
            models.CheckConstraint(
                condition=models.Q(max_members__gte=1, max_members__lte=10000),
                name="room_max_members_range",
            ),
        ]

    def __str__(self):
        return self.name


class RoomMember(UUIDModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="room_memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_message = models.ForeignKey(
        "chat.Message",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    muted = models.BooleanField(default=False)

    class Meta:
        db_table = "room_members"
        constraints = [
            models.UniqueConstraint(fields=["room", "user"], name="unique_room_member"),
            models.CheckConstraint(
                condition=models.Q(role__in=["owner", "admin", "member"]),
                name="room_member_role_valid",
            ),
        ]

    def __str__(self):
        return f"{self.user_id} in {self.room_id} ({self.role})"


class RoomInvite(UUIDModel):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="invites")
    code = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey(
        Profile, on_delete=models.PROTECT, related_name="invites_created"
    )
    expires_at = models.DateTimeField()
    max_uses = models.PositiveIntegerField()
    uses = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "room_invites"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(max_uses__gte=1, max_uses__lte=100),
                name="invite_max_uses_range",
            ),
            models.CheckConstraint(
                condition=models.Q(uses__gte=0), name="invite_uses_non_negative"
            ),
        ]
