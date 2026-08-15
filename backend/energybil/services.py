from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from energybil.models import (
    EnergyDemoAccount,
    EnergyInvoice,
    EnergyMeter,
    EnergyWorkflowEvent,
    EnergyWorkflowPhase,
)
from returns.models import VisitorSession
from returns.services.visitor_sessions import VisitorSessionRequired


MONEY = Decimal("0.01")

NEXT_PHASE = {
    EnergyWorkflowPhase.READING_RECEIVED: (
        EnergyWorkflowPhase.READING_VALIDATED
    ),
    EnergyWorkflowPhase.READING_VALIDATED: (
        EnergyWorkflowPhase.CONSUMPTION_CALCULATED
    ),
    EnergyWorkflowPhase.CONSUMPTION_CALCULATED: (
        EnergyWorkflowPhase.INVOICE_ISSUED
    ),
    EnergyWorkflowPhase.INVOICE_ISSUED: (
        EnergyWorkflowPhase.NOTIFICATION_SIMULATED
    ),
}

EVENT_COPY = {
    EnergyWorkflowPhase.READING_RECEIVED: (
        "Gateway reading received",
        "A fictional smart-meter payload entered the processing boundary.",
    ),
    EnergyWorkflowPhase.READING_VALIDATED: (
        "Reading validated",
        "Timestamp, duplicate, and monotonic-value checks passed.",
    ),
    EnergyWorkflowPhase.CONSUMPTION_CALCULATED: (
        "Consumption calculated",
        "The current and previous readings produced billable usage.",
    ),
    EnergyWorkflowPhase.INVOICE_ISSUED: (
        "Invoice issued",
        "Tariff, service charge, and tax were applied transactionally.",
    ),
    EnergyWorkflowPhase.NOTIFICATION_SIMULATED: (
        "Notification simulated",
        "An in-app delivery preview replaced an external email worker.",
    ),
}


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def _lock_active_visitor(visitor_id) -> VisitorSession:
    try:
        visitor = VisitorSession.objects.select_for_update().get(id=visitor_id)
    except VisitorSession.DoesNotExist as error:
        raise VisitorSessionRequired from error
    if visitor.expires_at <= timezone.now():
        raise VisitorSessionRequired
    return visitor


def _billing_dates(today: date) -> tuple[date, date, date]:
    period_end = today.replace(day=1) - timedelta(days=1)
    period_start = period_end.replace(day=1)
    due_date = period_end + timedelta(days=21)
    return period_start, period_end, due_date


def _account_queryset():
    return EnergyDemoAccount.objects.select_related(
        "meter",
        "invoice",
    ).prefetch_related("events")


def _create_demo(visitor: VisitorSession) -> EnergyDemoAccount:
    today = timezone.localdate()
    period_start, period_end, due_date = _billing_dates(today)
    account = EnergyDemoAccount.objects.create(
        visitor_session=visitor,
        account_reference="EB-1042",
        customer_name="Maya Torres",
        property_name="Riverside Operations Center",
        service_address="1480 Harbor Avenue · Building C",
        tariff_rate=Decimal("0.1675"),
        fixed_charge=Decimal("9.50"),
        tax_rate=Decimal("0.0700"),
    )
    EnergyMeter.objects.create(
        account=account,
        serial_number="GW-84A-01927",
        label="Main facility meter",
        previous_reading_kwh=Decimal("17800.500"),
        current_reading_kwh=Decimal("18142.800"),
        received_at=timezone.now() - timedelta(minutes=4),
    )
    EnergyInvoice.objects.create(
        account=account,
        invoice_number=(
            f"EBI-{period_end:%Y%m}-{account.account_reference[-4:]}"
        ),
        period_start=period_start,
        period_end=period_end,
        due_date=due_date,
    )
    title, detail = EVENT_COPY[EnergyWorkflowPhase.READING_RECEIVED]
    EnergyWorkflowEvent.objects.create(
        account=account,
        phase=EnergyWorkflowPhase.READING_RECEIVED,
        title=title,
        detail=detail,
    )
    return _account_queryset().get(id=account.id)


def _get_or_create_locked(visitor: VisitorSession) -> EnergyDemoAccount:
    account = _account_queryset().filter(visitor_session=visitor).first()
    return account or _create_demo(visitor)


@transaction.atomic
def seed_energy_demo(visitor_session: VisitorSession) -> EnergyDemoAccount:
    visitor = _lock_active_visitor(visitor_session.id)
    return _get_or_create_locked(visitor)


@transaction.atomic
def advance_energy_demo(
    visitor_session: VisitorSession,
) -> tuple[EnergyDemoAccount, bool]:
    visitor = _lock_active_visitor(visitor_session.id)
    account = _get_or_create_locked(visitor)
    next_phase = NEXT_PHASE.get(account.phase)
    if next_phase is None:
        return account, False

    invoice = account.invoice
    now = timezone.now()

    if next_phase == EnergyWorkflowPhase.CONSUMPTION_CALCULATED:
        consumption = (
            account.meter.current_reading_kwh
            - account.meter.previous_reading_kwh
        )
        energy_charge = _money(consumption * account.tariff_rate)
        subtotal = _money(energy_charge + account.fixed_charge)
        tax = _money(subtotal * account.tax_rate)
        invoice.consumption_kwh = consumption
        invoice.energy_charge = energy_charge
        invoice.subtotal = subtotal
        invoice.tax = tax
        invoice.total = _money(subtotal + tax)
        invoice.save(
            update_fields=(
                "consumption_kwh",
                "energy_charge",
                "subtotal",
                "tax",
                "total",
            )
        )
    elif next_phase == EnergyWorkflowPhase.INVOICE_ISSUED:
        invoice.issued_at = now
        invoice.save(update_fields=("issued_at",))
    elif next_phase == EnergyWorkflowPhase.NOTIFICATION_SIMULATED:
        invoice.notification_preview = (
            f"Energybil invoice {invoice.invoice_number} is ready. "
            f"Amount due: {account.currency} {invoice.total}."
        )
        invoice.notification_simulated_at = now
        invoice.save(
            update_fields=(
                "notification_preview",
                "notification_simulated_at",
            )
        )

    account.phase = next_phase
    account.save(update_fields=("phase", "updated_at"))
    title, detail = EVENT_COPY[next_phase]
    EnergyWorkflowEvent.objects.create(
        account=account,
        phase=next_phase,
        title=title,
        detail=detail,
    )
    return _account_queryset().get(id=account.id), True


@transaction.atomic
def reset_energy_demo(visitor_session: VisitorSession) -> EnergyDemoAccount:
    visitor = _lock_active_visitor(visitor_session.id)
    EnergyDemoAccount.objects.filter(visitor_session=visitor).delete()
    return _create_demo(visitor)
