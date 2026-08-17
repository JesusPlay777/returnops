from django.db import models, transaction
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
from xmart_demo.scenario import (
    AFTER_DEVICE_ASSIGNMENT,
    AFTER_USER_ACCESS,
    INITIAL_CAPACITIES,
    XMART_SCENARIO,
    XmartWorkflowPhase,
)


NEXT_PHASE = {
    XmartWorkflowPhase.CUSTOMER_WORKSPACE.value: (
        XmartWorkflowPhase.USER_ACCESS
    ),
    XmartWorkflowPhase.USER_ACCESS.value: (
        XmartWorkflowPhase.DEVICE_ASSIGNMENT
    ),
    XmartWorkflowPhase.DEVICE_ASSIGNMENT.value: (
        XmartWorkflowPhase.SECURITY_AUDIT
    ),
    XmartWorkflowPhase.SECURITY_AUDIT.value: (
        XmartWorkflowPhase.WORKFLOW_COMPLETE
    ),
}


def _lock_active_visitor(visitor_id) -> VisitorSession:
    try:
        visitor = VisitorSession.objects.select_for_update().get(id=visitor_id)
    except VisitorSession.DoesNotExist as error:
        raise VisitorSessionRequired from error
    if visitor.expires_at <= timezone.now():
        raise VisitorSessionRequired
    return visitor


def _workspace_queryset():
    return XmartDemoWorkspace.objects.select_related(
        "target_user",
        "device",
    ).prefetch_related(
        "modules",
        "audit_events",
    )


def _create_demo(visitor: VisitorSession) -> XmartDemoWorkspace:
    workspace = XmartDemoWorkspace.objects.create(
        visitor_session=visitor,
        customer_name=XMART_SCENARIO.customer_name,
        project_name=XMART_SCENARIO.project_name,
        actor_email=XMART_SCENARIO.actor_email,
        actor_ip=XMART_SCENARIO.actor_ip,
        disclosure=XMART_SCENARIO.disclosure,
        users_used=INITIAL_CAPACITIES.users.used,
        users_limit=INITIAL_CAPACITIES.users.limit,
        storage_used_gb=INITIAL_CAPACITIES.storage.used_gb,
        storage_limit_gb=INITIAL_CAPACITIES.storage.limit_gb,
        imeis_used=INITIAL_CAPACITIES.imeis.used,
        imeis_limit=INITIAL_CAPACITIES.imeis.limit,
    )
    XmartContractedModule.objects.bulk_create(
        [
            XmartContractedModule(
                workspace=workspace,
                name=module_name,
                position=position,
            )
            for position, module_name in enumerate(
                XMART_SCENARIO.modules,
                start=1,
            )
        ]
    )
    XmartDemoUser.objects.create(
        workspace=workspace,
        email=XMART_SCENARIO.target_user_email,
        role="Field operator",
    )
    XmartDemoDevice.objects.create(
        workspace=workspace,
        model_name=XMART_SCENARIO.device_model,
        synthetic_imei=XMART_SCENARIO.demo_imei,
    )
    initial_step = XMART_SCENARIO.workflow[0]
    XmartAuditEvent.objects.create(
        workspace=workspace,
        sequence=1,
        phase=initial_step.phase.value,
        event_type=XmartAuditEventType.WORKSPACE_REVIEWED,
        actor_email=XMART_SCENARIO.actor_email,
        subject_reference=XMART_SCENARIO.customer_name,
        source_ip=XMART_SCENARIO.actor_ip,
        reason=initial_step.visible_result,
    )
    return _workspace_queryset().get(id=workspace.id)


def _get_or_create_locked(
    visitor: VisitorSession,
) -> XmartDemoWorkspace:
    workspace = (
        XmartDemoWorkspace.objects.select_for_update()
        .filter(visitor_session=visitor)
        .first()
    )
    if workspace is None:
        return _create_demo(visitor)
    return _workspace_queryset().get(id=workspace.id)


def _append_audit_events(
    workspace: XmartDemoWorkspace,
    phase: XmartWorkflowPhase,
    events: tuple[tuple[XmartAuditEventType, str, str], ...],
) -> None:
    last_sequence = (
        workspace.audit_events.aggregate(
            last_sequence=models.Max("sequence")
        )["last_sequence"]
        or 0
    )
    XmartAuditEvent.objects.bulk_create(
        [
            XmartAuditEvent(
                workspace=workspace,
                sequence=last_sequence + offset,
                phase=phase.value,
                event_type=event_type,
                actor_email=workspace.actor_email,
                subject_reference=subject_reference,
                source_ip=workspace.actor_ip,
                reason=reason,
            )
            for offset, (
                event_type,
                subject_reference,
                reason,
            ) in enumerate(events, start=1)
        ]
    )


