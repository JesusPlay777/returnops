from rest_framework import serializers

from energybil.models import (
    EnergyDemoAccount,
    EnergyInvoice,
    EnergyMeter,
    EnergyWorkflowEvent,
)
from energybil.services import NEXT_PHASE


class EnergyMeterSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyMeter
        fields = (
            "serial_number",
            "label",
            "previous_reading_kwh",
            "current_reading_kwh",
            "received_at",
        )


class EnergyInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyInvoice
        fields = (
            "invoice_number",
            "period_start",
            "period_end",
            "due_date",
            "consumption_kwh",
            "energy_charge",
            "subtotal",
            "tax",
            "total",
            "issued_at",
            "notification_preview",
            "notification_simulated_at",
        )


class EnergyWorkflowEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyWorkflowEvent
        fields = ("id", "phase", "title", "detail", "occurred_at")


class EnergyDemoSerializer(serializers.ModelSerializer):
    meter = EnergyMeterSerializer(read_only=True)
    invoice = EnergyInvoiceSerializer(read_only=True)
    events = EnergyWorkflowEventSerializer(many=True, read_only=True)
    next_phase = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    did_advance = serializers.SerializerMethodField()

    class Meta:
        model = EnergyDemoAccount
        fields = (
            "account_reference",
            "customer_name",
            "property_name",
            "service_address",
            "currency",
            "tariff_rate",
            "fixed_charge",
            "tax_rate",
            "phase",
            "next_phase",
            "is_complete",
            "did_advance",
            "meter",
            "invoice",
            "events",
            "updated_at",
        )

    def get_next_phase(self, instance: EnergyDemoAccount) -> str | None:
        return NEXT_PHASE.get(instance.phase)

    def get_is_complete(self, instance: EnergyDemoAccount) -> bool:
        return instance.phase not in NEXT_PHASE

    def get_did_advance(self, instance: EnergyDemoAccount) -> bool:
        return bool(self.context.get("did_advance", False))
