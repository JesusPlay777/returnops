import uuid
from decimal import Decimal

from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class ReturnStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    NEEDS_INFORMATION = "NEEDS_INFORMATION", "Needs information"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class EventActor(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    OPERATIONS = "OPERATIONS", "Operations"
    SYSTEM = "SYSTEM", "System"


class ReturnReason(models.TextChoices):
    DAMAGED = "DAMAGED", "Damaged"
    WRONG_ITEM = "WRONG_ITEM", "Wrong item"
    NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED", "Not as described"
    NO_LONGER_NEEDED = "NO_LONGER_NEEDED", "No longer needed"
    OTHER = "OTHER", "Other"


class EvidenceKind(models.TextChoices):
    PRODUCT_PHOTO = "PRODUCT_PHOTO", "Product photo"
    SERIAL_LABEL = "SERIAL_LABEL", "Serial label"
    RECEIPT = "RECEIPT", "Receipt"


reference_validator = RegexValidator(
    regex=r"^RTN-[0-9]{3,}$",
    message="Reference must use the RTN-000 format.",
)

asset_key_validator = RegexValidator(
    regex=r"^[a-z0-9][a-z0-9/_.-]*$",
    message="Asset key must be a normalized relative identifier.",
)


class VisitorSession(models.Model):
    """Server-resolved sandbox that owns one visitor's fictional dataset."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(editable=False)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("expires_at",), name="ret_vis_expires_idx"),
        )
        constraints = (
            models.CheckConstraint(
                condition=models.Q(expires_at__gt=models.F("created_at")),
                name="ret_vis_expiry_after_created",
            ),
        )

    def __str__(self) -> str:
        return str(self.id)

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()


class ReturnRequest(models.Model):
    """Aggregate root for a fictional return request."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor_session = models.ForeignKey(
        VisitorSession,
        on_delete=models.CASCADE,
        related_name="return_requests",
        editable=False,
    )
    reference = models.CharField(
        max_length=20,
        validators=(reference_validator,),
        editable=False,
    )
    order_reference = models.CharField(max_length=40)
    customer_name = models.CharField(max_length=120)
    customer_email = models.EmailField(max_length=254)
    status = models.CharField(
        max_length=32,
        choices=ReturnStatus.choices,
        default=ReturnStatus.DRAFT,
        editable=False,
    )
    currency = models.CharField(max_length=3, default="USD", editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at", "-created_at")
        indexes = (
            models.Index(
                fields=("visitor_session", "status", "-updated_at"),
                name="ret_req_vis_status_upd_idx",
            ),
            models.Index(
                fields=("visitor_session", "-created_at"),
                name="ret_req_vis_created_idx",
            ),
            models.Index(
                fields=("reference",),
                name="ret_req_reference_idx",
            ),
        )
        constraints = (
            models.UniqueConstraint(
                fields=("visitor_session", "reference"),
                name="ret_req_unique_vis_reference",
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=ReturnStatus.values),
                name="ret_req_status_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(currency="USD"),
                name="ret_req_currency_usd",
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(reference="")
                    & ~models.Q(order_reference="")
                    & ~models.Q(customer_name="")
                    & ~models.Q(customer_email="")
                ),
                name="ret_req_required_text",
            ),
        )

    def __str__(self) -> str:
        return self.reference

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            ReturnStatus.APPROVED,
            ReturnStatus.REJECTED,
        }

    @property
    def is_customer_editable(self) -> bool:
        return self.status in {
            ReturnStatus.DRAFT,
            ReturnStatus.NEEDS_INFORMATION,
        }


class ReturnItem(models.Model):
    """One fictional product line within a return request."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_request = models.ForeignKey(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="items",
        editable=False,
    )
    sku = models.CharField(max_length=64)
    product_name = models.CharField(max_length=160)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=32, choices=ReturnReason.choices)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)
        indexes = (
            models.Index(
                fields=("return_request", "created_at"),
                name="ret_item_req_created_idx",
            ),
        )
        constraints = (
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="ret_item_quantity_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0),
                name="ret_item_price_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(reason__in=ReturnReason.values),
                name="ret_item_reason_valid",
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(sku="")
                    & ~models.Q(product_name="")
                ),
                name="ret_item_required_text",
            ),
        )

    def __str__(self) -> str:
        return f"{self.sku} — {self.product_name}"

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity


class Evidence(models.Model):
    """Reference to a curated fictional evidence asset."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_item = models.ForeignKey(
        ReturnItem,
        on_delete=models.CASCADE,
        related_name="evidence",
        editable=False,
    )
    kind = models.CharField(max_length=32, choices=EvidenceKind.choices)
    asset_key = models.CharField(
        max_length=160,
        validators=(asset_key_validator,),
    )
    caption = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = (
            models.Index(
                fields=("return_item", "created_at"),
                name="ret_evid_item_created_idx",
            ),
        )
        constraints = (
            models.UniqueConstraint(
                fields=("return_item", "asset_key"),
                name="ret_evid_unique_item_asset",
            ),
            models.CheckConstraint(
                condition=models.Q(kind__in=EvidenceKind.values),
                name="ret_evid_kind_valid",
            ),
            models.CheckConstraint(
                condition=~models.Q(asset_key=""),
                name="ret_evid_asset_required",
            ),
        )

    def __str__(self) -> str:
        return f"{self.get_kind_display()}: {self.asset_key}"