def _apply_user_access(
    workspace: XmartDemoWorkspace,
    now,
) -> None:
    target_user = workspace.target_user
    target_user.role = "Field operator"
    target_user.status = XmartUserStatus.ACTIVE
    target_user.seat_consumed = True
    target_user.verification_resends = 1
    target_user.activated_at = now
    target_user.save(
        update_fields=(
            "role",
            "status",
            "seat_consumed",
            "verification_resends",
            "activated_at",
        )
    )
    workspace.users_used = AFTER_USER_ACCESS.users.used
    _append_audit_events(
        workspace,
        XmartWorkflowPhase.USER_ACCESS,
        (
            (
                XmartAuditEventType.USER_ACTIVATED,
                target_user.email,
                "Activated Field operator access for Atlas Network Rollout.",
            ),
            (
                XmartAuditEventType.VERIFICATION_RESENT,
                target_user.email,
                (
                    "Recorded an in-app verification preview; no external "
                    "email was delivered."
                ),
            ),
        ),
    )


def _apply_device_assignment(
    workspace: XmartDemoWorkspace,
    now,
) -> None:
    device = workspace.device
    device.status = XmartDeviceStatus.ASSIGNED
    device.assigned_project = workspace.project_name
    device.assigned_at = now
    device.save(
        update_fields=(
            "status",
            "assigned_project",
            "assigned_at",
        )
    )
    workspace.imeis_used = AFTER_DEVICE_ASSIGNMENT.imeis.used
    _append_audit_events(
        workspace,
        XmartWorkflowPhase.DEVICE_ASSIGNMENT,
        (
            (
                XmartAuditEventType.DEVICE_ASSIGNED,
                device.synthetic_imei,
                (
                    f"Assigned {device.model_name} to "
                    f"{workspace.project_name}."
                ),
            ),
        ),
    )


def _apply_security_audit(workspace: XmartDemoWorkspace) -> None:
    _append_audit_events(
        workspace,
        XmartWorkflowPhase.SECURITY_AUDIT,
        (
            (
                XmartAuditEventType.SECURITY_AUDIT_REVIEWED,
                workspace.project_name,
                (
                    "Reviewed the fictional workspace, user-access, "
                    "verification, and device-assignment records."
                ),
            ),
        ),
    )


def _apply_workflow_complete(workspace: XmartDemoWorkspace) -> None:
    _append_audit_events(
        workspace,
        XmartWorkflowPhase.WORKFLOW_COMPLETE,
        (
            (
                XmartAuditEventType.WORKFLOW_COMPLETED,
                workspace.project_name,
                (
                    "Provisioning completed with 5/10 users and 9/15 "
                    "IMEIs allocated."
                ),
            ),
        ),
    )


@transaction.atomic
def seed_xmart_demo(
    visitor_session: VisitorSession,
) -> XmartDemoWorkspace:
    visitor = _lock_active_visitor(visitor_session.id)
    return _get_or_create_locked(visitor)


@transaction.atomic
def advance_xmart_demo(
    visitor_session: VisitorSession,
) -> tuple[XmartDemoWorkspace, bool]:
    visitor = _lock_active_visitor(visitor_session.id)
    workspace = _get_or_create_locked(visitor)
    next_phase = NEXT_PHASE.get(workspace.phase)
    if next_phase is None:
        return workspace, False

    now = timezone.now()
    if next_phase == XmartWorkflowPhase.USER_ACCESS:
        _apply_user_access(workspace, now)
    elif next_phase == XmartWorkflowPhase.DEVICE_ASSIGNMENT:
        _apply_device_assignment(workspace, now)
    elif next_phase == XmartWorkflowPhase.SECURITY_AUDIT:
        _apply_security_audit(workspace)
    elif next_phase == XmartWorkflowPhase.WORKFLOW_COMPLETE:
        _apply_workflow_complete(workspace)

    workspace.phase = next_phase.value
    workspace.save(
        update_fields=(
            "phase",
            "users_used",
            "imeis_used",
            "updated_at",
        )
    )
    return _workspace_queryset().get(id=workspace.id), True


@transaction.atomic
def reset_xmart_demo(
    visitor_session: VisitorSession,
) -> XmartDemoWorkspace:
    visitor = _lock_active_visitor(visitor_session.id)
    XmartDemoWorkspace.objects.filter(visitor_session=visitor).delete()
    return _create_demo(visitor)
