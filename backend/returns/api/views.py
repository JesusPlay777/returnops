from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from returns.api.pagination import ReturnPageNumberPagination
from returns.api.serializers import (
    DemoResetResponseSerializer,
    EvidenceSerializer,
    EvidenceWriteSerializer,
    OperationsQueueQuerySerializer,
    OperationsTransitionSerializer,
    ReturnItemSerializer,
    ReturnItemWriteSerializer,
    ReturnRequestDetailSerializer,
    ReturnRequestSummarySerializer,
    ReturnRequestWriteSerializer,
    SubmitReturnSerializer,
    VisitorSessionResponseSerializer,
)
from returns.models import ReturnRequest
from returns.selectors import (
    customer_return_detail,
    customer_return_list,
    operations_return_detail,
    operations_return_list,
)
from returns.services.demo_dataset import (
    reset_demo_dataset,
    seed_demo_dataset,
)
from returns.services.return_requests import (
    add_item_evidence,
    add_return_item,
    create_draft_return,
    delete_draft_return,
    delete_item_evidence,
    delete_return_item,
    update_return_item,
    update_return_request,
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

    def list(self, request):
        visitor = _visitor(request)
        queryset = customer_return_list(visitor)
        page = self.paginate_queryset(queryset)
        serializer = ReturnRequestSummarySerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def create(self, request):
        visitor = _visitor(request)
        serializer = ReturnRequestWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return_request = create_draft_return(
            visitor,
            data=serializer.validated_data,
        )
        detail = customer_return_detail(visitor, return_request.id)
        return Response(
            ReturnRequestDetailSerializer(detail).data,
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        detail = customer_return_detail(_visitor(request), pk)
        return Response(ReturnRequestDetailSerializer(detail).data)

    def partial_update(self, request, pk=None):
        visitor = _visitor(request)
        serializer = ReturnRequestWriteSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        update_return_request(
            visitor,
            pk,
            data=serializer.validated_data,
        )
        detail = customer_return_detail(visitor, pk)
        return Response(ReturnRequestDetailSerializer(detail).data)

    def destroy(self, request, pk=None):
        delete_draft_return(_visitor(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

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

    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):
        serializer = ReturnItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return_item = add_return_item(
            _visitor(request),
            pk,
            data=serializer.validated_data,
        )
        return Response(
            ReturnItemSerializer(return_item).data,
            status=status.HTTP_201_CREATED,
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

        serializer = ReturnItemWriteSerializer(
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

    def retrieve(self, request, pk=None):
        detail = operations_return_detail(_visitor(request), pk)
        return Response(ReturnRequestDetailSerializer(detail).data)

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
