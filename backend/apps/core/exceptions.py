import logging

from rest_framework.exceptions import (
    AuthenticationFailed,
    MethodNotAllowed,
    NotAuthenticated,
    NotFound,
    ParseError,
    PermissionDenied,
    Throttled,
    UnsupportedMediaType,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class DomainError(Exception):
    """A business-rule failure with a stable client-facing code."""

    def __init__(self, code, message, status=400, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}


def _envelope(code, message, details):
    if not isinstance(details, dict):
        details = {"non_field_errors": details}
    return {"error": {"code": code, "message": message, "details": details}}


def _map_exception(exc, response):
    if isinstance(exc, Throttled):
        return "rate_limited", "Too many requests", {}
    if isinstance(exc, NotAuthenticated):
        return "not_authenticated", "Authentication credentials were not provided", {}
    if isinstance(exc, AuthenticationFailed):
        return "invalid_token", "Invalid or expired token", {}
    if isinstance(exc, PermissionDenied):
        detail = exc.detail
        message = str(detail) if detail else "You do not have permission to do that"
        return "permission_denied", message, {}
    if isinstance(exc, NotFound):
        return "not_found", "Not found", {}
    if isinstance(exc, MethodNotAllowed):
        return "method_not_allowed", "Method not allowed", {}
    if isinstance(exc, ParseError):
        return "invalid_json", "Malformed request body", {}
    if isinstance(exc, UnsupportedMediaType):
        return "unsupported_media_type", "Unsupported media type", {}
    if isinstance(exc, ValidationError):
        details = response.data
        return "validation_error", "Fix the highlighted fields", details
    if response.status_code == 413:
        return "file_too_large", "Upload exceeds the size limit", {}
    if response.status_code >= 500:
        return "server_error", "Something went wrong", {}
    data = response.data
    if isinstance(data, dict) and set(data) == {"detail"}:
        return "error", str(data["detail"]), {}
    if isinstance(data, dict):
        return "error", "Request could not be processed", data
    return "error", "Request could not be processed", {}


def api_exception_handler(exc, context):
    if isinstance(exc, DomainError):
        return Response(_envelope(exc.code, exc.message, exc.details), status=exc.status)

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("unhandled api exception")
        return Response(
            _envelope("server_error", "Something went wrong", {}),
            status=500,
        )

    code, message, details = _map_exception(exc, response)
    response.data = _envelope(code, message, details)
    if isinstance(exc, Throttled):
        wait = int(exc.wait or 1)
        response["Retry-After"] = str(max(wait, 1))
    return response
