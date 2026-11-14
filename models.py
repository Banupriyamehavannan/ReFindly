from django.conf import settings
from django.db import models


class AccountProfile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        FACULTY = "faculty", "Faculty"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="account_profile",
    )
    role = models.CharField(max_length=10, choices=Role.choices)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class Item(models.Model):
    class ItemType(models.TextChoices):
        LOST = "lost", "Lost"
        FOUND = "found", "Found"

    class Category(models.TextChoices):
        ELECTRONICS = "electronics", "Electronics"
        DOCUMENTS = "documents", "Documents"
        ACCESSORIES = "accessories", "Accessories"
        BAGS = "bags", "Bags"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    item_type = models.CharField(max_length=8, choices=ItemType.choices)
    item_name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField(max_length=1000)
    location = models.CharField(max_length=180)
    date = models.DateField()
    contact_name = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=20)
    image = models.ImageField(upload_to="items/", blank=True, null=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.OPEN
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_item_type_display()}: {self.item_name}"
