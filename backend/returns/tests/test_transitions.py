from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest.mock import patch

from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from returns.models import (
    EventActor,
    ReturnItem,
    ReturnReason,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
    VisitorSession,
)
from returns.services.transitions import (
    InvalidReturnTransition,
    ReturnItemsRequired,
    ReturnRequestNotFound,
    TransitionNoteRequired,
    approve_return,
    reject_return,
    request_information,
    submit_return,
    transition_return,
)
from returns.services.visitor_sessions import VisitorSessionRequired


def create_visitor() -> VisitorSession:
    return VisitorSession.objects.create(
        expires_at=timezone.now() + timedelta(hours=24),
    )


def create_return(
    visitor: VisitorSession,
    status: ReturnStatus,
    *,
    reference: str = "RTN-900",
    with_item: bool = True,
) -> ReturnRequest:
    return_request = ReturnRequest.objects.create(
        visitor_session=visitor,
        reference=reference,
        order_reference=f"ORD-{reference[4:]}",
        customer_name="Jordan Example",
        customer_email="jordan@example.com",
        status=status,
    )
    StatusEvent.objects.create(
        return_request=return_request,
        from_status=None,
        to_status=ReturnStatus.DRAFT,
        actor=EventActor.SYSTEM,
    )

    if status != ReturnStatus.DRAFT:
        StatusEvent.objects.create(
            return_request=return_request,
            from_status=ReturnStatus.DRAFT,
            to_status=ReturnStatus.SUBMITTED,
            actor=EventActor.CUSTOMER,
        )

    if status not in {ReturnStatus.DRAFT, ReturnStatus.SUBMITTED}:
        notes = {
            ReturnStatus.NEEDS_INFORMATION: "More fictional evidence needed.",
            ReturnStatus.APPROVED: "",
            ReturnStatus.REJECTED: "Rejected by the fictional demo policy.",
        }
        StatusEvent.objects.create(
            return_request=return_request,
            from_status=ReturnStatus.SUBMITTED,
            to_status=status,
            actor=EventActor.OPERATIONS,
            note=notes[status],
        )

    if with_item:
        ReturnItem.objects.create(
            return_request=return_request,
            sku=f"SKU-{reference[4:]}",
            product_name="Fictional test product",
            quantity=1,
            unit_price="25.00",
            reason=ReturnReason.DAMAGED,
        )
    return return_request


