from django.contrib import admin

from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("item_name", "item_type", "category", "location", "status", "date")
    list_filter = ("item_type", "category", "status")
    search_fields = ("item_name", "description", "location", "contact_name")
