import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Profile
from apps.chat.models import Message, MessageReaction
from apps.rooms.models import Room, RoomInvite, RoomMember

ADA = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1")
GRACE = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2")
LINUS = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3")
ROOM_GENERAL = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1")
ROOM_PRIVATE = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2")


class Command(BaseCommand):
    help = "Create demo profiles, rooms, memberships and at least 10 messages."

    def handle(self, *args, **options):
        with transaction.atomic():
            ada = self._profile(ADA, "ada", "Ada Lovelace", "Analytical engines and long notes.")
            grace = self._profile(GRACE, "grace", "Grace Hopper", "Compilers and clear errors.")
            linus = self._profile(LINUS, "linus", "Linus Torvalds", "Just for fun.")
            general = self._room(ROOM_GENERAL, "general", "Public demo room", False, ada)
            private = self._room(ROOM_PRIVATE, "maintainers", "Private demo room", True, grace)
            self._member(general, ada, RoomMember.Role.OWNER)
            self._member(general, grace, RoomMember.Role.ADMIN)
            self._member(general, linus, RoomMember.Role.MEMBER)
            self._member(private, grace, RoomMember.Role.OWNER)
            self._member(private, ada, RoomMember.Role.MEMBER)
            messages = [
                (general, ada, "Welcome to the demo room."),
                (general, grace, "The compiler is happier when the errors are honest."),
                (general, linus, "Small patches, please."),
                (general, ada, "Pagination is cursor based, newest first."),
                (general, grace, "Retries should reuse client_message_id."),
                (general, linus, "I read the last three."),
                (general, ada, "Reactions are a fixed list of shortcodes."),
                (general, grace, "Private rooms answer 404 to non-members."),
                (general, linus, "Ownership moves to the oldest admin."),
                (private, grace, "This room does not show up in public search."),
                (private, ada, "Invite codes are the way in."),
                (general, ada, "That is enough history for a walkthrough."),
            ]
            created_messages = []
            for index, (room, sender, body) in enumerate(messages, start=1):
                message, _created = Message.objects.get_or_create(
                    room=room,
                    sender=sender,
                    client_message_id=uuid.UUID(int=index),
                    defaults={"body": body},
                )
                created_messages.append(message)
            MessageReaction.objects.get_or_create(
                message=created_messages[0],
                user=grace,
                emoji="like",
            )
            RoomInvite.objects.get_or_create(
                code="demo-invite-code",
                defaults={
                    "room": private,
                    "created_by": grace,
                    "expires_at": timezone.now() + timedelta(days=7),
                    "max_uses": 10,
                    "uses": 0,
                },
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {Profile.all_objects.count()} profiles, "
                f"{Room.all_objects.count()} rooms, "
                f"{Message.objects.count()} messages."
            )
        )

    def _profile(self, profile_id, username, display_name, bio):
        profile, _created = Profile.all_objects.get_or_create(
            id=profile_id,
            defaults={
                "username": username,
                "display_name": display_name,
                "bio": bio,
                "status": Profile.Status.ONLINE,
            },
        )
        return profile

    def _room(self, room_id, name, description, is_private, owner):
        room, _created = Room.all_objects.get_or_create(
            id=room_id,
            defaults={
                "name": name,
                "description": description,
                "is_private": is_private,
                "max_members": 100,
                "created_by": owner,
            },
        )
        return room

    def _member(self, room, user, role):
        member, _created = RoomMember.objects.get_or_create(
            room=room,
            user=user,
            defaults={"role": role},
        )
        return member