class ReturnTransitionTests(TestCase):
    def test_customer_submits_a_draft_with_items(self):
        visitor = create_visitor()
        return_request = create_return(visitor, ReturnStatus.DRAFT)

        result = submit_return(visitor, return_request.id)

        return_request.refresh_from_db()
        self.assertEqual(return_request.status, ReturnStatus.SUBMITTED)
        self.assertEqual(
            result.status_event.from_status,
            ReturnStatus.DRAFT,
        )
        self.assertEqual(
            result.status_event.to_status,
            ReturnStatus.SUBMITTED,
        )
        self.assertEqual(result.status_event.actor, EventActor.CUSTOMER)
        self.assertEqual(return_request.status_events.count(), 2)

    def test_submit_requires_at_least_one_item(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.DRAFT,
            with_item=False,
        )

        with self.assertRaises(ReturnItemsRequired):
            submit_return(visitor, return_request.id)

        return_request.refresh_from_db()
        self.assertEqual(return_request.status, ReturnStatus.DRAFT)
        self.assertEqual(return_request.status_events.count(), 1)

    def test_customer_resubmission_requires_and_normalizes_a_note(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.NEEDS_INFORMATION,
        )

        with self.assertRaises(TransitionNoteRequired):
            submit_return(
                visitor,
                return_request.id,
                response_note="   ",
            )

        result = submit_return(
            visitor,
            return_request.id,
            response_note="  Added fictional evidence.  ",
        )

        return_request.refresh_from_db()
        self.assertEqual(return_request.status, ReturnStatus.SUBMITTED)
        self.assertEqual(
            result.status_event.note,
            "Added fictional evidence.",
        )
        self.assertEqual(return_request.status_events.count(), 4)

    def test_request_information_requires_a_note(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
        )

        with self.assertRaises(TransitionNoteRequired):
            request_information(
                visitor,
                return_request.id,
                note=" ",
            )

        result = request_information(
            visitor,
            return_request.id,
            note="  Add a fictional serial label. ",
        )

        return_request.refresh_from_db()
        self.assertEqual(
            return_request.status,
            ReturnStatus.NEEDS_INFORMATION,
        )
        self.assertEqual(
            result.status_event.note,
            "Add a fictional serial label.",
        )
        self.assertEqual(result.status_event.actor, EventActor.OPERATIONS)

    def test_operations_can_approve_or_reject_submitted_returns(self):
        visitor = create_visitor()
        approval = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
            reference="RTN-901",
        )
        rejection = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
            reference="RTN-902",
        )

        approved = approve_return(
            visitor,
            approval.id,
            note="  Reviewed.  ",
        )
        with self.assertRaises(TransitionNoteRequired):
            reject_return(visitor, rejection.id, note="")
        rejected = reject_return(
            visitor,
            rejection.id,
            note="  Outside fictional policy. ",
        )

        approval.refresh_from_db()
        rejection.refresh_from_db()
        self.assertEqual(approval.status, ReturnStatus.APPROVED)
        self.assertEqual(rejection.status, ReturnStatus.REJECTED)
        self.assertEqual(approved.status_event.note, "Reviewed.")
        self.assertEqual(
            rejected.status_event.note,
            "Outside fictional policy.",
        )

    def test_terminal_and_stale_transitions_are_rejected_unchanged(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.APPROVED,
        )
        event_count = return_request.status_events.count()

        with self.assertRaises(InvalidReturnTransition) as error:
            reject_return(
                visitor,
                return_request.id,
                note="Try another decision.",
            )

        return_request.refresh_from_db()
        self.assertEqual(return_request.status, ReturnStatus.APPROVED)
        self.assertEqual(return_request.status_events.count(), event_count)
        self.assertEqual(
            error.exception.code,
            "invalid_status_transition",
        )

    def test_operations_dispatcher_accepts_only_decision_targets(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
        )

        with self.assertRaises(InvalidReturnTransition):
            transition_return(
                visitor,
                return_request.id,
                target_status=ReturnStatus.DRAFT,
            )

        result = transition_return(
            visitor,
            return_request.id,
            target_status=ReturnStatus.APPROVED,
        )
        self.assertEqual(
            result.return_request.status,
            ReturnStatus.APPROVED,
        )

    def test_cross_visitor_return_is_indistinguishable_from_missing(self):
        first_visitor = create_visitor()
        second_visitor = create_visitor()
        second_return = create_return(
            second_visitor,
            ReturnStatus.SUBMITTED,
        )

        with self.assertRaises(ReturnRequestNotFound):
            approve_return(first_visitor, second_return.id)
        with self.assertRaises(ReturnRequestNotFound):
            approve_return(first_visitor, "00000000-0000-0000-0000-000000000000")

        second_return.refresh_from_db()
        self.assertEqual(second_return.status, ReturnStatus.SUBMITTED)
        self.assertEqual(second_return.status_events.count(), 2)

    def test_expired_visitor_cannot_transition_a_return(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
        )
        now = timezone.now()
        VisitorSession.objects.filter(id=visitor.id).update(
            created_at=now - timedelta(hours=25),
            expires_at=now - timedelta(hours=1),
        )

        with self.assertRaises(VisitorSessionRequired):
            approve_return(visitor, return_request.id)

        return_request.refresh_from_db()
        self.assertEqual(return_request.status, ReturnStatus.SUBMITTED)

    def test_status_update_rolls_back_if_event_creation_fails(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
        )
        event_count = return_request.status_events.count()

        with patch(
            "returns.services.transitions.StatusEvent.objects.create",
            side_effect=RuntimeError("simulated event failure"),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "simulated event failure",
            ):
                approve_return(visitor, return_request.id)

        return_request.refresh_from_db()
        self.assertEqual(return_request.status, ReturnStatus.SUBMITTED)
        self.assertEqual(return_request.status_events.count(), event_count)


class ReturnTransitionConcurrencyTests(TransactionTestCase):
    def test_simultaneous_decisions_produce_one_winner(self):
        visitor = create_visitor()
        return_request = create_return(
            visitor,
            ReturnStatus.SUBMITTED,
        )
        barrier = Barrier(2)

        def decide(action: str) -> str:
            close_old_connections()
            thread_visitor = VisitorSession.objects.get(id=visitor.id)
            barrier.wait()
            try:
                if action == "approve":
                    approve_return(thread_visitor, return_request.id)
                else:
                    reject_return(
                        thread_visitor,
                        return_request.id,
                        note="Concurrent fictional rejection.",
                    )
                return "success"
            except InvalidReturnTransition:
                return "conflict"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(
                executor.map(decide, ("approve", "reject")),
            )

        return_request.refresh_from_db()
        self.assertCountEqual(results, ("success", "conflict"))
        self.assertIn(
            return_request.status,
            {ReturnStatus.APPROVED, ReturnStatus.REJECTED},
        )
        self.assertEqual(
            return_request.status_events.filter(
                from_status=ReturnStatus.SUBMITTED,
            ).count(),
            1,
        )
