"""Publish a broadcast on a private Realtime channel."""

import logging

import requests
from django.conf import settings

from services.http import service_headers

logger = logging.getLogger(__name__)


def broadcast(topic, event, payload):
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.info("realtime broadcast skipped; supabase is not configured")
        return
    response = requests.post(
        f"{settings.SUPABASE_URL}/realtime/v1/api/broadcast",
        headers=service_headers(),
        json={
            "messages": [
                {
                    "topic": topic,
                    "event": event,
                    "payload": payload,
                    "private": True,
                }
            ]
        },
        timeout=settings.SUPABASE_HTTP_TIMEOUT,
    )
    if response.status_code >= 400:
        logger.warning("realtime broadcast status=%s", response.status_code)
        raise RuntimeError("realtime broadcast failed")
