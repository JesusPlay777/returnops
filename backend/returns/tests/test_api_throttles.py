from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from returns.models import VisitorSession


@override_settings(
    RETURNOPS_BOOTSTRAP_THROTTLE_RATE="2/hour",
    RETURNOPS_RESET_THROTTLE_RATE="2/hour",
)
class DemoLifecycleThrottleTests(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_bootstrap_limits_only_new_sandboxes_per_client(self):
        session_url = reverse("returns-api:session")
        client_address = "203.0.113.10"
        first_browser = APIClient(enforce_csrf_checks=True)
        second_browser = APIClient(enforce_csrf_checks=True)
        blocked_browser = APIClient(enforce_csrf_checks=True)

        first = first_browser.get(session_url, REMOTE_ADDR=client_address)
        second = second_browser.get(session_url, REMOTE_ADDR=client_address)
        resumed = first_browser.get(session_url, REMOTE_ADDR=client_address)
        blocked = blocked_browser.get(session_url, REMOTE_ADDR=client_address)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(resumed.status_code, 200)
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.data["code"], "throttled")
        self.assertEqual(blocked.data["fields"], {})
        self.assertIn("Retry-After", blocked)
        self.assertEqual(VisitorSession.objects.count(), 2)

    def test_reset_is_limited_independently_per_visitor(self):
        session_url = reverse("returns-api:session")
        reset_url = reverse("returns-api:demo-reset")
        first_browser = APIClient(enforce_csrf_checks=True)
        second_browser = APIClient(enforce_csrf_checks=True)

        first_bootstrap = first_browser.get(
            session_url,
            REMOTE_ADDR="203.0.113.20",
        )
        self.assertEqual(first_bootstrap.status_code, 200)
        first_token = first_browser.cookies[
            settings.CSRF_COOKIE_NAME
        ].value

        first_reset = first_browser.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        second_reset = first_browser.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )
        blocked_reset = first_browser.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=first_token,
        )

        second_bootstrap = second_browser.get(
            session_url,
            REMOTE_ADDR="203.0.113.21",
        )
        self.assertEqual(second_bootstrap.status_code, 200)
        second_token = second_browser.cookies[
            settings.CSRF_COOKIE_NAME
        ].value
        independent_reset = second_browser.post(
            reset_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=second_token,
        )

        self.assertEqual(first_reset.status_code, 200)
        self.assertEqual(second_reset.status_code, 200)
        self.assertEqual(blocked_reset.status_code, 429)
        self.assertEqual(blocked_reset.data["code"], "throttled")
        self.assertIn("Retry-After", blocked_reset)
        self.assertEqual(independent_reset.status_code, 200)
