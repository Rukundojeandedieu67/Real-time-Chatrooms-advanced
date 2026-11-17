import uuid

import factory

from apps.accounts.models import Profile
from apps.chat.models import Message
from apps.rooms.models import Room, RoomMember


class ProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Profile

    id = factory.LazyFunction(uuid.uuid4)
    username = factory.Sequence(lambda n: f"user{n:04d}")
    display_name = factory.Sequence(lambda n: f"User {n:04d}")
    bio = ""
    status = Profile.Status.OFFLINE


class RoomFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Room
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"room{n:04d}")
    description = "A shared room"
    is_private = False
    max_members = 100
    created_by = factory.SubFactory(ProfileFactory)

    @factory.post_generation
    def membership(obj, create, extracted, **kwargs):
        if not create:
            return
        RoomMember.objects.create(room=obj, user=obj.created_by, role=RoomMember.Role.OWNER)


class MessageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Message

    room = factory.SubFactory(RoomFactory)
    sender = factory.LazyAttribute(lambda obj: obj.room.created_by)
    body = factory.Sequence(lambda n: f"Message {n}")
    client_message_id = factory.LazyFunction(uuid.uuid4)
