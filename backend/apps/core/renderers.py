from rest_framework.renderers import JSONRenderer


class UTF8JSONRenderer(JSONRenderer):
    """Keep emoji and other non-ASCII characters readable in responses."""

    ensure_ascii = False
