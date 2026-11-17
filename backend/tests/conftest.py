import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.authentication import AuthUser
from tests.factories import ProfileFactory


def auth_user(profile, role="member", email="user@example.com"):
    return AuthUser(
        profile,
        {
            "sub": str(profile.id),
            "email": email,
            "aud": "authenticated",
            "app_metadata": {"role": role},
        },
    )


@pytest.fixture(autouse=True)
def _throttle_defaults(settings, request):
    cache.clear()
    settings.THROTTLES_ENABLED = request.node.get_closest_marker("throttle") is not None


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def profile(db):
    return ProfileFactory()


@pytest.fixture
def client(profile):
    api = APIClient()
    api.force_authenticate(user=auth_user(profile), token="access-token")
    api.profile = profile
    return api
