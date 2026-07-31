from decimal import Decimal
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db.models import (
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Prefetch,
    Q,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from returns.models import (
    Evidence,
    ReturnItem,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
    VisitorSession,
)
from returns.services.transitions import ReturnRequestNotFound


SUMMARY_VALUE_FIELD = DecimalField(max_digits=14, decimal_places=2)
ALLOWED_ORDERINGS = {
    "-updated_at",
    "updated_at",
    "-total_value",
    "total_value",
    "reference",
}


def _visitor_returns(visitor: VisitorSession):
    return ReturnRequest.objects.filter(
        visitor_session_id=visitor.id,
        visitor_session__expires_at__gt=timezone.now(),
    )


def _with_summary(queryset):
    line_total = ExpressionWrapper(
        F("items__quantity") * F("items__unit_price"),
        output_field=SUMMARY_VALUE_FIELD,
    )
    return queryset.annotate(
        item_count=Count("items"),
        total_value=Coalesce(
            Sum(line_total),
            Value(Decimal("0.00")),
            output_field=SUMMARY_VALUE_FIELD,
        ),
    )


def customer_return_list(visitor: VisitorSession):
    """Return only one active visitor's customer-facing summaries."""
    return _with_summary(_visitor_returns(visitor)).order_by(
        "-updated_at",
        "reference",
    )


def operations_return_list(
    visitor: VisitorSession,
    *,
    search: str = "",
    status: str | None = None,
    ordering: str = "-updated_at",
):
    """Build the isolated, non-draft Operations queue queryset."""
    queryset = _with_summary(
        _visitor_returns(visitor).exclude(status=ReturnStatus.DRAFT),
    )
    normalized_search = search.strip()
    if normalized_search:
        queryset = queryset.filter(
            Q(reference__icontains=normalized_search)
            | Q(customer_name__icontains=normalized_search)
        )
    if status:
        try:
            normalized_status = ReturnStatus(status)
        except (TypeError, ValueError):
            return queryset.none()
        if normalized_status == ReturnStatus.DRAFT:
            return queryset.none()
        queryset = queryset.filter(status=normalized_status)

    normalized_ordering = (
        ordering if ordering in ALLOWED_ORDERINGS else "-updated_at"
    )
    return queryset.order_by(normalized_ordering, "reference")


def _detail_queryset(visitor: VisitorSession):
    item_queryset = ReturnItem.objects.order_by(
        "created_at",
    ).prefetch_related(
        Prefetch(
            "evidence",
            queryset=Evidence.objects.order_by("created_at"),
        )
    )
    event_queryset = StatusEvent.objects.order_by("created_at")
    return _with_summary(_visitor_returns(visitor)).prefetch_related(
        Prefetch("items", queryset=item_queryset),
        Prefetch("status_events", queryset=event_queryset),
    )


def _get_return(queryset, return_id: UUID | str) -> ReturnRequest:
    try:
        return queryset.get(id=return_id)
    except (
        ValidationError,
        ValueError,
        ReturnRequest.DoesNotExist,
    ) as error:
        raise ReturnRequestNotFound from error


def customer_return_detail(
    visitor: VisitorSession,
    return_id: UUID | str,
) -> ReturnRequest:
    return _get_return(_detail_queryset(visitor), return_id)


def operations_return_detail(
    visitor: VisitorSession,
    return_id: UUID | str,
) -> ReturnRequest:
    queryset = _detail_queryset(visitor).exclude(
        status=ReturnStatus.DRAFT,
    )
    return _get_return(queryset, return_id)
