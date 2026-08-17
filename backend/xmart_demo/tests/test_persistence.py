from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from returns.models import VisitorSession
from returns.services.visitor_sessions import VisitorSessionRequired
from xmart_demo.models import (
    XmartAuditEvent,
    XmartAuditEventType,
    XmartContractedModule,
    XmartDemoDevice,
    XmartDemoUser,
    XmartDemoWorkspace,
    XmartDeviceStatus,
    XmartUserStatus,
)
from xmart_demo.scenario import XmartWorkflowPhase
from xmart_demo.services import (
    advance_xmart_demo,
    reset_xmart_demo,
    seed_xmart_demo,
)


class XmartDemoPersistenceTests(TestCase):
    def create_visitor(self) -> VisitorSession:
        return VisitorSession.objects.create(
            expires_at=timezone.now() + timedelta(hours=1),
        )

    def test_seed_creates_the_complete_canonical_aggregate(self):
        visitor = self.create_visitor()

        workspace = seed_xmart_demo(visitor)

        self.assertEqual(workspace.visitor_session, visitor)
        self.assertEqual(workspace.customer_name, "Atlas Field Services")
        self.assertEqual(workspace.project_name, "Atlas Network Rollout")
        self.assertEqual(
            workspace.phase,
            XmartWorkflowPhase.CUSTOMER_WORKSPACE,
        )
        self.assertEqual(workspace.users_used, 4)
        self.assertEqual(workspace.users_limit, 10)
        self.assertEqual(str(workspace.storage_used_gb), "6.40")
        self.assertEqual(str(workspace.storage_limit_gb), "20.00")
        self.assertEqual(workspace.imeis_used, 8)
        self.assertEqual(workspace.imeis_limit, 15)
        self.assertEqual(
            list(workspace.modules.values_list("name", flat=True)),
            [
                "Field Testing",
                "Device Management",
                "Log Center",
                "Security Audit",
            ],
        )
        self.assertEqual(
            workspace.target_user.email,
            "field.operator@example.test",
        )
        self.assertEqual(workspace.target_user.status, XmartUserStatus.PENDING)
        self.assertFalse(workspace.target_user.seat_consumed)
        self.assertEqual(
            workspace.device.synthetic_imei,
            "DEMO-IMEI-0001",
        )
        self.assertEqual(
            workspace.device.status,
            XmartDeviceStatus.AVAILABLE,
        )
        initial_event = workspace.audit_events.get()
        self.assertEqual(
            initial_event.event_type,
            XmartAuditEventType.WORKSPACE_REVIEWED,
        )
        self.assertEqual(initial_event.actor_email, workspace.actor_email)
        self.assertEqual(initial_event.source_ip, "192.0.2.44")

    def test_seed_is_idempotent_for_the_same_visitor(self):
        visitor = self.create_visitor()

        first = seed_xmart_demo(visitor)
        second = seed_xmart_demo(visitor)

        self.assertEqual(first.id, second.id)
        self.assertEqual(XmartDemoWorkspace.objects.count(), 1)
        self.assertEqual(XmartContractedModule.objects.count(), 4)
        self.assertEqual(XmartDemoUser.objects.count(), 1)
        self.assertEqual(XmartDemoDevice.objects.count(), 1)
        self.assertEqual(XmartAuditEvent.objects.count(), 1)

    def test_visitors_receive_independent_aggregates(self):
        first_visitor = self.create_visitor()
        second_visitor = self.create_visitor()
        first = seed_xmart_demo(first_visitor)
        second = seed_xmart_demo(second_visitor)

        first, did_advance = advance_xmart_demo(first_visitor)
        second.refresh_from_db()
        second.target_user.refresh_from_db()

        self.assertTrue(did_advance)
        self.assertNotEqual(first.id, second.id)
        self.assertEqual(first.phase, XmartWorkflowPhase.USER_ACCESS)
        self.assertEqual(first.users_used, 5)
        self.assertEqual(second.users_used, 4)
        self.assertEqual(
            second.phase,
            XmartWorkflowPhase.CUSTOMER_WORKSPACE,
        )
        self.assertEqual(second.target_user.status, XmartUserStatus.PENDING)
        self.assertNotEqual(first.target_user.id, second.target_user.id)
        self.assertNotEqual(first.device.id, second.device.id)
        self.assertEqual(XmartDemoWorkspace.objects.count(), 2)

    def test_database_rejects_capacity_usage_above_its_limit(self):
        workspace = seed_xmart_demo(self.create_visitor())

        invalid_updates = (
            {"users_used": 11},
            {"storage_used_gb": 21},
            {"imeis_used": 16},
        )
        for updates in invalid_updates:
            with self.subTest(updates=updates):
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        XmartDemoWorkspace.objects.filter(
                            id=workspace.id
                        ).update(**updates)

    def test_each_call_applies_one_ordered_transition_and_records_audit(self):
        visitor = self.create_visitor()
        workspace = seed_xmart_demo(visitor)
        initial_storage = (
            workspace.storage_used_gb,
            workspace.storage_limit_gb,
        )

        workspace, did_advance = advance_xmart_demo(visitor)

        self.assertTrue(did_advance)
        self.assertEqual(workspace.phase, XmartWorkflowPhase.USER_ACCESS)
        self.assertEqual(workspace.users_used, 5)
        self.assertEqual(workspace.imeis_used, 8)
        self.assertEqual(
            (
                workspace.storage_used_gb,
                workspace.storage_limit_gb,
            ),
            initial_storage,
        )
        self.assertEqual(workspace.target_user.role, "Field operator")
        self.assertEqual(
            workspace.target_user.status,
            XmartUserStatus.ACTIVE,
        )
        self.assertTrue(workspace.target_user.seat_consumed)
        self.assertEqual(workspace.target_user.verification_resends, 1)
        self.assertIsNotNone(workspace.target_user.activated_at)
        self.assertEqual(
            list(
                workspace.audit_events.values_list(
                    "event_type",
                    flat=True,
                )
            ),
            [
                XmartAuditEventType.WORKSPACE_REVIEWED,
                XmartAuditEventType.USER_ACTIVATED,
                XmartAuditEventType.VERIFICATION_RESENT,
            ],
        )

        workspace, did_advance = advance_xmart_demo(visitor)

        self.assertTrue(did_advance)
        self.assertEqual(
            workspace.phase,
            XmartWorkflowPhase.DEVICE_ASSIGNMENT,
        )
        self.assertEqual(workspace.users_used, 5)
        self.assertEqual(workspace.imeis_used, 9)
        self.assertEqual(
            workspace.device.status,
            XmartDeviceStatus.ASSIGNED,
        )
        self.assertEqual(
            workspace.device.assigned_project,
            "Atlas Network Rollout",
        )
        self.assertIsNotNone(workspace.device.assigned_at)
        self.assertEqual(
            workspace.audit_events.last().event_type,
            XmartAuditEventType.DEVICE_ASSIGNED,
        )

        capacities_before_audit = (
            workspace.users_used,
            workspace.storage_used_gb,
            workspace.imeis_used,
        )
        workspace, did_advance = advance_xmart_demo(visitor)

        self.assertTrue(did_advance)
        self.assertEqual(
            workspace.phase,
            XmartWorkflowPhase.SECURITY_AUDIT,
        )
        self.assertEqual(
            (
                workspace.users_used,
                workspace.storage_used_gb,
                workspace.imeis_used,
            ),
            capacities_before_audit,
        )
        self.assertEqual(
            workspace.audit_events.last().event_type,
            XmartAuditEventType.SECURITY_AUDIT_REVIEWED,
        )

        workspace, did_advance = advance_xmart_demo(visitor)

        self.assertTrue(did_advance)
        self.assertEqual(
            workspace.phase,
            XmartWorkflowPhase.WORKFLOW_COMPLETE,
        )
        self.assertEqual(workspace.users_used, 5)
        self.assertEqual(workspace.imeis_used, 9)
        self.assertEqual(workspace.audit_events.count(), 6)
        self.assertEqual(
            workspace.audit_events.last().event_type,
            XmartAuditEventType.WORKFLOW_COMPLETED,
        )
        final_events = list(workspace.audit_events.all())
        self.assertTrue(
            all(
                event.actor_email == "portfolio.admin@example.test"
                for event in final_events
            )
        )
        self.assertTrue(
            all(event.source_ip == "192.0.2.44" for event in final_events)
        )
        self.assertTrue(all(event.occurred_at for event in final_events))
        self.assertTrue(all(event.reason for event in final_events))
        self.assertIn(
            "field.operator@example.test",
            {event.subject_reference for event in final_events},
        )
        self.assertIn(
            "DEMO-IMEI-0001",
            {event.subject_reference for event in final_events},
        )

        completed_at = workspace.updated_at
        event_ids = list(
            workspace.audit_events.values_list("id", flat=True)
        )
        workspace, did_advance = advance_xmart_demo(visitor)

        self.assertFalse(did_advance)
        self.assertEqual(
            workspace.phase,
            XmartWorkflowPhase.WORKFLOW_COMPLETE,
        )
        self.assertEqual(workspace.updated_at, completed_at)
        self.assertEqual(
            list(workspace.audit_events.values_list("id", flat=True)),
            event_ids,
        )

    def test_reset_replaces_only_the_requested_visitor_aggregate(self):
        first_visitor = self.create_visitor()
        second_visitor = self.create_visitor()
        first = seed_xmart_demo(first_visitor)
        second = seed_xmart_demo(second_visitor)
        advance_xmart_demo(first_visitor)
        advance_xmart_demo(first_visitor)

        replacement = reset_xmart_demo(first_visitor)

        self.assertNotEqual(first.id, replacement.id)
        self.assertFalse(
            XmartDemoWorkspace.objects.filter(id=first.id).exists()
        )
        self.assertTrue(
            XmartDemoWorkspace.objects.filter(id=second.id).exists()
        )
        self.assertEqual(replacement.visitor_session, first_visitor)
        self.assertEqual(
            replacement.phase,
            XmartWorkflowPhase.CUSTOMER_WORKSPACE,
        )
        self.assertEqual(replacement.users_used, 4)
        self.assertEqual(replacement.imeis_used, 8)
        self.assertEqual(
            replacement.target_user.status,
            XmartUserStatus.PENDING,
        )
        self.assertFalse(replacement.target_user.seat_consumed)
        self.assertEqual(
            replacement.device.status,
            XmartDeviceStatus.AVAILABLE,
        )
        self.assertEqual(replacement.audit_events.count(), 1)

    def test_expired_visitor_cannot_seed_advance_or_reset_a_scenario(self):
        visitor = self.create_visitor()
        now = timezone.now()
        VisitorSession.objects.filter(id=visitor.id).update(
            created_at=now - timedelta(hours=2),
            expires_at=now - timedelta(hours=1),
        )
        visitor.refresh_from_db()

        with self.assertRaises(VisitorSessionRequired):
            seed_xmart_demo(visitor)
        with self.assertRaises(VisitorSessionRequired):
            advance_xmart_demo(visitor)
        with self.assertRaises(VisitorSessionRequired):
            reset_xmart_demo(visitor)

        self.assertEqual(XmartDemoWorkspace.objects.count(), 0)

    def test_visitor_deletion_cascades_the_complete_aggregate(self):
        visitor = self.create_visitor()
        seed_xmart_demo(visitor)

        visitor.delete()

        self.assertEqual(XmartDemoWorkspace.objects.count(), 0)
        self.assertEqual(XmartContractedModule.objects.count(), 0)
        self.assertEqual(XmartDemoUser.objects.count(), 0)
        self.assertEqual(XmartDemoDevice.objects.count(), 0)
        self.assertEqual(XmartAuditEvent.objects.count(), 0)

    def test_expired_demo_cleanup_cascades_the_xmart_aggregate(self):
        visitor = self.create_visitor()
        seed_xmart_demo(visitor)
        now = timezone.now()
        VisitorSession.objects.filter(id=visitor.id).update(
            created_at=now - timedelta(hours=2),
            expires_at=now - timedelta(hours=1),
        )

        call_command("cleanup_expired_demo_data", stdout=StringIO())

        self.assertFalse(
            VisitorSession.objects.filter(id=visitor.id).exists()
        )
        self.assertEqual(XmartDemoWorkspace.objects.count(), 0)
