from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from returns.models import (
    DemoOrder,
    DemoOrderItem,
    EventActor,
    ReturnItem,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
    VisitorSession,
)
from returns.services.visitor_sessions import VisitorSessionRequired


class DemoOrderNotFound(LookupError):
    code = "demo_order_not_found"


class DemoOrderUnavailable(Exception):
    code = "demo_order_unavailable"


class DemoOrderItemNotFound(LookupError):
    code = "demo_order_item_not_found"


class DemoOrderQuantityExceeded(Exception):
    code = "demo_order_quantity_exceeded"


class DemoOrderSelectionInvalid(Exception):
    code = "demo_order_selection_invalid"


def _lock_active_visitor(visitor_id: UUID) -> VisitorSession:
    try:
        visitor = VisitorSession.objects.select_for_update().get(id=visitor_id)
    except (ValidationError, ValueError, VisitorSession.DoesNotExist) as error:
        raise VisitorSessionRequired from error
    if visitor.expires_at <= timezone.now():
        raise VisitorSessionRequired
    return visitor


def _next_reference(visitor: VisitorSession) -> str:
    highest_number = 0
    references = ReturnRequest.objects.filter(
        visitor_session=visitor,
    ).values_list("reference", flat=True)
    for reference in references:
        try:
            highest_number = max(
                highest_number,
                int(reference.removeprefix("RTN-")),
            )
        except ValueError:
            continue
    return f"RTN-{highest_number + 1:03d}"


@transaction.atomic
def create_return_from_demo_order(
    visitor_session: VisitorSession,
    *,
    order_id: UUID,
    selections: list[dict],
) -> ReturnRequest:
    """Create a draft using only server-owned order and product values."""
    visitor = _lock_active_visitor(visitor_session.id)
    try:
        demo_order = DemoOrder.objects.select_for_update().get(
            id=order_id,
            visitor_session=visitor,
        )
    except (ValidationError, ValueError, DemoOrder.DoesNotExist) as error:
        raise DemoOrderNotFound from error

    if (
        not demo_order.return_eligible
        or ReturnRequest.objects.filter(demo_order=demo_order).exists()
    ):
        raise DemoOrderUnavailable

    selected_ids = [selection["order_item_id"] for selection in selections]
    if not selected_ids or len(selected_ids) != len(set(selected_ids)):
        raise DemoOrderSelectionInvalid

    catalog_items = {
        item.id: item
        for item in DemoOrderItem.objects.select_for_update().filter(
            demo_order=demo_order,
        )
    }
    selected_items: list[tuple[DemoOrderItem, dict]] = []
    for selection in selections:
        catalog_item = catalog_items.get(selection["order_item_id"])
        if catalog_item is None:
            raise DemoOrderItemNotFound
        if selection["quantity"] > catalog_item.quantity:
            raise DemoOrderQuantityExceeded
        selected_items.append((catalog_item, selection))

    return_request = ReturnRequest.objects.create(
        visitor_session=visitor,
        demo_order=demo_order,
        reference=_next_reference(visitor),
        order_reference=demo_order.order_reference,
        customer_name=demo_order.customer_name,
        customer_email=demo_order.customer_email,
        currency=demo_order.currency,
        status=ReturnStatus.DRAFT,
    )
    ReturnItem.objects.bulk_create(
        ReturnItem(
            return_request=return_request,
            demo_order_item=catalog_item,
            sku=catalog_item.sku,
            product_name=catalog_item.product_name,
            quantity=selection["quantity"],
            unit_price=catalog_item.unit_price,
            reason=selection["reason"],
            details=selection.get("details", ""),
        )
        for catalog_item, selection in selected_items
    )
    StatusEvent.objects.create(
        return_request=return_request,
        from_status=None,
        to_status=ReturnStatus.DRAFT,
        actor=EventActor.SYSTEM,
    )
    return return_request