class StatusEvent(models.Model):
    """Append-only record of creation or a valid status transition."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_request = models.ForeignKey(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="status_events",
        editable=False,
    )
    from_status = models.CharField(
        max_length=32,
        choices=ReturnStatus.choices,
        null=True,
        blank=True,
        editable=False,
    )
    to_status = models.CharField(
        max_length=32,
        choices=ReturnStatus.choices,
        editable=False,
    )
    actor = models.CharField(
        max_length=16,
        choices=EventActor.choices,
        editable=False,
    )
    note = models.TextField(blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = (
            models.Index(
                fields=("return_request", "created_at"),
                name="ret_event_req_created_idx",
            ),
        )
        constraints = (
            models.CheckConstraint(
                condition=(
                    models.Q(from_status__isnull=True)
                    | models.Q(from_status__in=ReturnStatus.values)
                ),
                name="ret_evt_from_status_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(to_status__in=ReturnStatus.values),
                name="ret_evt_to_status_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(actor__in=EventActor.values),
                name="ret_evt_actor_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        from_status__isnull=True,
                        to_status=ReturnStatus.DRAFT,
                    )
                    | models.Q(
                        from_status=ReturnStatus.DRAFT,
                        to_status=ReturnStatus.SUBMITTED,
                    )
                    | models.Q(
                        from_status=ReturnStatus.SUBMITTED,
                        to_status=ReturnStatus.NEEDS_INFORMATION,
                    )
                    | models.Q(
                        from_status=ReturnStatus.SUBMITTED,
                        to_status=ReturnStatus.APPROVED,
                    )
                    | models.Q(
                        from_status=ReturnStatus.SUBMITTED,
                        to_status=ReturnStatus.REJECTED,
                    )
                    | models.Q(
                        from_status=ReturnStatus.NEEDS_INFORMATION,
                        to_status=ReturnStatus.SUBMITTED,
                    )
                ),
                name="ret_evt_transition_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        from_status__isnull=True,
                        to_status=ReturnStatus.DRAFT,
                        actor=EventActor.SYSTEM,
                    )
                    | models.Q(
                        from_status=ReturnStatus.DRAFT,
                        to_status=ReturnStatus.SUBMITTED,
                        actor=EventActor.CUSTOMER,
                    )
                    | models.Q(
                        from_status=ReturnStatus.NEEDS_INFORMATION,
                        to_status=ReturnStatus.SUBMITTED,
                        actor=EventActor.CUSTOMER,
                    )
                    | models.Q(
                        from_status=ReturnStatus.SUBMITTED,
                        to_status__in=(
                            ReturnStatus.NEEDS_INFORMATION,
                            ReturnStatus.APPROVED,
                            ReturnStatus.REJECTED,
                        ),
                        actor=EventActor.OPERATIONS,
                    )
                ),
                name="ret_evt_actor_transition_valid",
            ),
            models.CheckConstraint(
                condition=(
                    (
                        ~models.Q(
                            to_status__in=(
                                ReturnStatus.NEEDS_INFORMATION,
                                ReturnStatus.REJECTED,
                            ),
                        )
                        | ~models.Q(note="")
                    )
                    & (
                        ~models.Q(
                            from_status=ReturnStatus.NEEDS_INFORMATION,
                            to_status=ReturnStatus.SUBMITTED,
                        )
                        | ~models.Q(note="")
                    )
                ),
                name="ret_evt_note_required",
            ),
        )

    def __str__(self) -> str:
        source = self.from_status or "CREATED"
        return f"{self.return_request.reference}: {source} → {self.to_status}"
