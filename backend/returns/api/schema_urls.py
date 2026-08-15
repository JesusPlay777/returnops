"""URL surface included in the versioned OpenAPI contract."""

from django.urls import include, path


urlpatterns = [
    path("api/v1/", include("returns.api.urls")),
    path("api/v1/energybil/", include("energybil.api.urls")),
]
