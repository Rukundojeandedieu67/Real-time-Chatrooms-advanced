from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

from apps.accounts.views import (
    AvatarView,
    ChangePasswordView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    ResendVerificationView,
    ResetPasswordView,
    UserDetailView,
    UserSearchView,
)
from apps.analytics.views import MessagesPerRoomView, RoomStatsView
from apps.chat.views import (
    AttachmentView,
    MessageDetailView,
    MessageListView,
    ReactionView,
    ReadView,
)
from apps.core.views import HealthView
from apps.realtime.views import HeartbeatView, PresenceView, TypingView
from apps.rooms.views import (
    InviteAcceptView,
    InviteCreateView,
    JoinRoomView,
    LeaveRoomView,
    MemberDetailView,
    MemberListView,
    RoomAvatarView,
    RoomDetailView,
    RoomListView,
)

public = {
    "authentication_classes": [],
    "permission_classes": [AllowAny],
    "throttle_classes": [],
}

urlpatterns = [
    path("health", HealthView.as_view(), name="api-health"),
    path("schema", SpectacularAPIView.as_view(**public), name="api-schema"),
    path(
        "docs",
        SpectacularSwaggerView.as_view(url_name="api-schema", **public),
        name="api-docs",
    ),
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/password/forgot", ForgotPasswordView.as_view(), name="auth-forgot"),
    path("auth/password/reset", ResetPasswordView.as_view(), name="auth-reset"),
    path("auth/password/change", ChangePasswordView.as_view(), name="auth-change"),
    path("auth/email/resend", ResendVerificationView.as_view(), name="auth-resend"),
    path("users/me", MeView.as_view(), name="users-me"),
    path("users/me/avatar", AvatarView.as_view(), name="users-me-avatar"),
    path("users", UserSearchView.as_view(), name="users-search"),
    path("users/<uuid:id>", UserDetailView.as_view(), name="users-detail"),
    path("rooms", RoomListView.as_view(), name="rooms"),
    path("rooms/<uuid:id>", RoomDetailView.as_view(), name="room-detail"),
    path("rooms/<uuid:id>/avatar", RoomAvatarView.as_view(), name="room-avatar"),
    path("rooms/<uuid:id>/join", JoinRoomView.as_view(), name="room-join"),
    path("rooms/<uuid:id>/leave", LeaveRoomView.as_view(), name="room-leave"),
    path("rooms/<uuid:id>/members", MemberListView.as_view(), name="room-members"),
    path(
        "rooms/<uuid:id>/members/<uuid:user_id>",
        MemberDetailView.as_view(),
        name="room-member",
    ),
    path("rooms/<uuid:id>/invites", InviteCreateView.as_view(), name="room-invites"),
    path("invites/<str:code>/accept", InviteAcceptView.as_view(), name="invite-accept"),
    path("rooms/<uuid:id>/messages", MessageListView.as_view(), name="room-messages"),
    path("messages/<uuid:id>", MessageDetailView.as_view(), name="message-detail"),
    path("rooms/<uuid:id>/attachments", AttachmentView.as_view(), name="room-attachments"),
    path(
        "messages/<uuid:id>/reactions/<str:emoji>",
        ReactionView.as_view(),
        name="message-reaction",
    ),
    path("rooms/<uuid:id>/read", ReadView.as_view(), name="room-read"),
    path("rooms/<uuid:id>/typing", TypingView.as_view(), name="room-typing"),
    path("presence/heartbeat", HeartbeatView.as_view(), name="presence-heartbeat"),
    path("rooms/<uuid:id>/presence", PresenceView.as_view(), name="room-presence"),
    path("analytics/messages-per-room", MessagesPerRoomView.as_view(), name="analytics-messages"),
    path("rooms/<uuid:id>/stats", RoomStatsView.as_view(), name="room-stats"),
]
