from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

from apps.core.views import HealthView

admin.site.site_header = "Chat rooms admin"
admin.site.site_title = "Chat rooms admin"

public = {
    "authentication_classes": [],
    "permission_classes": [AllowAny],
    "throttle_classes": [],
}

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health", HealthView.as_view(), name="health"),
    path("schema", SpectacularAPIView.as_view(**public), name="schema"),
    path("docs", SpectacularSwaggerView.as_view(url_name="schema", **public), name="docs"),
    path("api/v1/", include("config.api_urls")),
]

handler404 = "apps.core.views.error_404"
handler500 = "apps.core.views.error_500"
