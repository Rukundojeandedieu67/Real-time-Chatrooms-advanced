import logging
import uuid
from contextvars import ContextVar

from django.core.exceptions import PermissionDenied, RequestDataTooBig, SuspiciousOperation
from django.http import Http404, JsonResponse

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
logger = logging.getLogger(__name__)


def _json_error(status, code, message):
    return JsonResponse(
        {"error": {"code": code, "message": message, "details": {}}},
        status=status,
    )


def _safe_request_id(value):
    if not value or len(value) > 64:
        return ""
    if all(char.isalnum() or char in "-_" for char in value):
        return value
    return ""


class RequestIdMiddleware:
    """Attach a request id to the request, the logs, and the response."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = _safe_request_id(request.headers.get("X-Request-ID", "")) or uuid.uuid4().hex
        request.request_id = request_id
        token = request_id_var.set(request_id)
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = request_id
        logger.info("%s %s %s", request.method, request.path, getattr(response, "status_code", "-"))
        return response


class ApiErrorMiddleware:
    """Last-resort JSON errors so clients never receive an HTML traceback."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except RequestDataTooBig:
            return _json_error(413, "file_too_large", "Upload exceeds the size limit")
        except Http404:
            return _json_error(404, "not_found", "Not found")
        except PermissionDenied:
            return _json_error(403, "permission_denied", "You do not have permission to do that")
        except SuspiciousOperation:
            return _json_error(400, "bad_request", "Bad request")
        except Exception:
            if request.path.startswith("/admin/"):
                raise
            logger.exception("unhandled request error")
            return _json_error(500, "server_error", "Something went wrong")
