from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from returns.models import (
    ReturnRequest,
    ReturnStatus,
    VisitorSession,
)
from returns.services.demo_dataset import (
    VisitorSessionUnavailable,
    reset_demo_dataset,
    seed_demo_dataset,
)


class DemoDatasetServiceTests(TestCase):
    def create_visitor(self) -> VisitorSession:
        return VisitorSession.objects.create(
            expires_at=timezone.now() + timedelta(hours=24),
        )

    def test_seed_creates_the_canonical_fictional_dataset(self):
        visitor = self.create_visitor()

        summary = seed_demo_dataset(visitor)

        self.assertEqual(summary.return_count, 14)
        self.assertEqual(summary.item_count, 22)
        self.assertEqual(summary.evidence_count, 25)
        self.assertEqual(summary.status_event_count, 37)
        self.assertEqual(
            set(
                ReturnRequest.objects.filter(
                    visitor_session=visitor,
                ).values_list("status", flat=True)
            ),
            {
                ReturnStatus.SUBMITTED,
                ReturnStatus.NEEDS_INFORMATION,
                ReturnStatus.APPROVED,
                ReturnStatus.REJECTED,
            },
        )

        featured = ReturnRequest.objects.get(
            visitor_session=visitor,
            reference="RTN-204",
        )
        total = sum(
            (item.line_total for item in featured.items.all()),
            start=Decimal("0.00"),
        )
        self.assertEqual(featured.items.count(), 2)
        self.assertEqual(total, Decimal("774.00"))
        self.assertTrue(
            featured.items.filter(evidence__isnull=False).exists(),
        )

    def test_seed_is_idempotent(self):
        visitor = self.create_visitor()

        first_summary = seed_demo_dataset(visitor)
        first_ids = set(
            visitor.return_requests.values_list("id", flat=True),
        )
        second_summary = seed_demo_dataset(visitor)
        second_ids = set(
            visitor.return_requests.values_list("id", flat=True),
        )

        self.assertEqual(first_summary, second_summary)
        self.assertEqual(first_ids, second_ids)
        self.assertEqual(len(second_ids), 14)

    def test_visitors_receive_independent_datasets(self):
        first_visitor = self.create_visitor()
        second_visitor = self.create_visitor()

        seed_demo_dataset(first_visitor)
        seed_demo_dataset(second_visitor)

        first_requests = ReturnRequest.objects.filter(
            visitor_session=first_visitor,
        )
        second_requests = ReturnRequest.objects.filter(
            visitor_session=second_visitor,
        )
        self.assertEqual(first_requests.count(), 14)
        self.assertEqual(second_requests.count(), 14)
        self.assertEqual(
            set(first_requests.values_list("reference", flat=True)),
            set(second_requests.values_list("reference", flat=True)),
        )
        self.assertTrue(
            set(first_requests.values_list("id", flat=True)).isdisjoint(
                second_requests.values_list("id", flat=True),
            )
        )

    def test_reset_replaces_only_the_selected_visitor_dataset(self):
        first_visitor = self.create_visitor()
        second_visitor = self.create_visitor()
        seed_demo_dataset(first_visitor)
        seed_demo_dataset(second_visitor)
        first_ids = set(
            first_visitor.return_requests.values_list("id", flat=True),
        )
        second_ids = set(
            second_visitor.return_requests.values_list("id", flat=True),
        )
        previous_expiry = first_visitor.expires_at

        summary = reset_demo_dataset(first_visitor)

        new_first_ids = set(
            first_visitor.return_requests.values_list("id", flat=True),
        )
        current_second_ids = set(
            second_visitor.return_requests.values_list("id", flat=True),
        )
        first_visitor.refresh_from_db()

        self.assertEqual(summary.return_count, 14)
        self.assertTrue(first_ids.isdisjoint(new_first_ids))
        self.assertEqual(second_ids, current_second_ids)
        self.assertGreater(first_visitor.expires_at, previous_expiry)

    def test_reset_rolls_back_deletion_when_reseeding_fails(self):
        visitor = self.create_visitor()
        seed_demo_dataset(visitor)
        original_ids = set(
            visitor.return_requests.values_list("id", flat=True),
        )

        with patch(
            "returns.services.demo_dataset._create_demo_dataset",
            side_effect=RuntimeError("simulated seed failure"),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "simulated seed failure",
            ):
                reset_demo_dataset(visitor)

        self.assertEqual(
            set(visitor.return_requests.values_list("id", flat=True)),
            original_ids,
        )

    def test_expired_or_missing_visitor_cannot_seed_or_reset(self):
        visitor = self.create_visitor()
        now = timezone.now()
        VisitorSession.objects.filter(id=visitor.id).update(
            created_at=now - timedelta(hours=25),
            expires_at=now - timedelta(hours=1),
        )
        visitor.refresh_from_db()

        with self.assertRaises(VisitorSessionUnavailable):
            seed_demo_dataset(visitor)
        with self.assertRaises(VisitorSessionUnavailable):
            reset_demo_dataset(visitor)

        missing_visitor = VisitorSession(
            expires_at=timezone.now() + timedelta(hours=24),
        )
        with self.assertRaises(VisitorSessionUnavailable):
            seed_demo_dataset(missing_visitor)
