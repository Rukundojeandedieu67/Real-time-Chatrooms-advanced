import io
import re

import pytest
import responses
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from tests.factories import ProfileFactory

pytestmark = pytest.mark.django_db


def _png(color="red"):
    image = Image.new("RGB", (4, 3), color)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _mock_storage():
    responses.add(
        responses.POST,
        re.compile(r"http://supabase.test/storage/v1/object/avatars/.+"),
        json={"Key": "avatars/x"},
        status=200,
    )
    responses.add(
        responses.POST,
        re.compile(r"http://supabase.test/storage/v1/object/sign/.+"),
        json={"signedURL": "/object/sign/avatars/x?token=t"},
        status=200,
    )
    responses.add(
        responses.DELETE,
        re.compile(r"http://supabase.test/storage/v1/object/avatars/.+"),
        status=200,
    )


def test_profile_get_put_patch_and_public_search(client, profile, api):
    fetched = client.get("/api/v1/users/me")
    assert fetched.status_code == 200
    assert fetched.json()["username"] == profile.username
    assert "email" not in fetched.json()

    replaced = client.put(
        "/api/v1/users/me",
        {
            "username": "renamed_user",
            "display_name": "Renamed",
            "bio": "Hello",
            "status": "away",
        },
        format="json",
    )
    assert replaced.status_code == 200
    assert replaced.json()["username"] == "renamed_user"
    assert replaced.json()["status"] == "away"

    patched = client.patch("/api/v1/users/me", {"bio": "Shorter"}, format="json")
    assert patched.status_code == 200
    assert patched.json()["bio"] == "Shorter"
    assert patched.json()["display_name"] == "Renamed"

    other = ProfileFactory(username="finder", display_name="Find Me")
    public = client.get(f"/api/v1/users/{other.id}")
    assert public.status_code == 200
    assert "email" not in public.json()

    search = client.get("/api/v1/users?search=find")
    assert search.status_code == 200
    assert search.json()["results"][0]["username"] == "finder"
    missing = client.get("/api/v1/users")
    assert missing.status_code == 400


@responses.activate
def test_avatar_upload_and_guards(client, settings):
    _mock_storage()
    good = client.put(
        "/api/v1/users/me/avatar",
        {"file": SimpleUploadedFile("note.txt", _png(), content_type="text/plain")},
        format="multipart",
    )
    assert good.status_code == 200
    assert good.json()["avatar_url"].endswith("token=t")
    assert "note.txt" not in good.json()["avatar_url"]

    fake = client.put(
        "/api/v1/users/me/avatar",
        {"file": SimpleUploadedFile("photo.png", b"not-an-image", content_type="image/png")},
        format="multipart",
    )
    assert fake.status_code == 415
    assert fake.json()["error"]["code"] == "unsupported_media_type"

    gif = client.put(
        "/api/v1/users/me/avatar",
        {"file": SimpleUploadedFile("anim.gif", b"GIF89a" + b"\x00" * 20, content_type="image/gif")},
        format="multipart",
    )
    assert gif.status_code == 415

    settings.AVATAR_MAX_BYTES = 30
    large = client.put(
        "/api/v1/users/me/avatar",
        {"file": SimpleUploadedFile("big.png", _png(), content_type="image/png")},
        format="multipart",
    )
    assert large.status_code == 413
    assert large.json()["error"]["code"] == "file_too_large"

    removed = client.delete("/api/v1/users/me/avatar")
    assert removed.status_code == 204
    assert client.get("/api/v1/users/me").json()["avatar_url"] is None
