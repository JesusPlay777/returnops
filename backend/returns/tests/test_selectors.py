from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from returns.models import ReturnRequest, ReturnStatus, VisitorSession
from returns.selectors import (
    customer_return_detail,
    customer_return_list,
    operations_return_detail,
    operations_return_list,
)
from returns.services.demo_dataset import seed_demo_dataset
from returns.services.transitions import ReturnRequestNotFound
from returns.tests.test_transitions import create_visitor


class ReturnSelectorTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.first_visitor = create_visitor()
        cls.second_visitor = create_visitor()
        seed_demo_dataset(cls.first_visitor)
        seed_demo_dataset(cls.second_visitor)

    def test_customer_list_is_isolated_and_annotated(self):
        first_list = customer_return_list(self.first_visitor)
        second_ids = set(
            customer_return_list(self.second_visitor).values_list(
                "id",
                flat=True,
            )
        )

        self.assertEqual(first_list.count(), 14)
        self.assertTrue(
            set(first_list.values_list("id", flat=True)).isdisjoint(
                second_ids,
            )
        )
        featured = first_list.get(reference="RTN-204")
        self.assertEqual(featured.item_count, 2)
        self.assertEqual(str(featured.total_value), "774.00")

    def test_operations_queue_excludes_drafts(self):
        ReturnRequest.objects.create(
            visitor_session=self.first_visitor,
            reference="RTN-999",
            order_reference="ORD-999",
            customer_name="Draft Example",
            customer_email="draft@example.com",
            status=ReturnStatus.DRAFT,
        )

        self.assertEqual(
            customer_return_list(self.first_visitor).count(),
            15,
        )
        self.assertEqual(
            operations_return_list(self.first_visitor).count(),
            14,
        )
        self.assertFalse(
            operations_return_list(self.first_visitor).filter(
                status=ReturnStatus.DRAFT,
            ).exists()
        )

    def test_operations_filters_search_and_ordering(self):
        needs_information = operations_return_list(
            self.first_visitor,
            status=ReturnStatus.NEEDS_INFORMATION,
        )
        maya = operations_return_list(
            self.first_visitor,
            search="maya",
        )
        by_value = operations_return_list(
            self.first_visitor,
            ordering="-total_value",
        )

        self.assertEqual(needs_information.count(), 3)
        self.assertEqual(
            list(maya.values_list("reference", flat=True)),
            ["RTN-204"],
        )
        self.assertEqual(by_value.first().reference, "RTN-191")
        self.assertFalse(
            operations_return_list(
                self.first_visitor,
                status=ReturnStatus.DRAFT,
            ).exists()
        )

    def test_detail_prefetches_the_complete_hierarchy(self):
        return_id = operations_return_list(
            self.first_visitor,
            search="RTN-204",
        ).get().id

        with self.assertNumQueries(4):
            detail = customer_return_detail(
                self.first_visitor,
                return_id,
            )
            items = list(detail.items.all())
            evidence_count = sum(
                len(item.evidence.all())
                for item in items
            )
            events = list(detail.status_events.all())

        self.assertEqual(detail.item_count, 2)
        self.assertEqual(str(detail.total_value), "774.00")
        self.assertEqual(
            [item.sku for item in items],
            ["DMO-ARM-01", "DMO-CAM-02"],
        )
        self.assertEqual(
            [evidence.asset_key for evidence in items[0].evidence.all()],
            [
                "evidence/rtn-204-1-product_photo.webp",
                "evidence/rtn-204-1-serial_label.webp",
            ],
        )
        self.assertEqual(evidence_count, 3)
        self.assertEqual(len(events), 2)

    def test_cross_visitor_and_operations_draft_details_are_hidden(self):
        foreign_id = customer_return_list(
            self.second_visitor,
        ).first().id
        draft = ReturnRequest.objects.create(
            visitor_session=self.first_visitor,
            reference="RTN-999",
            order_reference="ORD-999",
            customer_name="Draft Example",
            customer_email="draft@example.com",
            status=ReturnStatus.DRAFT,
        )

        with self.assertRaises(ReturnRequestNotFound):
            customer_return_detail(self.first_visitor, foreign_id)
        with self.assertRaises(ReturnRequestNotFound):
            operations_return_detail(self.first_visitor, draft.id)
        self.assertEqual(
            customer_return_detail(
                self.first_visitor,
                draft.id,
            ).id,
            draft.id,
        )

    def test_expired_visitor_receives_no_data(self):
        now = timezone.now()
        VisitorSession.objects.filter(id=self.first_visitor.id).update(
            created_at=now - timedelta(hours=25),
            expires_at=now - timedelta(hours=1),
        )
        return_id = ReturnRequest.objects.filter(
            visitor_session=self.first_visitor,
        ).first().id

        self.assertFalse(
            customer_return_list(self.first_visitor).exists(),
        )
        with self.assertRaises(ReturnRequestNotFound):
            customer_return_detail(self.first_visitor, return_id)
