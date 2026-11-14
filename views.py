from django.db.models import Case, IntegerField, Value, When
from rest_framework import viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS

from .models import Item
from .serializers import ItemSerializer


class IsItemOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, item):
        return (
            request.method in SAFE_METHODS
            or request.user.is_staff
            or item.created_by_id == request.user.id
        )


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    queryset = Item.objects.all()

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsItemOwnerOrReadOnly()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        items = super().get_queryset()
        params = self.request.query_params
        item_type = params.get("type")
        category = params.get("category")
        search = params.get("search")
        status = params.get("status")

        if item_type in Item.ItemType.values:
            items = items.filter(item_type=item_type)
        if category in Item.Category.values:
            items = items.filter(category=category)
        if status in Item.Status.values:
            items = items.filter(status=status)
        if search:
            items = items.filter(item_name__icontains=search)
        return items.order_by(
            Case(
                When(item_type=Item.ItemType.FOUND, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
            "-created_at",
        )
