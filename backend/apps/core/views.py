import logging

from django.db import connection
from django.http import JsonResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttles import AnonRateThrottle

logger = logging.getLogger(__name__)


class BaseAPIView(APIView):
    """Throttle before permission checks so anonymous floods cannot skip the limit.

    Anonymous limiting is always applied, including on views that add a stricter scope.
    Health probes opt out with get_throttles.

    A bad token is remembered and raised after throttling, which keeps credential
    stuffing on the same limiter as missing credentials.
    """

    def initial(self, request, *args, **kwargs):
        self.format_kwarg = self.get_format_suffix(**kwargs)
        neg = self.perform_content_negotiation(request)
        request.accepted_renderer, request.accepted_media_type = neg
        version, scheme = self.determine_version(request, *args, **kwargs)
        request.version, request.versioning_scheme = version, scheme
        self.perform_authentication(request)
        self.check_throttles(request)
        self.check_permissions(request)

    def get_throttles(self):
        throttles = []
        seen = set()
        for cls in (AnonRateThrottle, *self.throttle_classes):
            if cls in seen:
                continue
            seen.add(cls)
            throttles.append(cls())
        return throttles

    def perform_authentication(self, request):
        try:
            super().perform_authentication(request)
        except Exception as exc:
            from rest_framework.exceptions import AuthenticationFailed

            if isinstance(exc, AuthenticationFailed):
                request.auth_error = exc
                return
            raise

    def check_permissions(self, request):
        auth_error = getattr(request, "auth_error", None)
        if auth_error is not None:
            raise auth_error
        super().check_permissions(request)


class HealthView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def get_throttles(self):
        return []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            logger.exception("database health check failed")
            return Response(
                {
                    "error": {
                        "code": "unavailable",
                        "message": "Database check failed",
                        "details": {},
                    }
                },
                status=503,
            )
        return Response({"status": "ok", "database": "ok"})


def error_404(request, exception):
    return JsonResponse(
        {"error": {"code": "not_found", "message": "Not found", "details": {}}},
        status=404,
    )


def error_500(request):
    return JsonResponse(
        {"error": {"code": "server_error", "message": "Something went wrong", "details": {}}},
        status=500,
    )
