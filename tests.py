from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import AccountProfile, Item

User = get_user_model()


class ItemApiTests(APITestCase):
    def authenticate(self):
        user = User.objects.create_user(
            username="STUDENT01",
            password="secure-password",
        )
        self.client.force_authenticate(user=user)

    def test_create_and_search_item(self):
        self.authenticate()
        response = self.client.post(
            "/api/items/",
            {
                "item_type": "found",
                "item_name": "Black wallet",
                "category": "accessories",
                "description": "Found at the bus station",
                "location": "Madurai bus station",
                "date": "2026-11-12",
                "contact_name": "Kumar",
                "contact_phone": "9876543210",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "open")

        response = self.client.get("/api/items/?type=found&search=wallet")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["item_name"], "Black wallet")

    def test_rejects_invalid_contact_phone(self):
        self.authenticate()
        response = self.client.post(
            "/api/items/",
            {
                "item_type": "lost",
                "item_name": "Keys",
                "category": "other",
                "description": "A set of keys",
                "location": "Madurai",
                "date": "2026-11-12",
                "contact_name": "Ravi",
                "contact_phone": "123",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contact_phone", response.data)

    def test_found_items_are_listed_before_lost_items(self):
        self.authenticate()
        payload = {
            "category": "other",
            "description": "A test item",
            "location": "Campus",
            "date": "2026-11-12",
            "contact_name": "Test User",
            "contact_phone": "9876543210",
        }
        self.client.post(
            "/api/items/",
            {**payload, "item_type": "found", "item_name": "Found item"},
            format="multipart",
        )
        self.client.post(
            "/api/items/",
            {**payload, "item_type": "lost", "item_name": "Lost item"},
            format="multipart",
        )

        response = self.client.get("/api/items/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["item_type"] for item in response.data],
            ["found", "lost"],
        )

    def test_account_check_and_registration(self):
        check_response = self.client.post(
            "/api/auth/check-account/",
            {"college_id": "student01", "role": AccountProfile.Role.STUDENT},
            format="json",
        )
        self.assertEqual(check_response.status_code, status.HTTP_200_OK)
        self.assertFalse(check_response.data["exists"])

        register_response = self.client.post(
            "/api/auth/register/",
            {
                "college_id": "student01",
                "full_name": "Student One",
                "role": AccountProfile.Role.STUDENT,
                "password": "secure-password",
            },
            format="json",
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(register_response.data["college_id"], "STUDENT01")

        check_response = self.client.post(
            "/api/auth/check-account/",
            {"college_id": "STUDENT01", "role": AccountProfile.Role.STUDENT},
            format="json",
        )
        self.assertTrue(check_response.data["exists"])
        self.assertTrue(check_response.data["role_matches"])

        self.client.logout()
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "college_id": "student01",
                "role": AccountProfile.Role.STUDENT,
                "password": "secure-password",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        current_account = self.client.get("/api/auth/me/")
        self.assertEqual(current_account.status_code, status.HTTP_200_OK)
        self.assertEqual(current_account.data["role"], AccountProfile.Role.STUDENT)

    def test_anonymous_users_cannot_post_items(self):
        response = self.client.post("/api/items/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SessionAuthFlowTests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def csrf_headers(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {"HTTP_X_CSRFTOKEN": self.client.cookies["csrftoken"].value}

    def test_registration_session_can_post_item_with_csrf(self):
        check_response = self.client.post(
            "/api/auth/check-account/",
            {"college_id": "FACULTY01", "role": AccountProfile.Role.FACULTY},
            format="json",
            **self.csrf_headers(),
        )
        self.assertFalse(check_response.data["exists"])

        register_response = self.client.post(
            "/api/auth/register/",
            {
                "college_id": "FACULTY01",
                "full_name": "Faculty Member",
                "role": AccountProfile.Role.FACULTY,
                "password": "secure-password",
            },
            format="json",
            **self.csrf_headers(),
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        item_response = self.client.post(
            "/api/items/",
            {
                "item_type": "found",
                "item_name": "Found keys",
                "category": "other",
                "description": "Keys found near the library",
                "location": "Library",
                "date": "2026-11-13",
                "contact_name": "Faculty Member",
                "contact_phone": "9876543210",
            },
            format="json",
            **self.csrf_headers(),
        )
        self.assertEqual(item_response.status_code, status.HTTP_201_CREATED)


@override_settings(
    REFINDLY_ADMIN_USERNAME="admin",
    REFINDLY_ADMIN_PASSWORD="test-admin-secret",
)
class AdminPanelApiTests(APITestCase):
    def setUp(self):
        student = User.objects.create_user(username="STUDENT01", password="password")
        faculty = User.objects.create_user(username="FACULTY01", password="password")
        AccountProfile.objects.create(user=student, role=AccountProfile.Role.STUDENT)
        AccountProfile.objects.create(user=faculty, role=AccountProfile.Role.FACULTY)
        self.item = Item.objects.create(
            item_type=Item.ItemType.FOUND,
            item_name="Found keys",
            category=Item.Category.OTHER,
            description="Keys found near the library",
            location="Library",
            date="2026-11-13",
            contact_name="Student One",
            contact_phone="9876543210",
            created_by=student,
        )

    def admin_login(self):
        return self.client.post(
            "/api/admin/login/",
            {"username": "admin", "password": "test-admin-secret"},
            format="json",
        )

    def test_dashboard_requires_admin_session_and_reports_counts(self):
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.assertEqual(self.admin_login().status_code, status.HTTP_200_OK)
        response = self.client.get("/api/admin/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["counts"],
            {
                "students": 1,
                "faculty": 1,
                "found_items": 1,
                "lost_items": 0,
                "total_items": 1,
            },
        )
        self.assertEqual(len(response.data["items"]), 1)

    def test_admin_can_delete_item_and_bad_password_is_rejected(self):
        response = self.client.post(
            "/api/admin/login/",
            {"username": "admin", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.delete(f"/api/admin/items/{self.item.pk}/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(self.admin_login().status_code, status.HTTP_200_OK)
        response = self.client.delete(f"/api/admin/items/{self.item.pk}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Item.objects.filter(pk=self.item.pk).exists())
