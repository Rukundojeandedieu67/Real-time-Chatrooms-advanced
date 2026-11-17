import pytest
from django.core.management import call_command

from apps.chat.models import Message

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_at_least_ten_messages():
    call_command("seed_demo")
    assert Message.objects.count() >= 10
    call_command("seed_demo")
    assert Message.objects.count() >= 10
