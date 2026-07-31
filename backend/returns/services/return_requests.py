from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from returns.models import (
    Evidence,
    EventActor,
    ReturnItem,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
    VisitorSession,
)
from returns.services.transitions import ReturnRequestNotFound
from returns.services.visitor_sessions import VisitorSessionRequired


class ReturnRequestImmutable(Exception):
    code = "return_request_immutable"


class ReturnItemNotFound(LookupError):
    code = "return_item_not_found"


class EvidenceNotFound(LookupError):
    code = "evidence_not_found"


class EvidenceAlreadyAttached(Exception):
    code = "evidence_already_attached"


def _lock_active_visitor(visitor_id: UUID) -> VisitorSession:
    try:
        visitor = VisitorSession.objects.select_for_update().get(
            id=visitor_id,
        )
    except (ValidationError, ValueError, VisitorSession.DoesNotExist) as error:
        raise VisitorSessionRequired from error

    if visitor.expires_at <= timezone.now():
        raise VisitorSessionRequired
    return visitor


def _lock_return(
    visitor: VisitorSession,
    return_id: UUID | str,
) -> ReturnRequest:
    try:
        return ReturnRequest.objects.select_for_update().get(
            id=return_id,
            visitor_session=visitor,
        )
    except (
        ValidationError,
        ValueError,
        ReturnRequest.DoesNotExist,
    ) as error:
        raise ReturnRequestNotFound from error


def _lock_mutable_return(
    visitor: VisitorSession,
    return_id: UUID | str,
) -> ReturnRequest:
    return_request = _lock_return(visitor, return_id)
    if return_request.status not in {
        ReturnStatus.DRAFT,
        ReturnStatus.NEEDS_INFORMATION,
    }:
        raise ReturnRequestImmutable
    return return_request


def _get_item(
    return_request: ReturnRequest,
    item_id: UUID | str,
) -> ReturnItem:
    try:
        return ReturnItem.objects.get(
            id=item_id,
            return_request=return_request,
        )
    except (
        ValidationError,
        ValueError,
        ReturnItem.DoesNotExist,
    ) as error:
        raise ReturnItemNotFound from error


def _get_evidence(
    return_item: ReturnItem,
    evidence_id: UUID | str,
) -> Evidence:
    try:
        return Evidence.objects.get(
            id=evidence_id,
            return_item=return_item,
        )
    except (
        ValidationError,
        ValueError,
        Evidence.DoesNotExist,
    ) as error:
        raise EvidenceNotFound from error


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
def create_draft_return(
    visitor_session: VisitorSession,
    *,
    data: dict,
) -> ReturnRequest:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = ReturnRequest.objects.create(
        visitor_session=visitor,
        reference=_next_reference(visitor),
        status=ReturnStatus.DRAFT,
        **data,
    )
    StatusEvent.objects.create(
        return_request=return_request,
        from_status=None,
        to_status=ReturnStatus.DRAFT,
        actor=EventActor.SYSTEM,
    )
    return return_request


@transaction.atomic
def update_return_request(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    data: dict,
) -> ReturnRequest:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_mutable_return(visitor, return_id)
    for field, value in data.items():
        setattr(return_request, field, value)
    return_request.save(
        update_fields=(*data.keys(), "updated_at"),
    )
    return return_request


@transaction.atomic
def delete_draft_return(
    visitor_session: VisitorSession,
    return_id: UUID | str,
) -> None:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_return(visitor, return_id)
    if return_request.status != ReturnStatus.DRAFT:
        raise ReturnRequestImmutable
    return_request.delete()


@transaction.atomic
def add_return_item(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    data: dict,
) -> ReturnItem:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_mutable_return(visitor, return_id)
    return ReturnItem.objects.create(
        return_request=return_request,
        **data,
    )


@transaction.atomic
def update_return_item(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    item_id: UUID | str,
    *,
    data: dict,
) -> ReturnItem:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_mutable_return(visitor, return_id)
    return_item = _get_item(return_request, item_id)
    for field, value in data.items():
        setattr(return_item, field, value)
    return_item.save(update_fields=(*data.keys(), "updated_at"))
    return return_item


@transaction.atomic
def delete_return_item(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    item_id: UUID | str,
) -> None:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_mutable_return(visitor, return_id)
    _get_item(return_request, item_id).delete()


@transaction.atomic
def add_item_evidence(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    item_id: UUID | str,
    *,
    data: dict,
) -> Evidence:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_mutable_return(visitor, return_id)
    return_item = _get_item(return_request, item_id)
    if Evidence.objects.filter(
        return_item=return_item,
        asset_key=data["asset_key"],
    ).exists():
        raise EvidenceAlreadyAttached
    return Evidence.objects.create(
        return_item=return_item,
        **data,
    )


@transaction.atomic
def delete_item_evidence(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    item_id: UUID | str,
    evidence_id: UUID | str,
) -> None:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_mutable_return(visitor, return_id)
    return_item = _get_item(return_request, item_id)
    _get_evidence(return_item, evidence_id).delete()
