from django.urls import include, path
from rest_framework.routers import DefaultRouter

from returns.api.views import (
    CustomerReturnViewSet,
    DemoOrderListView,
    DemoResetView,
    OperationsReturnViewSet,
    SessionView,
)


app_name = "returns-api"

router = DefaultRouter()
router.register(
    "returns",
    CustomerReturnViewSet,
    basename="customer-return",
)
router.register(
    "operations/returns",
    OperationsReturnViewSet,
    basename="operations-return",
)

urlpatterns = [
    path("session/", SessionView.as_view(), name="session"),
    path("demo/orders/", DemoOrderListView.as_view(), name="demo-orders"),
    path("demo/reset/", DemoResetView.as_view(), name="demo-reset"),
    path("", include(router.urls)),
]
