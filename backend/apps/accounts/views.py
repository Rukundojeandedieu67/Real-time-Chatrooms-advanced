from drf_spectacular.utils import OpenApiParameter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.serializers import (
    ChangePasswordSerializer,
    ForgotSerializer,
    LoginSerializer,
    ProfilePatchSerializer,
    ProfileReplaceSerializer,
    ProfileSerializer,
    RefreshSerializer,
    RegisterSerializer,
    ResendSerializer,
    ResetSerializer,
)
from apps.accounts.services import (
    change_password,
    delete_account,
    forgot_password,
    login,
    logout_session,
    refresh_session,
    register,
    remove_avatar,
    replace_profile,
    resend_verification,
    reset_password,
    save_avatar,
    search_profiles,
    update_profile,
)
from apps.core.exceptions import DomainError
from apps.core.pagination import StandardPagination
from apps.core.schema import documented
from apps.core.throttles import (
    AnonRateThrottle,
    LoginRateThrottle,
    PasswordRateThrottle,
    RegisterRateThrottle,
    UploadThrottle,
    UserRateThrottle,
)
from apps.core.views import BaseAPIView


def _session(result, *, extra=None):
    body = {
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "expires_in": result.get("expires_in"),
        "user": ProfileSerializer(result["profile"]).data,
    }
    if extra:
        body.update(extra)
    return body


def _uploaded_file(request):
    unknown = sorted(set(request.data.keys()) - {"file"})
    if unknown:
        raise DomainError(
            "validation_error",
            "Unknown field",
            400,
            {field: ["Unknown field."] for field in unknown},
        )
    upload = request.FILES.get("file")
    if upload is None:
        raise DomainError(
            "validation_error",
            "file is required",
            400,
            {"file": ["This field is required."]},
        )
    return upload


class RegisterView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, RegisterRateThrottle]

    @documented(
        "auth",
        "Create an account",
        request=RegisterSerializer,
        responses={201: None, 409: None},
        auth=False,
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = register(**serializer.validated_data)
        return Response(
            _session(
                result,
                extra={"email_confirmation_required": result["email_confirmation_required"]},
            ),
            status=201,
        )


class LoginView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, LoginRateThrottle]

    @documented("auth", "Sign in", request=LoginSerializer, responses={200: None}, auth=False)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(_session(login(**serializer.validated_data)))


class RefreshView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @documented(
        "auth",
        "Exchange a refresh token",
        request=RefreshSerializer,
        responses={200: None},
        auth=False,
    )
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(_session(refresh_session(**serializer.validated_data)))


class LogoutView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("auth", "Revoke the current session", responses={204: None})
    def post(self, request):
        logout_session(access_token=request.auth)
        return Response(status=204)


class ForgotPasswordView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, PasswordRateThrottle]

    @documented(
        "auth",
        "Send a password reset email without revealing whether the account exists",
        request=ForgotSerializer,
        responses={202: None},
        auth=False,
    )
    def post(self, request):
        serializer = ForgotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(forgot_password(**serializer.validated_data), status=202)


class ResetPasswordView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, PasswordRateThrottle]

    @documented(
        "auth",
        "Set a new password with the recovery token",
        request=ResetSerializer,
        responses={204: None},
        auth=False,
    )
    def post(self, request):
        serializer = ResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_password(**serializer.validated_data)
        return Response(status=204)


class ChangePasswordView(BaseAPIView):
    throttle_classes = [UserRateThrottle, PasswordRateThrottle]

    @documented(
        "auth",
        "Change the password of the signed-in user",
        request=ChangePasswordSerializer,
        responses={204: None},
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        change_password(user=request.user, access_token=request.auth, **serializer.validated_data)
        return Response(status=204)


class ResendVerificationView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, PasswordRateThrottle]

    @documented(
        "auth",
        "Resend the signup verification email",
        request=ResendSerializer,
        responses={202: None},
        auth=False,
    )
    def post(self, request):
        serializer = ResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(resend_verification(**serializer.validated_data), status=202)


class MeView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("profiles", "Get the signed-in profile", responses={200: ProfileSerializer})
    def get(self, request):
        return Response(ProfileSerializer(request.user.profile).data)

    @documented(
        "profiles",
        "Replace profile fields",
        request=ProfileReplaceSerializer,
        responses={200: ProfileSerializer},
    )
    def put(self, request):
        serializer = ProfileReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = replace_profile(request.user.profile, **serializer.validated_data)
        return Response(ProfileSerializer(profile).data)

    @documented(
        "profiles",
        "Update some profile fields",
        request=ProfilePatchSerializer,
        responses={200: ProfileSerializer},
    )
    def patch(self, request):
        serializer = ProfilePatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = update_profile(request.user.profile, **serializer.validated_data)
        return Response(ProfileSerializer(profile).data)

    @documented("profiles", "Soft-delete the signed-in account", responses={204: None})
    def delete(self, request):
        delete_account(request.user)
        return Response(status=204)


class AvatarView(BaseAPIView):
    throttle_classes = [UserRateThrottle, UploadThrottle]

    @documented("profiles", "Upload an avatar", responses={200: ProfileSerializer})
    def put(self, request):
        profile = save_avatar(request.user.profile, _uploaded_file(request))
        return Response(ProfileSerializer(profile).data)

    @documented("profiles", "Remove the avatar", responses={204: None})
    def delete(self, request):
        remove_avatar(request.user.profile)
        return Response(status=204)


class UserDetailView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented("profiles", "Get a public profile", responses={200: ProfileSerializer})
    def get(self, request, id):
        from apps.accounts.models import Profile

        try:
            profile = Profile.objects.get(pk=id)
        except Profile.DoesNotExist as exc:
            raise DomainError("not_found", "Not found", 404) from exc
        return Response(ProfileSerializer(profile).data)


class UserSearchView(BaseAPIView):
    throttle_classes = [UserRateThrottle]

    @documented(
        "profiles",
        "Search users by username or display name",
        parameters=[
            OpenApiParameter(
                name="search", type=str, location=OpenApiParameter.QUERY, required=True
            ),
        ],
        responses={200: ProfileSerializer},
    )
    def get(self, request):
        queryset = search_profiles(request.query_params.get("search", ""))
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(ProfileSerializer(page, many=True).data)
