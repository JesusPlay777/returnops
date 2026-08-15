from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from energybil.api.serializers import EnergyDemoSerializer
from energybil.services import (
    advance_energy_demo,
    reset_energy_demo,
    seed_energy_demo,
)
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


def _visitor(request):
    return require_visitor_session(request._request)


class EnergyDemoView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="retrieveEnergybilDemo",
        tags=["Energybil demo"],
        summary="Retrieve the isolated Energybil scenario",
        description=(
            "Seeds once and returns the current visitor's fictional meter-to-"
            "invoice workflow. No ownership identifier is accepted."
        ),
        auth=VISITOR_SECURITY,
        responses={
            200: EnergyDemoSerializer,
            **error_responses(401),
        },
    )
    def get(self, request):
        account = seed_energy_demo(_visitor(request))
        return Response(EnergyDemoSerializer(account).data)


class EnergyAdvanceView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="advanceEnergybilDemo",
        tags=["Energybil demo"],
        summary="Run the next synchronous billing stage",
        description=(
            "Advances exactly one stage in a database transaction. The final "
            "delivery stage is an in-app simulation; no queue or email is used."
        ),
        auth=VISITOR_WRITE_SECURITY,
        request=None,
        responses={
            200: EnergyDemoSerializer,
            **error_responses(401, 403),
        },
    )
    def post(self, request):
        account, advanced = advance_energy_demo(_visitor(request))
        serializer = EnergyDemoSerializer(
            account,
            context={"did_advance": advanced},
        )
        return Response(serializer.data)


class EnergyResetView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [VisitorResetThrottle]

    @extend_schema(
        operation_id="resetEnergybilDemo",
        tags=["Energybil demo"],
        summary="Reset only the current visitor's Energybil scenario",
        auth=VISITOR_WRITE_SECURITY,
        request=None,
        responses={
            200: EnergyDemoSerializer,
            **error_responses(401, 403, 429),
        },
    )
    def post(self, request):
        account = reset_energy_demo(_visitor(request))
        request.session.set_expiry(
            int(visitor_session_ttl().total_seconds()),
        )
        return Response(EnergyDemoSerializer(account).data)
