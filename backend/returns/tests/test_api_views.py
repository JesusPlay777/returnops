from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from returns.models import ReturnRequest, VisitorSession
from returns.services.visitor_sessions import VISITOR_SESSION_KEY


class ReturnAPIIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def bootstrap(self, client=None):
        client = client or self.client
        response = client.get(reverse("returns-api:session"))
        self.assertEqual(response.status_code, 200, response.data)
        token = client.cookies[settings.CSRF_COOKIE_NAME].value
        return response, token

    def visitor_for(self, client=None) -> VisitorSession:
        client = client or self.client
        return VisitorSession.objects.get(
            id=client.session[VISITOR_SESSION_KEY],
        )

    def catalog_selection(self, client=None, order_index=0, item_index=0):
        client = client or self.client
        response = client.get(reverse("returns-api:demo-orders"))
        self.assertEqual(response.status_code, 200, response.data)
        order = response.data[order_index]
        item = order["items"][item_index]
        return order, {
            "order_id": order["id"],
            "items": [
                {
                    "order_item_id": item["id"],
                    "quantity": 1,
                    "reason": "DAMAGED",
                    "details": "Fictional damage.",
                }
            ],
        }

    def test_session_bootstraps_once_without_exposing_ownership(self):
        first_response, _ = self.bootstrap()
        visitor = self.visitor_for()
        first_ids = set(
            visitor.return_requests.values_list("id", flat=True),
        )

        second_response, _ = self.bootstrap()

        self.assertEqual(
            first_response.data,
            second_response.data,
        )
        self.assertNotIn("id", first_response.data)
        self.assertNotIn("visitor_session", first_response.data)
        self.assertEqual(
            first_response.data["available_roles"],
            ["CUSTOMER", "OPERATIONS"],
        )
        self.assertEqual(
            first_response.data["supported_locales"],
            ["en", "es"],
        )
        self.assertTrue(first_response.data["dataset_ready"])
        self.assertEqual(VisitorSession.objects.count(), 1)
        self.assertEqual(
            set(visitor.return_requests.values_list("id", flat=True)),
            first_ids,
        )
        self.assertIn(settings.SESSION_COOKIE_NAME, self.client.cookies)
        self.assertIn(settings.CSRF_COOKIE_NAME, self.client.cookies)

    def test_domain_routes_require_bootstrap(self):
        customer = self.client.get(
            reverse("returns-api:customer-return-list"),
        )
        operations = self.client.get(
            reverse("returns-api:operations-return-list"),
        )
        demo_orders = self.client.get(reverse("returns-api:demo-orders"))

        for response in (customer, operations, demo_orders):
            with self.subTest(path=response.request["PATH_INFO"]):
                self.assertEqual(response.status_code, 401)
                self.assertEqual(
                    response.data["code"],
                    "visitor_session_required",
                )

    def test_writes_require_csrf_token(self):
        _, token = self.bootstrap()
        reset_url = reverse("returns-api:demo-reset")

        rejected = self.client.post(reset_url, {}, format="json")
        accepted = self.client.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(rejected.status_code, 403)
        self.assertEqual(
            rejected.data["code"],
            "permission_denied",
        )
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.data["return_count"], 14)
        self.assertEqual(
            accepted.data["message_code"],
            "demo_reset_complete",
        )

    def test_customer_and_operations_lists_are_paginated_and_filtered(self):
        self.bootstrap()

        customer = self.client.get(
            reverse("returns-api:customer-return-list"),
        )
        operations = self.client.get(
            reverse("returns-api:operations-return-list"),
            {
                "search": "RTN-204",
                "status": "SUBMITTED",
                "ordering": "-total_value",
            },
        )

        self.assertEqual(customer.status_code, 200)
        self.assertEqual(customer.data["count"], 14)
        self.assertEqual(len(customer.data["results"]), 5)
        self.assertEqual(operations.status_code, 200)
        self.assertEqual(operations.data["count"], 1)
        self.assertEqual(
            operations.data["results"][0]["reference"],
            "RTN-204",
        )
        self.assertEqual(
            operations.data["results"][0]["total_value"],
            "774.00",
        )

    def test_complete_customer_to_operations_flow(self):
        _, token = self.bootstrap()
        create_url = reverse("returns-api:customer-return-list")
        order, payload = self.catalog_selection()

        rejected_payload = self.client.post(
            create_url,
            {
                **payload,
                "customer_name": "Untrusted override",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(rejected_payload.status_code, 400)
        self.assertIn("customer_name", rejected_payload.data["fields"])

        created = self.client.post(
            create_url,
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["reference"], "RTN-205")
        self.assertEqual(created.data["status"], "DRAFT")
        self.assertEqual(created.data["order_reference"], order["order_reference"])
        self.assertEqual(created.data["customer_name"], order["customer_name"])
        self.assertEqual(created.data["customer_email"], order["customer_email"])
        self.assertEqual(len(created.data["items"]), 1)
        self.assertEqual(
            created.data["items"][0]["unit_price"],
            order["items"][0]["unit_price"],
        )
        self.assertEqual(
            len(self.client.get(reverse("returns-api:demo-orders")).data),
            2,
        )
        unavailable = self.client.post(
            create_url,
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(unavailable.status_code, 409)
        self.assertEqual(unavailable.data["code"], "demo_order_unavailable")
        return_id = created.data["id"]
        item_id = created.data["items"][0]["id"]

        evidence_url = (
            f"/api/v1/returns/{return_id}/items/{item_id}/evidence/"
        )
        evidence_created = self.client.post(
            evidence_url,
            {
                "kind": "PRODUCT_PHOTO",
                "asset_key": "evidence/fictional-new-product.webp",
                "caption": "Fictional product image",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        duplicate_evidence = self.client.post(
            evidence_url,
            {
                "kind": "PRODUCT_PHOTO",
                "asset_key": "evidence/fictional-new-product.webp",
                "caption": "Duplicate fictional image",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(evidence_created.status_code, 201)
        self.assertEqual(duplicate_evidence.status_code, 409)
        self.assertEqual(
            duplicate_evidence.data["code"],
            "evidence_already_attached",
        )

        submitted = self.client.post(
            f"/api/v1/returns/{return_id}/submit/",
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(submitted.status_code, 200, submitted.data)
        self.assertEqual(submitted.data["status"], "SUBMITTED")

        server_owned_identity = self.client.patch(
            f"/api/v1/returns/{return_id}/",
            {"customer_name": "Changed too late"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(server_owned_identity.status_code, 405)
        self.assertEqual(
            server_owned_identity.data["code"],
            "method_not_allowed",
        )

        needs_information = self.client.post(
            f"/api/v1/operations/returns/{return_id}/transition/",
            {
                "target_status": "NEEDS_INFORMATION",
                "note": "Add fictional serial evidence.",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(needs_information.status_code, 200)
        self.assertEqual(
            needs_information.data["status"],
            "NEEDS_INFORMATION",
        )

        updated = self.client.patch(
            f"/api/v1/returns/{return_id}/items/{item_id}/",
            {"details": "Added the requested fictional context."},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(
            updated.data["details"],
            "Added the requested fictional context.",
        )

        missing_response = self.client.post(
            f"/api/v1/returns/{return_id}/submit/",
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(missing_response.status_code, 400)
        self.assertEqual(
            missing_response.data["code"],
            "transition_note_required",
        )

        resubmitted = self.client.post(
            f"/api/v1/returns/{return_id}/submit/",
            {"response_note": "Added fictional evidence."},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        approved = self.client.post(
            f"/api/v1/operations/returns/{return_id}/transition/",
            {"target_status": "APPROVED"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(resubmitted.status_code, 200)
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.data["status"], "APPROVED")
        self.assertEqual(len(approved.data["status_events"]), 5)

    def test_cross_visitor_resources_return_404(self):
        first_client = APIClient(enforce_csrf_checks=True)
        second_client = APIClient(enforce_csrf_checks=True)
        _, first_token = self.bootstrap(first_client)
        _, second_token = self.bootstrap(second_client)
        _, first_payload = self.catalog_selection(first_client)

        created = first_client.post(
            reverse("returns-api:customer-return-list"),
            first_payload,
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        return_id = created.data["id"]

        hidden_read = second_client.get(
            f"/api/v1/returns/{return_id}/",
        )
        hidden_write = second_client.post(
            reverse("returns-api:customer-return-list"),
            first_payload,
            format="json",
            HTTP_X_CSRFTOKEN=second_token,
        )

        self.assertEqual(hidden_read.status_code, 404)
        self.assertEqual(hidden_write.status_code, 404)
        self.assertEqual(hidden_read.data["code"], "return_not_found")
        self.assertEqual(hidden_write.data["code"], "demo_order_not_found")
        self.assertEqual(
            ReturnRequest.objects.get(id=return_id).items.count(),
            1,
        )

    def test_nested_edit_and_delete_routes_modify_only_a_draft(self):
        _, token = self.bootstrap()
        _, payload = self.catalog_selection(
            order_index=1,
            item_index=1,
        )
        created = self.client.post(
            reverse("returns-api:customer-return-list"),
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        return_id = created.data["id"]
        item_id = created.data["items"][0]["id"]
        item_url = f"/api/v1/returns/{return_id}/items/{item_id}/"

        updated_item = self.client.patch(
            item_url,
            {"quantity": 2},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        rejected_override = self.client.patch(
            item_url,
            {"sku": "SPOOFED", "unit_price": "0.01"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        excessive_quantity = self.client.patch(
            item_url,
            {"quantity": 3},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        evidence = self.client.post(
            f"{item_url}evidence/",
            {
                "kind": "RECEIPT",
                "asset_key": "evidence/editable-receipt.webp",
                "caption": "Editable fictional receipt",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        evidence_id = evidence.data["id"]
        deleted_evidence = self.client.delete(
            f"{item_url}evidence/{evidence_id}/",
            HTTP_X_CSRFTOKEN=token,
        )
        deleted_item = self.client.delete(
            item_url,
            HTTP_X_CSRFTOKEN=token,
        )
        deleted_return = self.client.delete(
            f"/api/v1/returns/{return_id}/",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(updated_item.status_code, 200)
        self.assertEqual(updated_item.data["quantity"], 2)
        self.assertEqual(rejected_override.status_code, 400)
        self.assertEqual(
            set(rejected_override.data["fields"]),
            {"sku", "unit_price"},
        )
        self.assertEqual(excessive_quantity.status_code, 400)
        self.assertEqual(
            excessive_quantity.data["code"],
            "return_item_quantity_exceeded",
        )
        self.assertEqual(evidence.status_code, 201)
        self.assertEqual(deleted_evidence.status_code, 204)
        self.assertEqual(deleted_item.status_code, 204)
        self.assertEqual(deleted_return.status_code, 204)
        self.assertFalse(ReturnRequest.objects.filter(id=return_id).exists())
        self.assertEqual(
            len(self.client.get(reverse("returns-api:demo-orders")).data),
            3,
        )

    def test_reset_changes_only_the_current_visitor(self):
        first_client = APIClient(enforce_csrf_checks=True)
        second_client = APIClient(enforce_csrf_checks=True)
        _, first_token = self.bootstrap(first_client)
        _, second_token = self.bootstrap(second_client)
        create_url = reverse("returns-api:customer-return-list")
        _, first_payload = self.catalog_selection(first_client)
        _, second_payload = self.catalog_selection(second_client)
        first_client.post(
            create_url,
            first_payload,
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        second_client.post(
            create_url,
            second_payload,
            format="json",
            HTTP_X_CSRFTOKEN=second_token,
        )

        reset = first_client.post(
            reverse("returns-api:demo-reset"),
            {},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )

        self.assertEqual(reset.status_code, 200)
        self.assertEqual(
            self.visitor_for(first_client).return_requests.count(),
            14,
        )
        self.assertEqual(
            self.visitor_for(second_client).return_requests.count(),
            15,
        )
