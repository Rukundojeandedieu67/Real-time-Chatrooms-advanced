from rest_framework.response import Response

from apps.analytics.services import messages_per_room, room_stats
from apps.core.pagination import StandardPagination
from apps.core.schema import documented
from apps.core.throttles import UserRateThrottle
from apps.core.views import BaseAPIView


class MessagesPerRoomView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented(
        "analytics",
        "Message counts for rooms you belong to. Global admins see every room.",
        responses={200: None},
    )
    def get(self, request):
        queryset = messages_per_room(request.user)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = [
            {"room_id": room.id, "room_name": room.name, "message_count": room.message_count}
            for room in page
        ]
        return paginator.get_paginated_response(data)


class RoomStatsView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("analytics", "Member count, message count, busiest hour and top senders", responses={200: None})
    def get(self, request, id):
        return Response(room_stats(request.user.profile, id))
