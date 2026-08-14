from datetime import timedelta
from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from energybil.models import EnergyDemoAccount, EnergyWorkflowPhase
from returns.models import VisitorSession
from returns.services.visitor_sessions import VISITOR_SESSION_KEY


class EnergybilAPIIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def bootstrap(self, client=None):
        client = client or self.client
        response = client.get(reverse("returns-api:session"))
        self.assertEqual(response.status_code, 200, response.data)
        token = client.cookies[settings.CSRF_COOKIE_NAME].value
        return token

    def visitor_for(self, client=None) -> VisitorSession:
        client = client or self.client
        return VisitorSession.objects.get(
            id=client.session[VISITOR_SESSION_KEY],
        )

    def test_demo_requires_the_server_owned_visitor_session(self):
        response = self.client.get(reverse("energybil-api:demo"))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "visitor_session_required")
        self.assertEqual(EnergyDemoAccount.objects.count(), 0)

    def test_retrieve_seeds_one_idempotent_isolated_scenario(self):
        self.bootstrap()

        first = self.client.get(reverse("energybil-api:demo"))
        second = self.client.get(reverse("energybil-api:demo"))

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data, second.data)
        self.assertEqual(first.data["phase"], "READING_RECEIVED")
        self.assertEqual(first.data["meter"]["serial_number"], "GW-84A-01927")
        self.assertEqual(len(first.data["events"]), 1)
        self.assertNotIn("visitor_session", first.data)
        self.assertEqual(EnergyDemoAccount.objects.count(), 1)

    def test_advance_runs_the_complete_synchronous_billing_flow(self):
        token = self.bootstrap()
        self.client.get(reverse("energybil-api:demo"))
        advance_url = reverse("energybil-api:demo-advance")
        expected_phases = [
            EnergyWorkflowPhase.READING_VALIDATED,
            EnergyWorkflowPhase.CONSUMPTION_CALCULATED,
            EnergyWorkflowPhase.INVOICE_ISSUED,
            EnergyWorkflowPhase.NOTIFICATION_SIMULATED,
        ]

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
        self.assertEqual(response.data["invoice"]["consumption_kwh"], "342.300")
        self.assertEqual(response.data["invoice"]["energy_charge"], "57.34")
        self.assertEqual(response.data["invoice"]["subtotal"], "66.84")
        self.assertEqual(response.data["invoice"]["tax"], "4.68")
        self.assertEqual(response.data["invoice"]["total"], "71.52")
        self.assertIsNotNone(response.data["invoice"]["issued_at"])
        self.assertIsNotNone(
            response.data["invoice"]["notification_simulated_at"]
        )
        self.assertEqual(len(response.data["events"]), 5)

        repeated = self.client.post(
            advance_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(repeated.status_code, 200)
        self.assertFalse(repeated.data["did_advance"])
        self.assertEqual(len(repeated.data["events"]), 5)

    def test_writes_require_csrf(self):
        token = self.bootstrap()
        advance_url = reverse("energybil-api:demo-advance")

        rejected = self.client.post(advance_url, {}, format="json")
        accepted = self.client.post(
            advance_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(rejected.status_code, 403)
        self.assertEqual(rejected.data["code"], "permission_denied")
        self.assertEqual(accepted.status_code, 200)

    def test_reset_and_transitions_cannot_cross_visitor_boundaries(self):
        first_client = APIClient(enforce_csrf_checks=True)
        second_client = APIClient(enforce_csrf_checks=True)
        first_token = self.bootstrap(first_client)
        second_token = self.bootstrap(second_client)
        demo_url = reverse("energybil-api:demo")
        advance_url = reverse("energybil-api:demo-advance")
        reset_url = reverse("energybil-api:demo-reset")
        first_client.get(demo_url)
        second_client.get(demo_url)

        first_client.post(
            advance_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        second_before = second_client.get(demo_url)
        first_reset = first_client.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        second_after = second_client.get(demo_url)

        self.assertEqual(first_reset.status_code, 200)
        self.assertEqual(first_reset.data["phase"], "READING_RECEIVED")
        self.assertEqual(second_before.data, second_after.data)
        self.assertEqual(EnergyDemoAccount.objects.count(), 2)
        self.assertNotEqual(
            self.visitor_for(first_client).id,
            self.visitor_for(second_client).id,
        )
        self.assertNotEqual(first_token, second_token)

    def test_expired_visitor_cleanup_cascades_the_energybil_aggregate(self):
        self.bootstrap()
        self.client.get(reverse("energybil-api:demo"))
        visitor = self.visitor_for()
        now = timezone.now()
        VisitorSession.objects.filter(id=visitor.id).update(
            created_at=now - timedelta(hours=2),
            expires_at=now - timedelta(hours=1),
        )

        call_command("cleanup_expired_demo_data", stdout=StringIO())

        self.assertFalse(VisitorSession.objects.filter(id=visitor.id).exists())
        self.assertEqual(EnergyDemoAccount.objects.count(), 0)
