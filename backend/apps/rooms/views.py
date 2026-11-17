from rest_framework.response import Response

from apps.accounts.serializers import ProfileSerializer
from apps.accounts.views import _uploaded_file
from apps.core.pagination import StandardPagination
from apps.core.schema import documented
from apps.core.throttles import UploadThrottle, UserRateThrottle
from apps.core.views import BaseAPIView
from apps.rooms.access import get_room_for_viewer
from apps.rooms.serializers import (
    InviteSerializer,
    RoleSerializer,
    RoomPatchSerializer,
    RoomReplaceSerializer,
    RoomWriteSerializer,
)
from apps.rooms.services import (
    accept_invite,
    change_role,
    create_invite,
    create_room,
    delete_room,
    join_public,
    leave_room,
    list_members,
    list_rooms,
    remove_member,
    room_card,
    room_detail,
    save_room_avatar,
    update_room,
)


def _member_body(member):
    return {
        "user": ProfileSerializer(member.user).data,
        "role": member.role,
        "joined_at": member.joined_at,
        "muted": member.muted,
    }


def _invite_body(invite):
    return {
        "code": invite.code,
        "room_id": invite.room_id,
        "expires_at": invite.expires_at,
        "max_uses": invite.max_uses,
        "uses": invite.uses,
        "accept_path": f"/api/v1/invites/{invite.code}/accept",
    }


class RoomListView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("rooms", "List my rooms, or public rooms with ?scope=public", responses={200: None})
    def get(self, request):
        queryset = list_rooms(request.user.profile, scope=request.query_params.get("scope"))
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            [room_card(room, request.user.profile) for room in page]
        )

    @documented(
        "rooms",
        "Create a room. The creator becomes the owner.",
        request=RoomWriteSerializer,
        responses={201: None},
    )
    def post(self, request):
        serializer = RoomWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room, member = create_room(request.user.profile, **serializer.validated_data)
        return Response(room_detail(room, member), status=201)


class RoomDetailView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented(
        "rooms",
        "Room detail. Public rooms are visible to any signed-in user.",
        responses={200: None},
    )
    def get(self, request, id):
        room, member = get_room_for_viewer(id, request.user.profile)
        return Response(room_detail(room, member))

    @documented(
        "rooms", "Replace room fields", request=RoomReplaceSerializer, responses={200: None}
    )
    def put(self, request, id):
        serializer = RoomReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room, member = update_room(request.user.profile, id, serializer.validated_data)
        return Response(room_detail(room, member))

    @documented(
        "rooms", "Update some room fields", request=RoomPatchSerializer, responses={200: None}
    )
    def patch(self, request, id):
        serializer = RoomPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room, member = update_room(request.user.profile, id, serializer.validated_data)
        return Response(room_detail(room, member))

    @documented("rooms", "Soft-delete a room. Owner only.", responses={204: None})
    def delete(self, request, id):
        delete_room(request.user.profile, id)
        return Response(status=204)


class RoomAvatarView(BaseAPIView):
    throttle_classes = [UserRateThrottle, UploadThrottle]

    @documented("rooms", "Upload a room image", responses={200: None})
    def put(self, request, id):
        room, member = save_room_avatar(request.user.profile, id, _uploaded_file(request))
        return Response(room_detail(room, member))


class JoinRoomView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("rooms", "Join a public room", responses={201: None, 409: None})
    def post(self, request, id):
        member = join_public(request.user.profile, id)
        return Response(_member_body(member), status=201)


class LeaveRoomView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented(
        "rooms", "Leave a room. Ownership transfers or the room is archived.", responses={204: None}
    )
    def post(self, request, id):
        leave_room(request.user.profile, id)
        return Response(status=204)


class MemberListView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("rooms", "List room members", responses={200: None})
    def get(self, request, id):
        queryset = list_members(request.user.profile, id)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response([_member_body(member) for member in page])


class MemberDetailView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented(
        "rooms",
        "Change a member's role. Owner only.",
        request=RoleSerializer,
        responses={200: None},
    )
    def patch(self, request, id, user_id):
        serializer = RoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = change_role(request.user.profile, id, user_id, serializer.validated_data["role"])
        return Response(_member_body(member))

    @documented("rooms", "Remove a member", responses={204: None})
    def delete(self, request, id, user_id):
        remove_member(request.user.profile, id, user_id)
        return Response(status=204)


class InviteCreateView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("rooms", "Create an invite code", request=InviteSerializer, responses={201: None})
    def post(self, request, id):
        serializer = InviteSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        invite = create_invite(request.user.profile, id, **serializer.validated_data)
        return Response(_invite_body(invite), status=201)


class InviteAcceptView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("rooms", "Join a room with an invite code", responses={201: None})
    def post(self, request, code):
        member = accept_invite(request.user.profile, code)
        return Response(_member_body(member), status=201)
