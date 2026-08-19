"""Root URL configuration for ReturnOps."""

from django.conf import settings
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny


public_docs = {
    "authentication_classes": [],
    "permission_classes": [AllowAny],
}


urlpatterns = [
    path("api/", include("core.urls")),
    path(
        "api/v1/schema/",
        SpectacularAPIView.as_view(
            urlconf="returns.api.schema_urls",
            **public_docs,
        ),
        name="api-schema",
    ),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(
            url_name="api-schema",
            **public_docs,
        ),
        name="api-docs",
    ),
    path(
        "api/v1/redoc/",
        SpectacularRedocView.as_view(
            url_name="api-schema",
            **public_docs,
        ),
        name="api-redoc",
    ),
    path("api/v1/", include("returns.api.urls")),
    path("api/v1/energybil/", include("energybil.api.urls")),
    path("api/v1/xmart/", include("xmart_demo.api.urls")),
]

if settings.DJANGO_ENABLE_ADMIN:
    from django.contrib import admin

    urlpatterns.insert(0, path("admin/", admin.site.urls))
