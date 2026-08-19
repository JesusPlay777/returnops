from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from returns.models import VisitorSession
from returns.services.visitor_sessions import VISITOR_SESSION_KEY
from xmart_demo.models import XmartDemoWorkspace
from xmart_demo.scenario import XmartWorkflowPhase


class XmartAPIIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def bootstrap(self, client=None):
        client = client or self.client
        response = client.get(reverse("returns-api:session"))
        self.assertEqual(response.status_code, 200, response.data)
        return client.cookies[settings.CSRF_COOKIE_NAME].value

    def visitor_for(self, client=None) -> VisitorSession:
        client = client or self.client
        return VisitorSession.objects.get(
            id=client.session[VISITOR_SESSION_KEY],
        )

    def test_demo_requires_the_server_owned_visitor_session(self):
        response = self.client.get(reverse("xmart-api:demo"))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "visitor_session_required")
        self.assertEqual(XmartDemoWorkspace.objects.count(), 0)

    def test_retrieve_seeds_one_idempotent_isolated_scenario(self):
        self.bootstrap()

        first = self.client.get(reverse("xmart-api:demo"))
        second = self.client.get(reverse("xmart-api:demo"))

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data, second.data)
        self.assertEqual(
            first.data["phase"],
            XmartWorkflowPhase.CUSTOMER_WORKSPACE,
        )
        self.assertEqual(first.data["customer_name"], "Atlas Field Services")
        self.assertEqual(first.data["project_name"], "Atlas Network Rollout")
        self.assertEqual(
            first.data["target_user"]["email"],
            "field.operator@example.test",
        )
        self.assertEqual(
            first.data["device"]["synthetic_imei"],
            "DEMO-IMEI-0001",
        )
        self.assertEqual(
            first.data["capacities"],
            {
                "users": {"used": 4, "limit": 10},
                "storage": {
                    "used": "6.40",
                    "limit": "20.00",
                    "unit": "GB",
                },
                "imeis": {"used": 8, "limit": 15},
            },
        )
        self.assertEqual(len(first.data["modules"]), 4)
        self.assertEqual(len(first.data["audit_events"]), 1)
        self.assertNotIn("visitor_session", first.data)
        self.assertNotIn("id", first.data)
        self.assertEqual(XmartDemoWorkspace.objects.count(), 1)

    def test_advance_runs_the_complete_synchronous_provisioning_flow(self):
        token = self.bootstrap()
        self.client.get(reverse("xmart-api:demo"))
        advance_url = reverse("xmart-api:demo-advance")
        expected_phases = (
            XmartWorkflowPhase.USER_ACCESS,
            XmartWorkflowPhase.DEVICE_ASSIGNMENT,
            XmartWorkflowPhase.SECURITY_AUDIT,
            XmartWorkflowPhase.WORKFLOW_COMPLETE,
        )

        for expected_phase in expected_phases:
            response = self.client.post(
                advance_url,
                {},
                format="json",
                HTTP_X_CSRFTOKEN=token,
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["phase"], expected_phase)
            self.assertTrue(response.data["did_advance"])

        self.assertTrue(response.data["is_complete"])
        self.assertIsNone(response.data["next_phase"])
        self.assertEqual(
            response.data["capacities"],
            {
                "users": {"used": 5, "limit": 10},
                "storage": {
                    "used": "6.40",
                    "limit": "20.00",
                    "unit": "GB",
                },
                "imeis": {"used": 9, "limit": 15},
            },
        )
        self.assertEqual(response.data["target_user"]["status"], "ACTIVE")
        self.assertTrue(response.data["target_user"]["seat_consumed"])
        self.assertEqual(
            response.data["target_user"]["verification_resends"],
            1,
        )
        self.assertEqual(response.data["device"]["status"], "ASSIGNED")
        self.assertEqual(
            response.data["device"]["assigned_project"],
            "Atlas Network Rollout",
        )
        self.assertEqual(len(response.data["audit_events"]), 6)
        self.assertTrue(
            all(
                event["actor_email"] == "portfolio.admin@example.test"
                for event in response.data["audit_events"]
            )
        )
        self.assertTrue(
            all(
                event["source_ip"] == "192.0.2.44"
                for event in response.data["audit_events"]
            )
        )
        self.assertTrue(
            all(event["reason"] for event in response.data["audit_events"])
        )

        final_updated_at = response.data["updated_at"]
        final_event_ids = [
            event["id"] for event in response.data["audit_events"]
        ]
        repeated = self.client.post(
            advance_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(repeated.status_code, 200)
        self.assertFalse(repeated.data["did_advance"])
        self.assertEqual(repeated.data["updated_at"], final_updated_at)
        self.assertEqual(
            [event["id"] for event in repeated.data["audit_events"]],
            final_event_ids,
        )

    def test_writes_require_csrf(self):
        token = self.bootstrap()
        advance_url = reverse("xmart-api:demo-advance")
        reset_url = reverse("xmart-api:demo-reset")

        rejected_advance = self.client.post(advance_url, {}, format="json")
        accepted_advance = self.client.post(
            advance_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        rejected_reset = self.client.post(reset_url, {}, format="json")
        accepted_reset = self.client.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(rejected_advance.status_code, 403)
        self.assertEqual(
            rejected_advance.data["code"],
            "permission_denied",
        )
        self.assertEqual(accepted_advance.status_code, 200)
        self.assertEqual(rejected_reset.status_code, 403)
        self.assertEqual(
            rejected_reset.data["code"],
            "permission_denied",
        )
        self.assertEqual(accepted_reset.status_code, 200)

    def test_reset_and_transitions_cannot_cross_visitor_boundaries(self):
        first_client = APIClient(enforce_csrf_checks=True)
        second_client = APIClient(enforce_csrf_checks=True)
        first_token = self.bootstrap(first_client)
        second_token = self.bootstrap(second_client)
        first_visitor = self.visitor_for(first_client)
        second_visitor = self.visitor_for(second_client)
        demo_url = reverse("xmart-api:demo")
        advance_url = reverse("xmart-api:demo-advance")
        reset_url = reverse("xmart-api:demo-reset")
        first_client.get(demo_url)
        second_client.get(demo_url)

        advanced = first_client.post(
            advance_url,
            {"visitor_session": str(second_visitor.id)},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        second_before = second_client.get(demo_url)
        first_reset = first_client.post(
            reset_url,
            {"visitor_session": str(second_visitor.id)},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        second_after = second_client.get(demo_url)

        self.assertEqual(advanced.status_code, 200)
        self.assertEqual(
            advanced.data["phase"],
            XmartWorkflowPhase.USER_ACCESS,
        )
        self.assertEqual(first_reset.status_code, 200)
        self.assertEqual(
            first_reset.data["phase"],
            XmartWorkflowPhase.CUSTOMER_WORKSPACE,
        )
        self.assertEqual(second_before.data, second_after.data)
        self.assertEqual(XmartDemoWorkspace.objects.count(), 2)
        self.assertNotEqual(first_visitor.id, second_visitor.id)
        self.assertNotEqual(first_token, second_token)
        self.assertEqual(
            XmartDemoWorkspace.objects.get(
                visitor_session=first_visitor,
            ).users_used,
            4,
        )
        self.assertEqual(
            XmartDemoWorkspace.objects.get(
                visitor_session=second_visitor,
            ).users_used,
            4,
        )
