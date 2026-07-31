from django.test import TestCase

from returns.models import DemoOrder, ReturnReason, ReturnStatus
from returns.services.catalog_orders import (
    DemoOrderItemNotFound,
    DemoOrderNotFound,
    DemoOrderQuantityExceeded,
    DemoOrderSelectionInvalid,
    DemoOrderUnavailable,
    create_return_from_demo_order,
)
from returns.services.demo_dataset import seed_demo_dataset
from returns.tests.test_transitions import create_visitor


class CatalogOrderServiceTests(TestCase):
    def setUp(self):
        self.visitor = create_visitor()
        seed_demo_dataset(self.visitor)

    def selection(self, order, item=None, *, quantity=1):
        item = item or order.items.first()
        return [
            {
                "order_item_id": item.id,
                "quantity": quantity,
                "reason": ReturnReason.DAMAGED,
                "details": "Fictional damage.",
            }
        ]

    def test_creation_copies_server_owned_customer_product_and_price(self):
        order = DemoOrder.objects.get(
            visitor_session=self.visitor,
            order_reference="ORD-90001",
        )
        order_item = order.items.first()

        return_request = create_return_from_demo_order(
            self.visitor,
            order_id=order.id,
            selections=self.selection(order, order_item),
        )

        return_item = return_request.items.get()
        self.assertEqual(return_request.status, ReturnStatus.DRAFT)
        self.assertEqual(return_request.order_reference, order.order_reference)
        self.assertEqual(return_request.customer_name, order.customer_name)
        self.assertEqual(return_request.customer_email, order.customer_email)
        self.assertEqual(return_item.sku, order_item.sku)
        self.assertEqual(return_item.product_name, order_item.product_name)
        self.assertEqual(return_item.unit_price, order_item.unit_price)
        self.assertEqual(return_request.status_events.count(), 1)

    def test_order_can_be_used_only_once(self):
        order = DemoOrder.objects.get(
            visitor_session=self.visitor,
            order_reference="ORD-90001",
        )
        selections = self.selection(order)
        create_return_from_demo_order(
            self.visitor,
            order_id=order.id,
            selections=selections,
        )

        with self.assertRaises(DemoOrderUnavailable):
            create_return_from_demo_order(
                self.visitor,
                order_id=order.id,
                selections=selections,
            )

    def test_service_rejects_empty_or_duplicate_selections(self):
        order = DemoOrder.objects.get(
            visitor_session=self.visitor,
            order_reference="ORD-90001",
        )
        selection = self.selection(order)[0]

        for invalid in ([], [selection, selection]):
            with self.subTest(invalid=invalid):
                with self.assertRaises(DemoOrderSelectionInvalid):
                    create_return_from_demo_order(
                        self.visitor,
                        order_id=order.id,
                        selections=invalid,
                    )

    def test_item_must_belong_to_order_and_quantity_cannot_exceed_purchase(self):
        first_order = DemoOrder.objects.get(
            visitor_session=self.visitor,
            order_reference="ORD-90001",
        )
        second_order = DemoOrder.objects.get(
            visitor_session=self.visitor,
            order_reference="ORD-90002",
        )

        with self.assertRaises(DemoOrderItemNotFound):
            create_return_from_demo_order(
                self.visitor,
                order_id=first_order.id,
                selections=self.selection(
                    first_order,
                    second_order.items.first(),
                ),
            )

        with self.assertRaises(DemoOrderQuantityExceeded):
            create_return_from_demo_order(
                self.visitor,
                order_id=first_order.id,
                selections=self.selection(first_order, quantity=99),
            )

    def test_catalog_is_isolated_by_visitor(self):
        other_visitor = create_visitor()
        seed_demo_dataset(other_visitor)
        foreign_order = DemoOrder.objects.filter(
            visitor_session=other_visitor,
        ).first()

        with self.assertRaises(DemoOrderNotFound):
            create_return_from_demo_order(
                self.visitor,
                order_id=foreign_order.id,
                selections=self.selection(foreign_order),
            )
