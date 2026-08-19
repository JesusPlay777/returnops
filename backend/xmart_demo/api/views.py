from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from returns.api.openapi import (
    VISITOR_SECURITY,
    VISITOR_WRITE_SECURITY,
    error_responses,
)
from returns.api.throttles import VisitorResetThrottle
from returns.services.visitor_sessions import (
    require_visitor_session,
    visitor_session_ttl,
)
from xmart_demo.api.serializers import XmartDemoSerializer
from xmart_demo.services import (
    advance_xmart_demo,
    reset_xmart_demo,
    seed_xmart_demo,
)


def _visitor(request):
    return require_visitor_session(request._request)


class XmartDemoView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="retrieveXmartDemo",
        tags=["Xmart demo"],
        summary="Retrieve the isolated Xmart provisioning scenario",
        description=(
            "Seeds once and returns the current visitor's fictional customer, "
            "user, device, capacity, and audit state. No ownership identifier "
            "is accepted."
        ),
        auth=VISITOR_SECURITY,
        responses={
            200: XmartDemoSerializer,
            **error_responses(401),
        },
    )
    def get(self, request):
        workspace = seed_xmart_demo(_visitor(request))
        return Response(XmartDemoSerializer(workspace).data)


class XmartAdvanceView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="advanceXmartDemo",
        tags=["Xmart demo"],
        summary="Run the next synchronous provisioning stage",
        description=(
            "Advances exactly one stage in a database transaction. External "
            "email, device, and background-worker operations are represented "
            "only by explicit fictional in-app records."
        ),
        auth=VISITOR_WRITE_SECURITY,
        request=None,
        responses={
            200: XmartDemoSerializer,
            **error_responses(401, 403),
        },
    )
    def post(self, request):
        workspace, advanced = advance_xmart_demo(_visitor(request))
        serializer = XmartDemoSerializer(
            workspace,
            context={"did_advance": advanced},
        )
        return Response(serializer.data)


class XmartResetView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [VisitorResetThrottle]

    @extend_schema(
        operation_id="resetXmartDemo",
        tags=["Xmart demo"],
        summary="Reset only the current visitor's Xmart scenario",
        auth=VISITOR_WRITE_SECURITY,
        request=None,
        responses={
            200: XmartDemoSerializer,
            **error_responses(401, 403, 429),
        },
    )
    def post(self, request):
        workspace = reset_xmart_demo(_visitor(request))
        request.session.set_expiry(
            int(visitor_session_ttl().total_seconds()),
        )
        return Response(XmartDemoSerializer(workspace).data)
