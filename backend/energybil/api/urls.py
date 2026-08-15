from django.urls import path

from energybil.api.views import (
    EnergyAdvanceView,
    EnergyDemoView,
    EnergyResetView,
)


app_name = "energybil-api"

urlpatterns = [
    path("demo/", EnergyDemoView.as_view(), name="demo"),
    path("demo/advance/", EnergyAdvanceView.as_view(), name="demo-advance"),
    path("demo/reset/", EnergyResetView.as_view(), name="demo-reset"),
]
