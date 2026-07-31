from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.http import JsonResponse
from django.test import Client, TestCase, override_settings
from django.urls import path
from django.utils import timezone

from returns.models import VisitorSession
from returns.services.visitor_sessions import (
    VISITOR_SESSION_KEY,
    VisitorSessionRequired,
    bootstrap_visitor_session,
    require_visitor_session,
    resolve_visitor_session,
)


def bootstrap_probe(request):
    """Test-only view that exercises Django's real session middleware."""
    visitor = bootstrap_visitor_session(request)
    return JsonResponse({"visitor_id": str(visitor.id)})


def resolve_probe(request):
    """Test-only protected view without automatic visitor creation."""
    visitor = resolve_visitor_session(request)
    if visitor is None:
        return JsonResponse(
            {"code": VisitorSessionRequired.code},
            status=401,
        )
    return JsonResponse({"visitor_id": str(visitor.id)})


urlpatterns = [
    path("__tests__/visitor/bootstrap/", bootstrap_probe),
    path("__tests__/visitor/resolve/", resolve_probe),
]


@override_settings(ROOT_URLCONF=__name__)
class VisitorSessionServiceTests(TestCase):
    def test_two_browsers_receive_different_visitor_sessions(self):
        first_browser = Client()
        second_browser = Client()

        first_response = first_browser.get("/__tests__/visitor/bootstrap/")
        second_response = second_browser.get("/__tests__/visitor/bootstrap/")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertNotEqual(
            first_response.json()["visitor_id"],
            second_response.json()["visitor_id"],
        )
        self.assertEqual(VisitorSession.objects.count(), 2)

    def test_same_browser_keeps_the_same_visitor_session(self):
        browser = Client()

        first_response = browser.get("/__tests__/visitor/bootstrap/")
        second_response = browser.get("/__tests__/visitor/bootstrap/")

        self.assertEqual(
            first_response.json()["visitor_id"],
            second_response.json()["visitor_id"],
        )
        self.assertEqual(VisitorSession.objects.count(), 1)

    def test_resolve_does_not_create_a_visitor(self):
        response = self.client.get("/__tests__/visitor/resolve/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"code": "visitor_session_required"},
        )
        self.assertFalse(VisitorSession.objects.exists())

    def test_expired_visitor_is_unreachable_and_reference_is_cleared(self):
        bootstrap_response = self.client.get(
            "/__tests__/visitor/bootstrap/",
        )
        expired_id = bootstrap_response.json()["visitor_id"]
        now = timezone.now()
        VisitorSession.objects.filter(id=expired_id).update(
            created_at=now - timedelta(hours=25),
            expires_at=now - timedelta(hours=1),
        )

        resolve_response = self.client.get("/__tests__/visitor/resolve/")

        self.assertEqual(resolve_response.status_code, 401)
        self.assertNotIn(VISITOR_SESSION_KEY, self.client.session)
        self.assertTrue(VisitorSession.objects.filter(id=expired_id).exists())

        new_response = self.client.get("/__tests__/visitor/bootstrap/")
        self.assertNotEqual(new_response.json()["visitor_id"], expired_id)

    def test_invalid_or_missing_reference_is_cleared(self):
        session = self.client.session
        session[VISITOR_SESSION_KEY] = "not-a-valid-uuid"
        session.save()

        invalid_response = self.client.get("/__tests__/visitor/resolve/")

        self.assertEqual(invalid_response.status_code, 401)
        self.assertNotIn(VISITOR_SESSION_KEY, self.client.session)

        session = self.client.session
        session[VISITOR_SESSION_KEY] = str(uuid4())
        session.save()

        missing_response = self.client.get("/__tests__/visitor/resolve/")

        self.assertEqual(missing_response.status_code, 401)
        self.assertNotIn(VISITOR_SESSION_KEY, self.client.session)

    def test_request_values_cannot_select_another_visitor(self):
        first_browser = Client()
        second_browser = Client()
        first_id = first_browser.get(
            "/__tests__/visitor/bootstrap/",
        ).json()["visitor_id"]
        second_id = second_browser.get(
            "/__tests__/visitor/bootstrap/",
        ).json()["visitor_id"]

        response = first_browser.get(
            "/__tests__/visitor/resolve/",
            {"visitor_session_id": second_id},
            headers={"X-Visitor-Session-Id": second_id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["visitor_id"], first_id)

    def test_require_signals_when_bootstrap_is_needed(self):
        request = type(
            "Request",
            (),
            {"session": self.client.session},
        )()

        with self.assertRaises(VisitorSessionRequired) as error:
            require_visitor_session(request)

        self.assertEqual(
            error.exception.code,
            "visitor_session_required",
        )

    def test_bootstrap_sets_secure_session_cookie_attributes(self):
        response = self.client.get("/__tests__/visitor/bootstrap/")

        cookie = response.cookies[settings.SESSION_COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(
            int(cookie["max-age"]),
            settings.RETURNOPS_VISITOR_SESSION_TTL_HOURS * 60 * 60,
        )

    def test_new_visitor_uses_the_configured_lifetime(self):
        before = timezone.now()

        response = self.client.get("/__tests__/visitor/bootstrap/")

        after = timezone.now()
        visitor = VisitorSession.objects.get(
            id=response.json()["visitor_id"],
        )
        expected_ttl = timedelta(
            hours=settings.RETURNOPS_VISITOR_SESSION_TTL_HOURS,
        )
        self.assertGreaterEqual(visitor.expires_at, before + expected_ttl)
        self.assertLessEqual(visitor.expires_at, after + expected_ttl)
