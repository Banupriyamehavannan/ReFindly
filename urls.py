from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from items.auth_views import (
    AccountCheckView,
    CurrentAccountView,
    CsrfTokenView,
    LoginView,
    LogoutView,
    RegisterView,
)
from items.admin_views import (
    AdminDashboardView,
    AdminItemDeleteView,
    AdminLoginView,
    AdminLogoutView,
)
from items.views import ItemViewSet

router = DefaultRouter()
router.register("items", ItemViewSet, basename="item")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/csrf/", CsrfTokenView.as_view()),
    path("api/auth/check-account/", AccountCheckView.as_view()),
    path("api/auth/register/", RegisterView.as_view()),
    path("api/auth/login/", LoginView.as_view()),
    path("api/auth/me/", CurrentAccountView.as_view()),
    path("api/auth/logout/", LogoutView.as_view()),
    path("api/", include(router.urls)),
    path("api/admin/login/", AdminLoginView.as_view()),
    path("api/admin/logout/", AdminLogoutView.as_view()),
    path("api/admin/dashboard/", AdminDashboardView.as_view()),
    path("api/admin/items/<int:item_id>/", AdminItemDeleteView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
