from dataclasses import dataclass
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from returns.demo_data import (
    DEMO_ORDERS,
    DEMO_RETURNS,
    DemoReturnDefinition,
)
from returns.models import (
    DemoOrder,
    DemoOrderItem,
    Evidence,
    EventActor,
    ReturnItem,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
    VisitorSession,
)
from returns.services.visitor_sessions import visitor_session_ttl


class VisitorSessionUnavailable(LookupError):
    """Raised when seed/reset receives a missing or expired visitor."""

    code = "visitor_session_required"


@dataclass(frozen=True, slots=True)
class DemoDatasetSummary:
    order_count: int
    order_item_count: int
    return_count: int
    item_count: int
    evidence_count: int
    status_event_count: int


def _lock_active_visitor(visitor_id) -> VisitorSession:
    try:
        visitor = VisitorSession.objects.select_for_update().get(
            id=visitor_id,
        )
    except VisitorSession.DoesNotExist as error:
        raise VisitorSessionUnavailable from error

    if visitor.expires_at <= timezone.now():
        raise VisitorSessionUnavailable
    return visitor


def _dataset_summary(visitor: VisitorSession) -> DemoDatasetSummary:
    requests = ReturnRequest.objects.filter(visitor_session=visitor)
    return DemoDatasetSummary(
        order_count=DemoOrder.objects.filter(
            visitor_session=visitor,
        ).count(),
        order_item_count=DemoOrderItem.objects.filter(
            demo_order__visitor_session=visitor,
        ).count(),
        return_count=requests.count(),
        item_count=ReturnItem.objects.filter(
            return_request__visitor_session=visitor,
        ).count(),
        evidence_count=Evidence.objects.filter(
            return_item__return_request__visitor_session=visitor,
        ).count(),
        status_event_count=StatusEvent.objects.filter(
            return_request__visitor_session=visitor,
        ).count(),
    )


def _set_created_at(instance, created_at: datetime) -> None:
    type(instance).objects.filter(id=instance.id).update(
        created_at=created_at,
    )


def _create_status_events(
    return_request: ReturnRequest,
    definition: DemoReturnDefinition,
    created_at: datetime,
    updated_at: datetime,
) -> None:
    initial_event = StatusEvent.objects.create(
        return_request=return_request,
        from_status=None,
        to_status=ReturnStatus.DRAFT,
        actor=EventActor.SYSTEM,
    )
    _set_created_at(initial_event, created_at)

    if definition.status == ReturnStatus.SUBMITTED:
        submitted_at = updated_at
    else:
        submitted_at = created_at + ((updated_at - created_at) / 2)

    submitted_event = StatusEvent.objects.create(
        return_request=return_request,
        from_status=ReturnStatus.DRAFT,
        to_status=ReturnStatus.SUBMITTED,
        actor=EventActor.CUSTOMER,
    )
    _set_created_at(submitted_event, submitted_at)

    if definition.status == ReturnStatus.SUBMITTED:
        return

    notes = {
        ReturnStatus.NEEDS_INFORMATION: (
            "Please add one more piece of fictional product evidence."
        ),
        ReturnStatus.APPROVED: "",
        ReturnStatus.REJECTED: (
            "The fictional return falls outside the demo policy."
        ),
    }
    final_event = StatusEvent.objects.create(
        return_request=return_request,
        from_status=ReturnStatus.SUBMITTED,
        to_status=definition.status,
        actor=EventActor.OPERATIONS,
        note=notes[definition.status],
    )
    _set_created_at(final_event, updated_at)


def _create_demo_orders(visitor: VisitorSession) -> None:
    now = timezone.now()
    for definition in DEMO_ORDERS:
        demo_order = DemoOrder.objects.create(
            visitor_session=visitor,
            order_reference=definition.order_reference,
            customer_name=definition.customer_name,
            customer_email=definition.customer_email,
            placed_at=now - timedelta(days=definition.placed_days_ago),
            return_eligible=True,
        )
        DemoOrderItem.objects.bulk_create(
            DemoOrderItem(
                demo_order=demo_order,
                sku=item_definition.sku,
                product_name=item_definition.product_name,
                quantity=item_definition.quantity,
                unit_price=item_definition.unit_price,
            )
            for item_definition in definition.items
        )


def _create_demo_returns(visitor: VisitorSession) -> None:
    now = timezone.now()

    for definition in DEMO_RETURNS:
        updated_at = now - timedelta(
            minutes=definition.updated_minutes_ago,
        )
        created_at = updated_at - timedelta(hours=2)
        return_request = ReturnRequest.objects.create(
            visitor_session=visitor,
            reference=definition.reference,
            order_reference=definition.order_reference,
            customer_name=definition.customer_name,
            customer_email=definition.customer_email,
            status=definition.status,
        )
        ReturnRequest.objects.filter(id=return_request.id).update(
            created_at=created_at,
            updated_at=updated_at,
        )

        for item_position, item_definition in enumerate(
            definition.items,
            start=1,
        ):
            return_item = ReturnItem.objects.create(
                return_request=return_request,
                sku=item_definition.sku,
                product_name=item_definition.product_name,
                quantity=item_definition.quantity,
                unit_price=item_definition.unit_price,
                reason=item_definition.reason,
                details=item_definition.details,
            )
            item_created_at = created_at + timedelta(minutes=10)
            ReturnItem.objects.filter(id=return_item.id).update(
                created_at=item_created_at,
                updated_at=item_created_at,
            )

            for evidence_kind in item_definition.evidence_kinds:
                evidence = Evidence.objects.create(
                    return_item=return_item,
                    kind=evidence_kind,
                    asset_key=(
                        f"evidence/{definition.reference.lower()}-"
                        f"{item_position}-{evidence_kind.lower()}.webp"
                    ),
                    caption=f"Fictional {evidence_kind.label.lower()}",
                )
                _set_created_at(
                    evidence,
                    item_created_at + timedelta(minutes=5),
                )

        _create_status_events(
            return_request,
            definition,
            created_at,
            updated_at,
        )


def _create_demo_dataset(
    visitor: VisitorSession,
) -> DemoDatasetSummary:
    _create_demo_orders(visitor)
    _create_demo_returns(visitor)
    return _dataset_summary(visitor)


@transaction.atomic
def seed_demo_dataset(
    visitor_session: VisitorSession,
) -> DemoDatasetSummary:
    """Idempotently create the canonical dataset for one active visitor."""
    visitor = _lock_active_visitor(visitor_session.id)
    if not visitor.demo_orders.exists():
        _create_demo_orders(visitor)
    if not visitor.return_requests.exists():
        _create_demo_returns(visitor)
    return _dataset_summary(visitor)


@transaction.atomic
def reset_demo_dataset(
    visitor_session: VisitorSession,
) -> DemoDatasetSummary:
    """Atomically replace only one visitor's data and refresh its expiry."""
    visitor = _lock_active_visitor(visitor_session.id)
    visitor.return_requests.all().delete()
    visitor.demo_orders.all().delete()
    summary = _create_demo_dataset(visitor)

    visitor.expires_at = timezone.now() + visitor_session_ttl()
    visitor.save(update_fields=("expires_at",))
    return summary
