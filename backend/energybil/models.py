import uuid

from django.db import models

from returns.models import VisitorSession


class EnergyWorkflowPhase(models.TextChoices):
    READING_RECEIVED = "READING_RECEIVED", "Reading received"
    READING_VALIDATED = "READING_VALIDATED", "Reading validated"
    CONSUMPTION_CALCULATED = (
        "CONSUMPTION_CALCULATED",
        "Consumption calculated",
    )
    INVOICE_ISSUED = "INVOICE_ISSUED", "Invoice issued"
    NOTIFICATION_SIMULATED = (
        "NOTIFICATION_SIMULATED",
        "Notification simulated",
    )


class EnergyDemoAccount(models.Model):
    """One isolated, fictional Energybil scenario per browser visitor."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor_session = models.OneToOneField(
        VisitorSession,
        on_delete=models.CASCADE,
        related_name="energybil_demo",
        editable=False,
    )
    account_reference = models.CharField(max_length=32, editable=False)
    customer_name = models.CharField(max_length=120, editable=False)
    property_name = models.CharField(max_length=120, editable=False)
    service_address = models.CharField(max_length=200, editable=False)
    currency = models.CharField(max_length=3, default="USD", editable=False)
    tariff_rate = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        editable=False,
    )
    fixed_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        editable=False,
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        editable=False,
    )
    phase = models.CharField(
        max_length=32,
        choices=EnergyWorkflowPhase.choices,
        default=EnergyWorkflowPhase.READING_RECEIVED,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.CheckConstraint(
                condition=models.Q(currency="USD"),
                name="enb_account_currency_usd",
            ),
            models.CheckConstraint(
                condition=models.Q(tariff_rate__gt=0),
                name="enb_account_rate_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(fixed_charge__gte=0),
                name="enb_account_fixed_nonneg",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(tax_rate__gte=0)
                    & models.Q(tax_rate__lte=1)
                ),
                name="enb_account_tax_range",
            ),
            models.CheckConstraint(
                condition=models.Q(phase__in=EnergyWorkflowPhase.values),
                name="enb_account_phase_valid",
            ),
        )

    def __str__(self) -> str:
        return self.account_reference


class EnergyMeter(models.Model):
    """Fictional gateway meter and the two readings used for billing."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField(
        EnergyDemoAccount,
        on_delete=models.CASCADE,
        related_name="meter",
        editable=False,
    )
    serial_number = models.CharField(max_length=48, editable=False)
    label = models.CharField(max_length=100, editable=False)
    previous_reading_kwh = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        editable=False,
    )
    current_reading_kwh = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        editable=False,
    )
    received_at = models.DateTimeField(editable=False)

    class Meta:
        constraints = (
            models.CheckConstraint(
                condition=models.Q(previous_reading_kwh__gte=0),
                name="enb_meter_previous_nonneg",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    current_reading_kwh__gte=models.F(
                        "previous_reading_kwh"
                    )
                ),
                name="enb_meter_monotonic",
            ),
        )

    def __str__(self) -> str:
        return self.serial_number


class EnergyInvoice(models.Model):
    """Computed invoice preview produced by the synchronous workflow."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField(
        EnergyDemoAccount,
        on_delete=models.CASCADE,
        related_name="invoice",
        editable=False,
    )
    invoice_number = models.CharField(max_length=40, editable=False)
    period_start = models.DateField(editable=False)
    period_end = models.DateField(editable=False)
    due_date = models.DateField(editable=False)
    consumption_kwh = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0,
        editable=False,
    )
    energy_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
    )
    tax = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
    )
    issued_at = models.DateTimeField(null=True, editable=False)
    notification_preview = models.TextField(blank=True, editable=False)
    notification_simulated_at = models.DateTimeField(
        null=True,
        editable=False,
    )

    class Meta:
        constraints = (
            models.CheckConstraint(
                condition=models.Q(consumption_kwh__gte=0),
                name="enb_invoice_usage_nonneg",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(energy_charge__gte=0)
                    & models.Q(subtotal__gte=0)
                    & models.Q(tax__gte=0)
                    & models.Q(total__gte=0)
                ),
                name="enb_invoice_amounts_nonneg",
            ),
            models.CheckConstraint(
                condition=models.Q(period_end__gte=models.F("period_start")),
                name="enb_invoice_period_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(due_date__gt=models.F("period_end")),
                name="enb_invoice_due_after_period",
            ),
        )

    def __str__(self) -> str:
        return self.invoice_number


class EnergyWorkflowEvent(models.Model):
    """Auditable timeline entry for each completed synchronous stage."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        EnergyDemoAccount,
        on_delete=models.CASCADE,
        related_name="events",
        editable=False,
    )
    phase = models.CharField(
        max_length=32,
        choices=EnergyWorkflowPhase.choices,
        editable=False,
    )
    title = models.CharField(max_length=120, editable=False)
    detail = models.CharField(max_length=280, editable=False)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("occurred_at", "id")
        constraints = (
            models.UniqueConstraint(
                fields=("account", "phase"),
                name="enb_event_unique_phase",
            ),
            models.CheckConstraint(
                condition=models.Q(phase__in=EnergyWorkflowPhase.values),
                name="enb_event_phase_valid",
            ),
        )

    def __str__(self) -> str:
        return f"{self.account.account_reference}: {self.phase}"
