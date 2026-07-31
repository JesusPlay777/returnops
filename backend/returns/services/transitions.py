from dataclasses import dataclass
from typing import Iterable
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from returns.models import (
    EventActor,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
    VisitorSession,
)
from returns.services.visitor_sessions import VisitorSessionRequired


class ReturnRequestNotFound(LookupError):
    """Hide whether a return exists outside the current visitor scope."""

    code = "return_not_found"


class ReturnTransitionError(Exception):
    """Base class for transition rules that reject a domain command."""

    code = "return_transition_error"


class InvalidReturnTransition(ReturnTransitionError):
    code = "invalid_status_transition"

    def __init__(
        self,
        current_status: str,
        target_status: str,
    ) -> None:
        self.current_status = current_status
        self.target_status = target_status
        super().__init__(
            f"Cannot transition from {current_status} to {target_status}.",
        )


class ReturnItemsRequired(ReturnTransitionError):
    code = "return_items_required"


class TransitionNoteRequired(ReturnTransitionError):
    code = "transition_note_required"


class InvalidTransitionNote(ReturnTransitionError):
    code = "invalid_transition_note"


@dataclass(frozen=True, slots=True)
class TransitionResult:
    return_request: ReturnRequest
    status_event: StatusEvent


def _clean_note(note: str | None) -> str:
    if note is None:
        return ""
    if not isinstance(note, str):
        raise InvalidTransitionNote
    return note.strip()


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


def _lock_return_request(
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


@transaction.atomic
def _perform_transition(
    *,
    visitor_session: VisitorSession,
    return_id: UUID | str,
    allowed_sources: Iterable[ReturnStatus],
    target_status: ReturnStatus,
    actor: EventActor,
    note: str | None = None,
    note_required_from: Iterable[ReturnStatus] = (),
    items_required: bool = False,
) -> TransitionResult:
    visitor = _lock_active_visitor(visitor_session.id)
    return_request = _lock_return_request(visitor, return_id)
    current_status = ReturnStatus(return_request.status)
    allowed_source_values = set(allowed_sources)

    if current_status not in allowed_source_values:
        raise InvalidReturnTransition(
            current_status=current_status,
            target_status=target_status,
        )

    cleaned_note = _clean_note(note)
    if (
        current_status in set(note_required_from)
        and not cleaned_note
    ):
        raise TransitionNoteRequired

    if items_required and not return_request.items.exists():
        raise ReturnItemsRequired

    return_request.status = target_status
    return_request.save(update_fields=("status", "updated_at"))
    status_event = StatusEvent.objects.create(
        return_request=return_request,
        from_status=current_status,
        to_status=target_status,
        actor=actor,
        note=cleaned_note,
    )
    return TransitionResult(
        return_request=return_request,
        status_event=status_event,
    )


def submit_return(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    response_note: str | None = None,
) -> TransitionResult:
    """Submit a draft or resubmit a response requested by Operations."""
    return _perform_transition(
        visitor_session=visitor_session,
        return_id=return_id,
        allowed_sources=(
            ReturnStatus.DRAFT,
            ReturnStatus.NEEDS_INFORMATION,
        ),
        target_status=ReturnStatus.SUBMITTED,
        actor=EventActor.CUSTOMER,
        note=response_note,
        note_required_from=(ReturnStatus.NEEDS_INFORMATION,),
        items_required=True,
    )


def request_information(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    note: str | None,
) -> TransitionResult:
    return _perform_transition(
        visitor_session=visitor_session,
        return_id=return_id,
        allowed_sources=(ReturnStatus.SUBMITTED,),
        target_status=ReturnStatus.NEEDS_INFORMATION,
        actor=EventActor.OPERATIONS,
        note=note,
        note_required_from=(ReturnStatus.SUBMITTED,),
    )


def approve_return(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    note: str | None = None,
) -> TransitionResult:
    return _perform_transition(
        visitor_session=visitor_session,
        return_id=return_id,
        allowed_sources=(ReturnStatus.SUBMITTED,),
        target_status=ReturnStatus.APPROVED,
        actor=EventActor.OPERATIONS,
        note=note,
    )


def reject_return(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    note: str | None,
) -> TransitionResult:
    return _perform_transition(
        visitor_session=visitor_session,
        return_id=return_id,
        allowed_sources=(ReturnStatus.SUBMITTED,),
        target_status=ReturnStatus.REJECTED,
        actor=EventActor.OPERATIONS,
        note=note,
        note_required_from=(ReturnStatus.SUBMITTED,),
    )


def transition_return(
    visitor_session: VisitorSession,
    return_id: UUID | str,
    *,
    target_status: str,
    note: str | None = None,
) -> TransitionResult:
    """Dispatch a future Operations API command without trusting an actor."""
    operations = {
        ReturnStatus.NEEDS_INFORMATION: request_information,
        ReturnStatus.APPROVED: approve_return,
        ReturnStatus.REJECTED: reject_return,
    }
    try:
        normalized_target = ReturnStatus(target_status)
        operation = operations[normalized_target]
    except (KeyError, TypeError, ValueError) as error:
        raise InvalidReturnTransition(
            current_status=ReturnStatus.SUBMITTED,
            target_status=str(target_status),
        ) from error

    return operation(
        visitor_session,
        return_id,
        note=note,
    )
