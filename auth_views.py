from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccountProfile

User = get_user_model()


class AccountCheckSerializer(serializers.Serializer):
    college_id = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=AccountProfile.Role.choices)

    def validate_college_id(self, value):
        return value.strip().upper()


class RegistrationSerializer(AccountCheckSerializer):
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_full_name(self, value):
        return value.strip()


class LoginSerializer(AccountCheckSerializer):
    password = serializers.CharField(write_only=True)


def account_data(user):
    return {
        "college_id": user.username,
        "full_name": user.first_name,
        "role": user.account_profile.role,
    }


class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


@method_decorator(csrf_protect, name="dispatch")
class AccountCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AccountCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        college_id = serializer.validated_data["college_id"]
        role = serializer.validated_data["role"]
        user = User.objects.filter(username=college_id).first()
        profile = getattr(user, "account_profile", None) if user else None

        return Response(
            {
                "exists": user is not None,
                "role_matches": profile is not None and profile.role == role,
                "registered_role": profile.role if profile else None,
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        college_id = data["college_id"]
        if User.objects.filter(username=college_id).exists():
            return Response(
                {"college_id": ["This College ID is already registered."]},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            user = User.objects.create_user(
                username=college_id,
                first_name=data["full_name"],
                password=data["password"],
            )
            AccountProfile.objects.create(user=user, role=data["role"])

        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(account_data(user), status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = authenticate(
            request,
            username=data["college_id"],
            password=data["password"],
        )
        profile = getattr(user, "account_profile", None) if user else None
        if user is None or profile is None or profile.role != data["role"]:
            return Response(
                {"detail": "The College ID, password, or account type is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        return Response(account_data(user))


class CurrentAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "account_profile", None)
        if profile is None:
            return Response(
                {"detail": "This account does not have a ReFindly profile."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(account_data(request.user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
