from rest_framework import serializers

from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = [
            "id",
            "item_type",
            "item_name",
            "category",
            "description",
            "location",
            "date",
            "contact_name",
            "contact_phone",
            "image",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_contact_phone(self, value):
        phone = "".join(character for character in value if character.isdigit())
        if len(phone) < 10 or len(phone) > 15:
            raise serializers.ValidationError("Enter a valid phone number.")
        return value
