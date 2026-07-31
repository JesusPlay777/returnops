import uuid

from django.test import TestCase

from returns.api.serializers import (
    CatalogReturnCreateSerializer,
    EvidenceWriteSerializer,
    OperationsQueueQuerySerializer,
    OperationsTransitionSerializer,
    ReturnItemUpdateSerializer,
    ReturnRequestDetailSerializer,
    ReturnRequestSummarySerializer,
    SubmitReturnSerializer,
)
from returns.selectors import (
    customer_return_detail,
    operations_return_list,
)
from returns.services.demo_dataset import seed_demo_dataset
from returns.tests.test_transitions import create_visitor


class ReturnAPISerializerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.visitor = create_visitor()
        seed_demo_dataset(cls.visitor)

    def test_summary_serializes_annotated_money_as_a_string(self):
        return_request = operations_return_list(
            self.visitor,
            search="RTN-204",
        ).get()

        data = ReturnRequestSummarySerializer(return_request).data

        self.assertEqual(data["reference"], "RTN-204")
        self.assertEqual(data["item_count"], 2)
        self.assertEqual(data["total_value"], "774.00")
        self.assertEqual(data["currency"], "USD")

    def test_detail_contains_items_evidence_and_timeline(self):
        return_request = customer_return_detail(
            self.visitor,
            operations_return_list(
                self.visitor,
                search="RTN-204",
            ).get().id,
        )

        data = ReturnRequestDetailSerializer(return_request).data

        self.assertEqual(data["reference"], "RTN-204")
        self.assertEqual(data["item_count"], 2)
        self.assertEqual(data["total_value"], "774.00")
        self.assertEqual(len(data["items"]), 2)
        self.assertGreaterEqual(len(data["items"][0]["evidence"]), 1)
        self.assertEqual(len(data["status_events"]), 2)

    def test_catalog_return_rejects_server_controlled_fields(self):
        serializer = CatalogReturnCreateSerializer(
            data={
                "order_id": str(uuid.uuid4()),
                "items": [
                    {
                        "order_item_id": str(uuid.uuid4()),
                        "quantity": 1,
                        "reason": "DAMAGED",
                    }
                ],
                "order_reference": "ORD-90001",
                "customer_name": "Taylor Example",
                "customer_email": "taylor@example.com",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            set(serializer.errors),
            {
                "order_reference",
                "customer_name",
                "customer_email",
            },
        )
        self.assertTrue(
            all(
                errors[0].code == "unknown_field"
                for errors in serializer.errors.values()
            )
        )

    def test_valid_catalog_selection_normalizes_details(self):
        order_id = uuid.uuid4()
        order_item_id = uuid.uuid4()
        serializer = CatalogReturnCreateSerializer(
            data={
                "order_id": str(order_id),
                "items": [
                    {
                        "order_item_id": str(order_item_id),
                        "quantity": 1,
                        "reason": "DAMAGED",
                        "details": "  Fictional damage.  ",
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["order_id"], order_id)
        self.assertEqual(
            serializer.validated_data["items"][0]["order_item_id"],
            order_item_id,
        )
        self.assertEqual(
            serializer.validated_data["items"][0]["details"],
            "Fictional damage.",
        )

    def test_item_update_rejects_server_owned_product_fields(self):
        serializer = ReturnItemUpdateSerializer(
            data={
                "sku": "DMO-TEST",
                "product_name": "Fictional item",
                "quantity": 1,
                "unit_price": "1.00",
                "reason": "DAMAGED",
                "details": "",
                "return_request": "untrusted-parent",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            set(serializer.errors),
            {"sku", "product_name", "unit_price", "return_request"},
        )

        serializer = ReturnItemUpdateSerializer(
            data={
                "quantity": 0,
                "reason": "NOT_REAL",
                "details": "",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            set(serializer.errors),
            {"quantity", "reason"},
        )

    def test_evidence_write_rejects_parent_and_invalid_asset_key(self):
        serializer = EvidenceWriteSerializer(
            data={
                "kind": "PRODUCT_PHOTO",
                "asset_key": "../../private-file.jpg",
                "caption": "Fictional evidence",
                "return_item": "untrusted-parent",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors), {"return_item"})

        serializer = EvidenceWriteSerializer(
            data={
                "kind": "PRODUCT_PHOTO",
                "asset_key": "../../private-file.jpg",
                "caption": "Fictional evidence",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors), {"asset_key"})

    def test_transition_payload_requires_notes_for_specific_decisions(self):
        needs_information = OperationsTransitionSerializer(
            data={"target_status": "NEEDS_INFORMATION", "note": " "},
        )
        rejected = OperationsTransitionSerializer(
            data={"target_status": "REJECTED"},
        )
        approved = OperationsTransitionSerializer(
            data={"target_status": "APPROVED"},
        )

        self.assertFalse(needs_information.is_valid())
        self.assertEqual(
            needs_information.errors["note"][0].code,
            "transition_note_required",
        )
        self.assertFalse(rejected.is_valid())
        self.assertTrue(approved.is_valid(), approved.errors)

    def test_submit_and_queue_query_payloads_are_normalized(self):
        submit = SubmitReturnSerializer(
            data={"response_note": "  Added evidence.  "},
        )
        query = OperationsQueueQuerySerializer(
            data={
                "search": "  Maya ",
                "status": "SUBMITTED",
                "ordering": "-total_value",
                "page": 2,
            }
        )

        self.assertTrue(submit.is_valid(), submit.errors)
        self.assertEqual(
            submit.validated_data["response_note"],
            "Added evidence.",
        )
        self.assertTrue(query.is_valid(), query.errors)
        self.assertEqual(query.validated_data["search"], "Maya")
        self.assertEqual(query.validated_data["page"], 2)
