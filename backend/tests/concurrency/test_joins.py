import threading

import pytest
from django.db import close_old_connections, connection
from rest_framework.test import APIClient

from apps.rooms.models import RoomMember
from tests.conftest import auth_user
from tests.factories import ProfileFactory, RoomFactory

pytestmark = pytest.mark.django_db(transaction=True)


def _join(profile_id, url, statuses):
    close_old_connections()
    try:
        from apps.accounts.models import Profile

        profile = Profile.objects.get(pk=profile_id)
        client = APIClient()
        client.force_authenticate(user=auth_user(profile), token="access-token")
        statuses.append(client.post(url).status_code)
    finally:
        close_old_connections()


def test_twenty_joins_fill_exactly_ten_slots():
    if connection.vendor != "postgresql":
        pytest.skip("concurrency coverage uses Postgres row locks")
    owner = ProfileFactory()
    room = RoomFactory(created_by=owner, max_members=10, name="capacity")
    joiners = [ProfileFactory() for _ in range(20)]
    barrier = threading.Barrier(20)
    statuses = []

    def worker(profile_id):
        barrier.wait(timeout=30)
        _join(profile_id, f"/api/v1/rooms/{room.id}/join", statuses)

    threads = [threading.Thread(target=worker, args=(profile.id,)) for profile in joiners]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    assert RoomMember.objects.filter(room=room).count() == 10
    assert statuses.count(201) == 9
    assert statuses.count(409) == 11


def test_two_joins_by_one_user_create_one_row():
    if connection.vendor != "postgresql":
        pytest.skip("concurrency coverage uses Postgres row locks")
    owner = ProfileFactory()
    room = RoomFactory(created_by=owner, max_members=10, name="singlejoin")
    joiner = ProfileFactory()
    barrier = threading.Barrier(2)
    statuses = []

    def worker():
        barrier.wait(timeout=30)
        _join(joiner.id, f"/api/v1/rooms/{room.id}/join", statuses)

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    assert RoomMember.objects.filter(room=room, user=joiner).count() == 1
    assert sorted(statuses) == [201, 409]
