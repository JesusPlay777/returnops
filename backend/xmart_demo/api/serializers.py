from rest_framework import serializers

from xmart_demo.models import (
    XmartAuditEvent,
    XmartContractedModule,
    XmartDemoDevice,
    XmartDemoUser,
    XmartDemoWorkspace,
)
from xmart_demo.services import NEXT_PHASE


class XmartCountCapacitySerializer(serializers.Serializer):
    used = serializers.IntegerField(read_only=True)
    limit = serializers.IntegerField(read_only=True)


class XmartStorageCapacitySerializer(serializers.Serializer):
    used = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        read_only=True,
    )
    limit = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        read_only=True,
    )
    unit = serializers.CharField(read_only=True)


class XmartCapacitiesSerializer(serializers.Serializer):
    users = XmartCountCapacitySerializer(read_only=True)
    storage = XmartStorageCapacitySerializer(read_only=True)
    imeis = XmartCountCapacitySerializer(read_only=True)

    def to_representation(self, instance: XmartDemoWorkspace) -> dict:
        return {
            "users": {
                "used": instance.users_used,
                "limit": instance.users_limit,
            },
            "storage": {
                "used": f"{instance.storage_used_gb:.2f}",
                "limit": f"{instance.storage_limit_gb:.2f}",
                "unit": "GB",
            },
            "imeis": {
                "used": instance.imeis_used,
                "limit": instance.imeis_limit,
            },
        }


class XmartContractedModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = XmartContractedModule
        fields = ("name", "position")


class XmartDemoUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = XmartDemoUser
        fields = (
            "email",
            "role",
            "status",
            "seat_consumed",
            "verification_resends",
            "activated_at",
        )


class XmartDemoDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = XmartDemoDevice
        fields = (
            "model_name",
            "synthetic_imei",
            "status",
            "assigned_project",
            "assigned_at",
        )


class XmartAuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = XmartAuditEvent
        fields = (
            "id",
            "sequence",
            "phase",
            "event_type",
            "actor_email",
            "subject_reference",
            "source_ip",
            "reason",
            "occurred_at",
        )


class XmartDemoSerializer(serializers.ModelSerializer):
    capacities = XmartCapacitiesSerializer(source="*", read_only=True)
    modules = XmartContractedModuleSerializer(many=True, read_only=True)
    target_user = XmartDemoUserSerializer(read_only=True)
    device = XmartDemoDeviceSerializer(read_only=True)
    audit_events = XmartAuditEventSerializer(many=True, read_only=True)
    next_phase = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    did_advance = serializers.SerializerMethodField()

    class Meta:
        model = XmartDemoWorkspace
        fields = (
            "customer_name",
            "project_name",
            "actor_email",
            "actor_ip",
            "disclosure",
            "phase",
            "next_phase",
            "is_complete",
            "did_advance",
            "capacities",
            "modules",
            "target_user",
            "device",
            "audit_events",
            "updated_at",
        )

    def get_next_phase(self, instance: XmartDemoWorkspace) -> str | None:
        next_phase = NEXT_PHASE.get(instance.phase)
        return next_phase.value if next_phase is not None else None

    def get_is_complete(self, instance: XmartDemoWorkspace) -> bool:
        return instance.phase not in NEXT_PHASE

    def get_did_advance(self, instance: XmartDemoWorkspace) -> bool:
        return bool(self.context.get("did_advance", False))
