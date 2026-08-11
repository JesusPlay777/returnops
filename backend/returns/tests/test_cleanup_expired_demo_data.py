from datetime import timedelta
from io import StringIO

from django.contrib.sessions.models import Session
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from returns.models import ReturnRequest, VisitorSession


class CleanupExpiredDemoDataTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.active_visitor = VisitorSession.objects.create(
            expires_at=now + timedelta(hours=1),
        )
        self.expired_visitor = VisitorSession.objects.create(
            expires_at=now + timedelta(hours=1),
        )
        VisitorSession.objects.filter(id=self.expired_visitor.id).update(
            created_at=now - timedelta(hours=2),
            expires_at=now - timedelta(hours=1),
        )

        self.expired_return = ReturnRequest.objects.create(
            visitor_session=self.expired_visitor,
            reference="RTN-999",
            order_reference="ORD-99999",
            customer_name="Expired Example",
            customer_email="expired@example.com",
        )
        self.active_return = ReturnRequest.objects.create(
            visitor_session=self.active_visitor,
            reference="RTN-998",
            order_reference="ORD-99998",
            customer_name="Active Example",
            customer_email="active@example.com",
        )

        Session.objects.create(
            session_key="expired-demo-session",
            session_data="",
            expire_date=now - timedelta(minutes=1),
        )
        Session.objects.create(
            session_key="active-demo-session",
            session_data="",
            expire_date=now + timedelta(hours=1),
        )

    def test_cleanup_removes_only_expired_rows_and_cascades_demo_data(self):
        output = StringIO()

        call_command("cleanup_expired_demo_data", stdout=output)

        self.assertFalse(
            VisitorSession.objects.filter(id=self.expired_visitor.id).exists()
        )
        self.assertFalse(
            ReturnRequest.objects.filter(id=self.expired_return.id).exists()
        )
        self.assertFalse(
            Session.objects.filter(session_key="expired-demo-session").exists()
        )
        self.assertTrue(
            VisitorSession.objects.filter(id=self.active_visitor.id).exists()
        )
        self.assertTrue(
            ReturnRequest.objects.filter(id=self.active_return.id).exists()
        )
        self.assertTrue(
            Session.objects.filter(session_key="active-demo-session").exists()
        )
        self.assertIn("1 visitor sandbox(es)", output.getvalue())
        self.assertIn("1 Django session(s)", output.getvalue())

    def test_dry_run_reports_without_deleting_and_cleanup_is_idempotent(self):
        dry_run_output = StringIO()
        call_command(
            "cleanup_expired_demo_data",
            "--dry-run",
            stdout=dry_run_output,
        )

        self.assertTrue(
            VisitorSession.objects.filter(id=self.expired_visitor.id).exists()
        )
        self.assertTrue(
            Session.objects.filter(session_key="expired-demo-session").exists()
        )
        self.assertIn("Dry run", dry_run_output.getvalue())

        call_command("cleanup_expired_demo_data", stdout=StringIO())
        second_output = StringIO()
        call_command("cleanup_expired_demo_data", stdout=second_output)

        self.assertIn("0 visitor sandbox(es)", second_output.getvalue())
        self.assertIn("0 Django session(s)", second_output.getvalue())
