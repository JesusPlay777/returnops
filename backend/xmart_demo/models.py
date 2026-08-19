import uuid

from django.db import models

from returns.models import VisitorSession
from xmart_demo.scenario import XmartWorkflowPhase


WORKFLOW_PHASE_CHOICES = tuple(
    (phase.value, phase.value.replace("_", " ").title())
    for phase in XmartWorkflowPhase
)
WORKFLOW_PHASE_VALUES = tuple(phase.value for phase in XmartWorkflowPhase)


class XmartUserStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACTIVE = "ACTIVE", "Active"


class XmartDeviceStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    ASSIGNED = "ASSIGNED", "Assigned"


class XmartAuditEventType(models.TextChoices):
    WORKSPACE_REVIEWED = "WORKSPACE_REVIEWED", "Workspace reviewed"
    USER_ACTIVATED = "USER_ACTIVATED", "User activated"
    VERIFICATION_RESENT = (
        "VERIFICATION_RESENT",
        "Verification resent",
    )
    DEVICE_ASSIGNED = "DEVICE_ASSIGNED", "Device assigned"
    SECURITY_AUDIT_REVIEWED = (
        "SECURITY_AUDIT_REVIEWED",
        "Security audit reviewed",
    )
    WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED", "Workflow completed"


class XmartDemoWorkspace(models.Model):
    """Aggregate root for one visitor-owned Xmart provisioning scenario."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor_session = models.OneToOneField(
        VisitorSession,
        on_delete=models.CASCADE,
        related_name="xmart_demo",
        editable=False,
    )
    customer_name = models.CharField(max_length=120, editable=False)
    project_name = models.CharField(max_length=120, editable=False)
    actor_email = models.EmailField(max_length=254, editable=False)
    actor_ip = models.GenericIPAddressField(
        protocol="IPv4",
        unpack_ipv4=False,
        editable=False,
    )
    disclosure = models.TextField(editable=False)
    phase = models.CharField(
        max_length=32,
        choices=WORKFLOW_PHASE_CHOICES,
        default=XmartWorkflowPhase.CUSTOMER_WORKSPACE.value,
        editable=False,
    )
    users_used = models.PositiveSmallIntegerField(editable=False)
    users_limit = models.PositiveSmallIntegerField(editable=False)
    storage_used_gb = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        editable=False,
    )
    storage_limit_gb = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        editable=False,
    )
    imeis_used = models.PositiveSmallIntegerField(editable=False)
    imeis_limit = models.PositiveSmallIntegerField(editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.CheckConstraint(
                condition=(
                    models.Q(users_limit__gt=0)
                    & models.Q(users_used__lte=models.F("users_limit"))
                ),
                name="xmt_ws_users_range",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(storage_used_gb__gte=0)
                    & models.Q(storage_limit_gb__gt=0)
                    & models.Q(
                        storage_used_gb__lte=models.F("storage_limit_gb")
                    )
                ),
                name="xmt_ws_storage_range",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(imeis_limit__gt=0)
                    & models.Q(imeis_used__lte=models.F("imeis_limit"))
                ),
                name="xmt_ws_imeis_range",
            ),
            models.CheckConstraint(
                condition=models.Q(phase__in=WORKFLOW_PHASE_VALUES),
                name="xmt_ws_phase_valid",
            ),
        )

    def __str__(self) -> str:
        return f"{self.customer_name} · {self.project_name}"


class XmartContractedModule(models.Model):
    """Ordered module entitlement belonging to the fictional customer."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        XmartDemoWorkspace,
        on_delete=models.CASCADE,
        related_name="modules",
        editable=False,
    )
    name = models.CharField(max_length=80, editable=False)
    position = models.PositiveSmallIntegerField(editable=False)

    class Meta:
        ordering = ("position", "name")
        constraints = (
            models.UniqueConstraint(
                fields=("workspace", "name"),
                name="xmt_module_unique_name",
            ),
            models.UniqueConstraint(
                fields=("workspace", "position"),
                name="xmt_module_unique_position",
            ),
        )

    def __str__(self) -> str:
        return self.name


