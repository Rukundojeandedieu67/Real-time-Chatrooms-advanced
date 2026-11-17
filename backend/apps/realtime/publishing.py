import logging

from django.db import transaction
from django.utils import timezone

from services.supabase_realtime import broadcast as send_broadcast

logger = logging.getLogger(__name__)


def publish(room_id, event, data):
    """Schedule a broadcast that runs only after the current transaction commits.

    A failed broadcast is logged and never fails the API request.
    """
    payload = {
        "event": event,
        "data": data,
        "sent_at": timezone.now().isoformat(),
    }
    topic = f"room:{room_id}"

    def _send():
        try:
            send_broadcast(topic, event, payload)
        except Exception:
            logger.exception("realtime broadcast failed")

    transaction.on_commit(_send)
