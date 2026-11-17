import logging

from apps.core.middleware import request_id_var


class RequestIdFilter(logging.Filter):
    """Add the current request id to every log record. Never reads the body."""

    def filter(self, record):
        record.request_id = request_id_var.get() or "-"
        return True
