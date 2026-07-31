from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from returns.api.pagination import ReturnPageNumberPagination
from returns.api.openapi import (
    EVIDENCE_ID_PARAMETER,
    ITEM_ID_PARAMETER,
    PUBLIC_SECURITY,
    RETURN_ID_PARAMETER,
    VISITOR_SECURITY,
    VISITOR_WRITE_SECURITY,
    error_responses,
)
from returns.api.serializers import (
    CatalogReturnCreateSerializer,
    DemoOrderSerializer,
    DemoResetResponseSerializer,
    EvidenceSerializer,
    EvidenceWriteSerializer,
    OperationsQueueQuerySerializer,
    OperationsTransitionSerializer,
    ReturnItemSerializer,
    ReturnItemUpdateSerializer,
    ReturnRequestDetailSerializer,
    ReturnRequestSummarySerializer,
    SubmitReturnSerializer,
    VisitorSessionResponseSerializer,
)
from returns.models import ReturnRequest
from returns.selectors import (
    customer_return_detail,
    customer_return_list,
    eligible_demo_orders,
    operations_return_detail,
    operations_return_list,
)
from returns.services.demo_dataset import (
    reset_demo_dataset,
    seed_demo_dataset,
)
from returns.services.catalog_orders import create_return_from_demo_order
from returns.services.return_requests import (
    add_item_evidence,
    delete_draft_return,
    delete_item_evidence,
    delete_return_item,
    update_return_item,
)
from returns.services.transitions import (
    submit_return,
    transition_return,
)
from returns.services.visitor_sessions import (
    bootstrap_visitor_session,
    require_visitor_session,
    visitor_session_ttl,
)


def _visitor(request):
    return require_visitor_session(request._request)


class SessionView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="bootstrapVisitorSession",
        tags=["Demo session"],
        summary="Bootstrap the isolated demo session",
        description=(
            "Creates or resumes the server-owned visitor sandbox, seeds the "
            "fictional dataset once, and sets the session and CSRF cookies. "
            "No visitor UUID is exposed."
        ),
        auth=PUBLIC_SECURITY,
        request=None,
        responses={200: VisitorSessionResponseSerializer},
        examples=[
            OpenApiExample(
                "Ready demo session",
                value={
                    "expires_at": "2026-08-01T16:00:00Z",
                    "available_roles": ["CUSTOMER", "OPERATIONS"],
                    "supported_locales": ["en", "es"],
                    "dataset_ready": True,
                },
                response_only=True,
                status_codes=["200"],
            )
        ],
    )
    @transaction.atomic
    def get(self, request):
        get_token(request._request)
        visitor = bootstrap_visitor_session(request._request)
        summary = seed_demo_dataset(visitor)
        serializer = VisitorSessionResponseSerializer(
            {
                "expires_at": visitor.expires_at,
                "available_roles": ["CUSTOMER", "OPERATIONS"],
                "supported_locales": ["en", "es"],
                "dataset_ready": summary.return_count > 0,
            }
        )
        return Response(serializer.data)


class DemoResetView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="resetDemoDataset",
        tags=["Demo session"],
        summary="Reset the current visitor's fictional dataset",
        description=(
            "Atomically replaces only the current visitor's data with the "
            "canonical fictional scenario and refreshes its expiration."
        ),
        auth=VISITOR_WRITE_SECURITY,
        request=None,
        responses={
            200: DemoResetResponseSerializer,
            **error_responses(401, 403),
        },
    )
    def post(self, request):
        visitor = _visitor(request)
        summary = reset_demo_dataset(visitor)
        request.session.set_expiry(
            int(visitor_session_ttl().total_seconds()),
        )
        serializer = DemoResetResponseSerializer(
            {
                "reset_at": timezone.now(),
                "return_count": summary.return_count,
                "message_code": "demo_reset_complete",
            }
        )
        return Response(serializer.data)


class DemoOrderListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="listEligibleDemoOrders",
        tags=["Demo orders"],
        summary="List unused fictional orders eligible for return",
        description=(
            "Returns only server-owned fictional catalog data from the "
            "current visitor sandbox. Orders already used by a return are "
            "excluded."
        ),
        auth=VISITOR_SECURITY,
        responses={
            200: DemoOrderSerializer(many=True),
            **error_responses(401),
        },
    )
    def get(self, request):
        visitor = _visitor(request)
        seed_demo_dataset(visitor)
        orders = eligible_demo_orders(visitor)
        return Response(DemoOrderSerializer(orders, many=True).data)


class CustomerReturnViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    pagination_class = ReturnPageNumberPagination
    queryset = ReturnRequest.objects.none()
    http_method_names = [
        "get",
        "post",
        "patch",
        "delete",
        "head",
        "options",
    ]

    @extend_schema(
        operation_id="listCustomerReturns",
        tags=["Customer returns"],
        summary="List returns in the current visitor sandbox",
        auth=VISITOR_SECURITY,
        responses={
            200: ReturnRequestSummarySerializer(many=True),
            **error_responses(401),
        },
    )
    def list(self, request):
        visitor = _visitor(request)
        queryset = customer_return_list(visitor)
        page = self.paginate_queryset(queryset)
        serializer = ReturnRequestSummarySerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        operation_id="createCustomerReturn",
        tags=["Customer returns"],
        summary="Create a draft from an eligible fictional order",
        auth=VISITOR_WRITE_SECURITY,
        request=CatalogReturnCreateSerializer,
        responses={
            201: ReturnRequestDetailSerializer,
            **error_responses(400, 401, 403),
        },
        examples=[
            OpenApiExample(
                "Return selected catalog items",
                value={
                    "order_id": "3ce8a3de-d732-49bc-b1c4-1698091cf175",
                    "items": [
                        {
                            "order_item_id": (
                                "ca385771-23f5-4da7-b7c7-35c1c5b21ab0"
                            ),
                            "quantity": 1,
                            "reason": "DAMAGED",
                            "details": "Fictional product damage.",
                        }
                    ],
                },
                request_only=True,
            )
        ],
    )
    def create(self, request):
        visitor = _visitor(request)
        serializer = CatalogReturnCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return_request = create_return_from_demo_order(
            visitor,
            order_id=serializer.validated_data["order_id"],
            selections=serializer.validated_data["items"],
        )
        detail = customer_return_detail(visitor, return_request.id)
        return Response(
            ReturnRequestDetailSerializer(detail).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        operation_id="retrieveCustomerReturn",
        tags=["Customer returns"],
        summary="Retrieve a return with items, evidence, and timeline",
        auth=VISITOR_SECURITY,
        parameters=[RETURN_ID_PARAMETER],
        responses={
            200: ReturnRequestDetailSerializer,
            **error_responses(401, 404),
        },
    )
    def retrieve(self, request, pk=None):
        detail = customer_return_detail(_visitor(request), pk)
        return Response(ReturnRequestDetailSerializer(detail).data)

    @extend_schema(
        operation_id="deleteCustomerDraft",
        tags=["Customer returns"],
        summary="Delete a draft return",
        auth=VISITOR_WRITE_SECURITY,
        parameters=[RETURN_ID_PARAMETER],
        responses={
            204: None,
            **error_responses(401, 403, 404, 409),
        },
    )
    def destroy(self, request, pk=None):
        delete_draft_return(_visitor(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        operation_id="submitCustomerReturn",
        tags=["Customer returns"],
        summary="Submit or resubmit a return",
        description=(
            "Transitions DRAFT to SUBMITTED. For NEEDS_INFORMATION, a "
            "non-empty response_note is required."
        ),
        auth=VISITOR_WRITE_SECURITY,
        parameters=[RETURN_ID_PARAMETER],
        request=SubmitReturnSerializer,
        responses={
            200: ReturnRequestDetailSerializer,
            **error_responses(400, 401, 403, 404, 409),
        },
    )
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        visitor = _visitor(request)
        serializer = SubmitReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submit_return(
            visitor,
            pk,
            response_note=serializer.validated_data["response_note"],
        )
        detail = customer_return_detail(visitor, pk)
        return Response(ReturnRequestDetailSerializer(detail).data)

    @extend_schema(
        methods=["PATCH"],
        operation_id="updateCustomerReturnItem",
        tags=["Customer returns"],
        summary="Update an item on a mutable return",
        auth=VISITOR_WRITE_SECURITY,
        parameters=[RETURN_ID_PARAMETER, ITEM_ID_PARAMETER],
        request=ReturnItemUpdateSerializer,
        responses={
            200: ReturnItemSerializer,
            **error_responses(400, 401, 403, 404, 409),
        },
    )
    @extend_schema(
        methods=["DELETE"],
        operation_id="deleteCustomerReturnItem",
        tags=["Customer returns"],
        summary="Delete an item from a mutable return",
        auth=VISITOR_WRITE_SECURITY,
        parameters=[RETURN_ID_PARAMETER, ITEM_ID_PARAMETER],
        responses={
            204: None,
            **error_responses(401, 403, 404, 409),
        },
    )
    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"items/(?P<item_id>[^/.]+)",
    )
    def item_detail(self, request, pk=None, item_id=None):
        visitor = _visitor(request)
        if request.method == "DELETE":
            delete_return_item(visitor, pk, item_id)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ReturnItemUpdateSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        return_item = update_return_item(
            visitor,
            pk,
            item_id,
            data=serializer.validated_data,
        )
        return Response(ReturnItemSerializer(return_item).data)

    @extend_schema(
        operation_id="addCustomerReturnEvidence",
        tags=["Customer returns"],
        summary="Attach curated fictional evidence to an item",
        auth=VISITOR_WRITE_SECURITY,
        parameters=[RETURN_ID_PARAMETER, ITEM_ID_PARAMETER],
        request=EvidenceWriteSerializer,
        responses={
            201: EvidenceSerializer,
            **error_responses(400, 401, 403, 404, 409),
        },
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"items/(?P<item_id>[^/.]+)/evidence",
    )
    def add_evidence(self, request, pk=None, item_id=None):
        serializer = EvidenceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evidence = add_item_evidence(
            _visitor(request),
            pk,
            item_id,
            data=serializer.validated_data,
        )
        return Response(
            EvidenceSerializer(evidence).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        operation_id="deleteCustomerReturnEvidence",
        tags=["Customer returns"],
        summary="Remove evidence from an item",
        auth=VISITOR_WRITE_SECURITY,
        parameters=[
            RETURN_ID_PARAMETER,
            ITEM_ID_PARAMETER,
            EVIDENCE_ID_PARAMETER,
        ],
        responses={
            204: None,
            **error_responses(401, 403, 404, 409),
        },
    )
    @action(
        detail=True,
        methods=["delete"],
        url_path=(
            r"items/(?P<item_id>[^/.]+)/evidence/"
            r"(?P<evidence_id>[^/.]+)"
        ),
    )
    def delete_evidence(
        self,
        request,
        pk=None,
        item_id=None,
        evidence_id=None,
    ):
        delete_item_evidence(
            _visitor(request),
            pk,
            item_id,
            evidence_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class OperationsReturnViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    pagination_class = ReturnPageNumberPagination
    queryset = ReturnRequest.objects.none()
    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    @extend_schema(
        operation_id="listOperationsReturns",
        tags=["Operations queue"],
        summary="List non-draft returns for operational review",
        auth=VISITOR_SECURITY,
        parameters=[OperationsQueueQuerySerializer],
        responses={
            200: ReturnRequestSummarySerializer(many=True),
            **error_responses(400, 401),
        },
    )
    def list(self, request):
        visitor = _visitor(request)
        query = OperationsQueueQuerySerializer(
            data=request.query_params,
        )
        query.is_valid(raise_exception=True)
        values = query.validated_data
        queryset = operations_return_list(
            visitor,
            search=values["search"],
            status=values.get("status"),
            ordering=values["ordering"],
        )
        page = self.paginate_queryset(queryset)
        serializer = ReturnRequestSummarySerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        operation_id="retrieveOperationsReturn",
        tags=["Operations queue"],
        summary="Retrieve the expandable operations detail",
        auth=VISITOR_SECURITY,
        parameters=[RETURN_ID_PARAMETER],
        responses={
            200: ReturnRequestDetailSerializer,
            **error_responses(401, 404),
        },
    )
    def retrieve(self, request, pk=None):
        detail = operations_return_detail(_visitor(request), pk)
        return Response(ReturnRequestDetailSerializer(detail).data)

    @extend_schema(
        operation_id="transitionOperationsReturn",
        tags=["Operations queue"],
        summary="Apply an operations state transition",
        description=(
            "Transitions SUBMITTED to NEEDS_INFORMATION, APPROVED, or "
            "REJECTED. Notes are mandatory when requesting information or "
            "rejecting."
        ),
        auth=VISITOR_WRITE_SECURITY,
        parameters=[RETURN_ID_PARAMETER],
        request=OperationsTransitionSerializer,
        responses={
            200: ReturnRequestDetailSerializer,
            **error_responses(400, 401, 403, 404, 409),
        },
        examples=[
            OpenApiExample(
                "Request more information",
                value={
                    "target_status": "NEEDS_INFORMATION",
                    "note": "Add a fictional serial-number image.",
                },
                request_only=True,
            )
        ],
    )
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        visitor = _visitor(request)
        serializer = OperationsTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transition_return(
            visitor,
            pk,
            **serializer.validated_data,
        )
        detail = operations_return_detail(visitor, pk)
        return Response(ReturnRequestDetailSerializer(detail).data)
