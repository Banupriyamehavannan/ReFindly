import hmac

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccountProfile, Item
from .serializers import ItemSerializer


class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class IsAdminSession(BasePermission):
    def has_permission(self, request, view):
        return request.session.get("refindly_admin_authenticated", False)


@method_decorator(csrf_protect, name="dispatch")
class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        configured_username = settings.REFINDLY_ADMIN_USERNAME
        configured_password = settings.REFINDLY_ADMIN_PASSWORD
        if not configured_username or not configured_password:
            return Response(
                {"detail": "Admin login is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        credentials = serializer.validated_data
        username_matches = hmac.compare_digest(
            credentials["username"].encode("utf-8"),
            configured_username.encode("utf-8"),
        )
        password_matches = hmac.compare_digest(
            credentials["password"].encode("utf-8"),
            configured_password.encode("utf-8"),
        )
        if not username_matches or not password_matches:
            return Response(
                {"detail": "The username or password is incorrect."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        request.session.cycle_key()
        request.session["refindly_admin_authenticated"] = True
        return Response({"detail": "Admin login successful."})


class AdminLogoutView(APIView):
    permission_classes = [IsAdminSession]

    def post(self, request):
        request.session.pop("refindly_admin_authenticated", None)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminDashboardView(APIView):
    permission_classes = [IsAdminSession]

    def get(self, request):
        items = Item.objects.all()
        counts = {
            "students": AccountProfile.objects.filter(
                role=AccountProfile.Role.STUDENT
            ).count(),
            "faculty": AccountProfile.objects.filter(
                role=AccountProfile.Role.FACULTY
            ).count(),
            "found_items": items.filter(item_type=Item.ItemType.FOUND).count(),
            "lost_items": items.filter(item_type=Item.ItemType.LOST).count(),
            "total_items": items.count(),
        }
        return Response(
            {
                "counts": counts,
                "items": ItemSerializer(
                    items.order_by("-created_at"),
                    many=True,
                    context={"request": request},
                ).data,
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class AdminItemDeleteView(APIView):
    permission_classes = [IsAdminSession]

    def delete(self, request, item_id):
        item = get_object_or_404(Item, pk=item_id)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