class XmartDemoUser(models.Model):
    """Target operator whose activation will consume one user seat."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(
        XmartDemoWorkspace,
        on_delete=models.CASCADE,
        related_name="target_user",
        editable=False,
    )
    email = models.EmailField(max_length=254, editable=False)
    role = models.CharField(max_length=80, editable=False)
    status = models.CharField(
        max_length=16,
        choices=XmartUserStatus.choices,
        default=XmartUserStatus.PENDING,
        editable=False,
    )
    seat_consumed = models.BooleanField(default=False, editable=False)
    verification_resends = models.PositiveSmallIntegerField(
        default=0,
        editable=False,
    )
    activated_at = models.DateTimeField(null=True, editable=False)

    class Meta:
        constraints = (
            models.CheckConstraint(
                condition=models.Q(status__in=XmartUserStatus.values),
                name="xmt_user_status_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(seat_consumed=False)
                    | models.Q(status=XmartUserStatus.ACTIVE)
                ),
                name="xmt_user_seat_active",
            ),
        )

    def __str__(self) -> str:
        return self.email


class XmartDemoDevice(models.Model):
    """Synthetic device available for assignment during the demo."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(
        XmartDemoWorkspace,
        on_delete=models.CASCADE,
        related_name="device",
        editable=False,
    )
    model_name = models.CharField(max_length=120, editable=False)
    synthetic_imei = models.CharField(max_length=48, editable=False)
    status = models.CharField(
        max_length=16,
        choices=XmartDeviceStatus.choices,
        default=XmartDeviceStatus.AVAILABLE,
        editable=False,
    )
    assigned_project = models.CharField(
        max_length=120,
        blank=True,
        editable=False,
    )
    assigned_at = models.DateTimeField(null=True, editable=False)

    class Meta:
        constraints = (
            models.CheckConstraint(
                condition=models.Q(status__in=XmartDeviceStatus.values),
                name="xmt_device_status_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        status=XmartDeviceStatus.AVAILABLE,
                        assigned_project="",
                        assigned_at__isnull=True,
                    )
                    | (
                        models.Q(
                            status=XmartDeviceStatus.ASSIGNED,
                            assigned_at__isnull=False,
                        )
                        & ~models.Q(assigned_project="")
                    )
                ),
                name="xmt_device_assignment_valid",
            ),
        )

    def __str__(self) -> str:
        return self.synthetic_imei


class XmartAuditEvent(models.Model):
    """Ordered security record produced by the synchronous workflow."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        XmartDemoWorkspace,
        on_delete=models.CASCADE,
        related_name="audit_events",
        editable=False,
    )
    sequence = models.PositiveSmallIntegerField(editable=False)
    phase = models.CharField(
        max_length=32,
        choices=WORKFLOW_PHASE_CHOICES,
        editable=False,
    )
    event_type = models.CharField(
        max_length=32,
        choices=XmartAuditEventType.choices,
        editable=False,
    )
    actor_email = models.EmailField(max_length=254, editable=False)
    subject_reference = models.CharField(max_length=254, editable=False)
    source_ip = models.GenericIPAddressField(
        protocol="IPv4",
        unpack_ipv4=False,
        editable=False,
    )
    reason = models.CharField(max_length=280, editable=False)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sequence", "occurred_at", "id")
        indexes = (
            models.Index(
                fields=("workspace", "occurred_at"),
                name="xmt_event_ws_time_idx",
            ),
        )
        constraints = (
            models.UniqueConstraint(
                fields=("workspace", "sequence"),
                name="xmt_event_unique_sequence",
            ),
            models.CheckConstraint(
                condition=models.Q(phase__in=WORKFLOW_PHASE_VALUES),
                name="xmt_event_phase_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    event_type__in=XmartAuditEventType.values
                ),
                name="xmt_event_type_valid",
            ),
        )

    def __str__(self) -> str:
        return f"{self.sequence}: {self.event_type}"
