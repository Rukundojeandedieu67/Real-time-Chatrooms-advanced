from rest_framework.response import Response

from apps.accounts.views import _uploaded_file
from apps.chat.serializers import EditMessageSerializer, ReadSerializer, SendMessageSerializer, serialize_message
from apps.chat.services import (
    add_reaction,
    attachment_payload,
    delete_message,
    edit_message,
    get_message,
    list_messages,
    mark_read,
    remove_reaction,
    send_message,
    upload_attachment,
)
from apps.core.schema import documented
from apps.core.throttles import AnonRateThrottle, MessageSendThrottle, UploadThrottle, UserRateThrottle
from apps.core.views import BaseAPIView


class MessageListView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    def get_throttles(self):
        method = self.request.method if getattr(self, "request", None) is not None else "GET"
        throttles = [AnonRateThrottle(), UserRateThrottle()]
        if method == "POST":
            throttles.append(MessageSendThrottle())
        return throttles

    @documented("messages", "Cursor-paginated room history. Use before and limit. q searches text.", responses={200: None})
    def get(self, request, id):
        rows, next_before, has_more = list_messages(
            request.user.profile,
            id,
            before=request.query_params.get("before") or None,
            limit=request.query_params.get("limit"),
            query=request.query_params.get("q") or None,
        )
        return Response(
            {
                "results": [serialize_message(row, request.user.id) for row in rows],
                "next_before": str(next_before) if next_before else None,
                "has_more": has_more,
            }
        )

    @documented("messages", "Send a message. client_message_id makes retries idempotent.", request=SendMessageSerializer, responses={201: None, 200: None})
    def post(self, request, id):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message, created = send_message(request.user.profile, id, **serializer.validated_data)
        status = 201 if created else 200
        return Response(serialize_message(message, request.user.id), status=status)


class MessageDetailView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("messages", "Fetch one message", responses={200: None})
    def get(self, request, id):
        message = get_message(request.user.profile, id)
        return Response(serialize_message(message, request.user.id))

    @documented("messages", "Edit your message within 15 minutes", request=EditMessageSerializer, responses={200: None})
    def patch(self, request, id):
        serializer = EditMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = edit_message(request.user.profile, id, serializer.validated_data["body"])
        return Response(serialize_message(message, request.user.id))

    @documented("messages", "Soft-delete a message. Author, room owner or room admin.", responses={200: None})
    def delete(self, request, id):
        message = delete_message(request.user.profile, id)
        return Response(serialize_message(message, request.user.id))


class AttachmentView(BaseAPIView):
    throttle_classes = [UserRateThrottle, UploadThrottle]

    @documented("messages", "Upload an image attachment and receive an id to send with a message", responses={201: None})
    def post(self, request, id):
        attachment = upload_attachment(request.user.profile, id, _uploaded_file(request))
        return Response(attachment_payload(attachment), status=201)


class ReactionView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("messages", "Add a reaction. Repeating it does not create a duplicate.", responses={200: None, 201: None})
    def put(self, request, id, emoji):
        result = add_reaction(request.user.profile, id, emoji)
        status = 201 if result.pop("created") else 200
        return Response(result, status=status)

    @documented("messages", "Remove my reaction", responses={204: None})
    def delete(self, request, id, emoji):
        remove_reaction(request.user.profile, id, emoji)
        return Response(status=204)


class ReadView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("messages", "Move the read marker forward", request=ReadSerializer, responses={200: None})
    def post(self, request, id):
        serializer = ReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = mark_read(
            request.user.profile,
            id,
            serializer.validated_data["last_read_message_id"],
        )
        return Response({"last_read_message_id": member.last_read_message_id})
