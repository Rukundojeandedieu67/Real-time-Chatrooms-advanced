from rest_framework.response import Response

from apps.core.schema import documented
from apps.core.throttles import AnonRateThrottle, TypingThrottle, UserRateThrottle
from apps.core.views import BaseAPIView
from apps.realtime.serializers import HeartbeatSerializer, TypingSerializer
from apps.realtime.services import heartbeat, list_typing, room_presence, set_typing


class TypingView(BaseAPIView):
    def get_throttles(self):
        method = self.request.method if getattr(self, "request", None) is not None else "GET"
        if method == "POST":
            return [AnonRateThrottle(), UserRateThrottle(), TypingThrottle()]
        return [AnonRateThrottle(), UserRateThrottle()]

    @documented("realtime", "Set typing state for about 5 seconds", request=TypingSerializer, responses={204: None})
    def post(self, request, id):
        serializer = TypingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        set_typing(request.user.profile, id, is_typing=serializer.validated_data["is_typing"])
        return Response(status=204)

    @documented("realtime", "Who is typing right now", responses={200: None})
    def get(self, request, id):
        return Response({"results": list_typing(request.user.profile, id)})


class HeartbeatView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("realtime", "Update last_seen_at and status", request=HeartbeatSerializer, responses={200: None})
    def post(self, request):
        serializer = HeartbeatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = heartbeat(request.user.profile, serializer.validated_data["status"])
        return Response({"status": profile.status, "last_seen_at": profile.last_seen_at})


class PresenceView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("realtime", "Online and away members seen inside the presence window", responses={200: None})
    def get(self, request, id):
        return Response({"results": room_presence(request.user.profile, id)})
