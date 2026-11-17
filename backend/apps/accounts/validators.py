import re

from apps.core.exceptions import DomainError

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,30}$")


def validate_password(password):
    if (
        not isinstance(password, str)
        or len(password) < 10
        or len(password) > 128
        or not re.search(r"[A-Za-z]", password)
        or not re.search(r"\d", password)
    ):
        raise DomainError(
            "weak_password",
            "Password must be at least 10 characters and include a letter and a number",
            400,
        )


def validate_username(username):
    if not USERNAME_RE.fullmatch(username or ""):
        raise DomainError(
            "validation_error",
            "Username must be 3-30 characters: lowercase letters, digits and underscore",
            400,
            {"username": ["Invalid username."]},
        )


def validate_display_name(value):
    cleaned = (value or "").strip()
    if not cleaned or len(cleaned) > 60 or "\n" in cleaned or "\r" in cleaned:
        raise DomainError(
            "validation_error",
            "Display name must be 1-60 characters",
            400,
            {"display_name": ["Invalid display name."]},
        )
    return cleaned


def validate_bio(value):
    if value is None:
        value = ""
    if len(value) > 160:
        raise DomainError(
            "validation_error",
            "Bio must be 160 characters or fewer",
            400,
            {"bio": ["Bio is too long."]},
        )
    return value


def validate_status(value):
    if value not in {"online", "away", "offline"}:
        raise DomainError(
            "validation_error",
            "Status must be online, away or offline",
            400,
            {"status": ["Invalid status."]},
        )
    return value
