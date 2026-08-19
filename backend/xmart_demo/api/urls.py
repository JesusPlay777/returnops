from django.urls import path

from xmart_demo.api.views import (
    XmartAdvanceView,
    XmartDemoView,
    XmartResetView,
)


app_name = "xmart-api"

urlpatterns = [
    path("demo/", XmartDemoView.as_view(), name="demo"),
    path("demo/advance/", XmartAdvanceView.as_view(), name="demo-advance"),
    path("demo/reset/", XmartResetView.as_view(), name="demo-reset"),
]
