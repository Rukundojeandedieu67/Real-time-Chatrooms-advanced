from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from rest_framework.throttling import SimpleRateThrottle


class ScopedRateThrottle(SimpleRateThrottle):
    """Read limits from settings on every request so tests and deploys can change them."""

    def allow_request(self, request, view):
        if not getattr(settings, "THROTTLES_ENABLED", True):
            return True
        return super().allow_request(request, view)

    def get_rate(self):
        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        try:
            return rates[self.scope]
        except KeyError as exc:
            raise ImproperlyConfigured(f"Missing throttle rate '{self.scope}'") from exc

    def _email(self, request):
        data = getattr(request, "data", None)
        if hasattr(data, "get"):
            return str(data.get("email") or "").strip().lower()
        return ""


class AnonRateThrottle(ScopedRateThrottle):
    scope = "anon"

    def get_cache_key(self, request, view):
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            return None
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class UserRateThrottle(ScopedRateThrottle):
    scope = "user"

    def get_cache_key(self, request, view):
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return None
        return self.cache_format % {"scope": self.scope, "ident": user.pk}


class LoginRateThrottle(ScopedRateThrottle):
    scope = "auth_login"

    def get_cache_key(self, request, view):
        ident = f"{self.get_ident(request)}:{self._email(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class RegisterRateThrottle(ScopedRateThrottle):
    scope = "auth_register"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class PasswordRateThrottle(ScopedRateThrottle):
    scope = "auth_password"

    def get_cache_key(self, request, view):
        ident = f"{self.get_ident(request)}:{self._email(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class MessageSendThrottle(UserRateThrottle):
    scope = "message_send"


class TypingThrottle(UserRateThrottle):
    scope = "typing"


class UploadThrottle(UserRateThrottle):
    scope = "upload"
