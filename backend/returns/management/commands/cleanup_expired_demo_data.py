from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from returns.models import VisitorSession


class Command(BaseCommand):
    help = (
        "Delete expired ReturnOps visitor sandboxes and expired Django "
        "sessions. Safe to run repeatedly."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report expired rows without deleting them.",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        expired_visitors = VisitorSession.objects.filter(
            expires_at__lte=now,
        )
        expired_sessions = Session.objects.filter(expire_date__lte=now)
        visitor_count = expired_visitors.count()
        session_count = expired_sessions.count()

        if options["dry_run"]:
            self.stdout.write(
                "Dry run: "
                f"{visitor_count} expired visitor sandbox(es), "
                f"{session_count} expired Django session(s)."
            )
            return

        with transaction.atomic():
            expired_visitors.delete()
            expired_sessions.delete()

        self.stdout.write(
            self.style.SUCCESS(
                "Expired demo data cleanup complete: "
                f"{visitor_count} visitor sandbox(es), "
                f"{session_count} Django session(s) deleted."
            )
        )
