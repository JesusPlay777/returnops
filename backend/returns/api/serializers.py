from decimal import Decimal

from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail

from returns.models import (
    Evidence,
    EvidenceKind,
    ReturnItem,
    ReturnReason,
    ReturnRequest,
    ReturnStatus,
    StatusEvent,
)


class StrictInputMixin:
    """Reject unknown and server-controlled fields instead of ignoring them."""

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown_fields = sorted(
                set(data.keys()) - set(self.fields.keys()),
            )
            if unknown_fields:
                raise serializers.ValidationError(
                    {
                        field: [
                            ErrorDetail(
                                "This field is not accepted.",
                                code="unknown_field",
                            )
                        ]
                        for field in unknown_fields
                    }
                )
        return super().to_internal_value(data)


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = (
            "id",
            "kind",
            "asset_key",
            "caption",
            "created_at",
        )
        read_only_fields = fields


class ReturnItemSerializer(serializers.ModelSerializer):
    evidence = EvidenceSerializer(many=True, read_only=True)
    line_total = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ReturnItem
        fields = (
            "id",
            "sku",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
            "reason",
            "details",
            "evidence",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class StatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusEvent
        fields = (
            "id",
            "from_status",
            "to_status",
            "actor",
            "note",
            "created_at",
        )
        read_only_fields = fields


class ReturnRequestSummarySerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True)
    total_value = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ReturnRequest
        fields = (
            "id",
            "reference",
            "customer_name",
            "item_count",
            "total_value",
            "currency",
            "status",
            "updated_at",
        )
        read_only_fields = fields


class ReturnRequestDetailSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True)
    total_value = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    items = ReturnItemSerializer(many=True, read_only=True)
    status_events = StatusEventSerializer(many=True, read_only=True)

    class Meta:
        model = ReturnRequest
        fields = (
            "id",
            "reference",
            "order_reference",
            "customer_name",
            "customer_email",
            "item_count",
            "total_value",
            "currency",
            "status",
            "items",
            "status_events",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ReturnRequestWriteSerializer(
    StrictInputMixin,
    serializers.ModelSerializer,
):
    class Meta:
        model = ReturnRequest
        fields = (
            "order_reference",
            "customer_name",
            "customer_email",
        )
        extra_kwargs = {
            "order_reference": {"trim_whitespace": True},
            "customer_name": {"trim_whitespace": True},
            "customer_email": {"trim_whitespace": True},
        }


class ReturnItemWriteSerializer(
    StrictInputMixin,
    serializers.ModelSerializer,
):
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )
    reason = serializers.ChoiceField(choices=ReturnReason.choices)

    class Meta:
        model = ReturnItem
        fields = (
            "sku",
            "product_name",
            "quantity",
            "unit_price",
            "reason",
            "details",
        )
        extra_kwargs = {
            "sku": {"trim_whitespace": True},
            "product_name": {"trim_whitespace": True},
            "details": {"trim_whitespace": True},
        }


class EvidenceWriteSerializer(
    StrictInputMixin,
    serializers.ModelSerializer,
):
    kind = serializers.ChoiceField(choices=EvidenceKind.choices)

    class Meta:
        model = Evidence
        fields = (
            "kind",
            "asset_key",
            "caption",
        )
        extra_kwargs = {
            "asset_key": {"trim_whitespace": True},
            "caption": {"trim_whitespace": True},
        }


class SubmitReturnSerializer(
    StrictInputMixin,
    serializers.Serializer,
):
    response_note = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )


class OperationsTransitionSerializer(
    StrictInputMixin,
    serializers.Serializer,
):
    target_status = serializers.ChoiceField(
        choices=(
            ReturnStatus.NEEDS_INFORMATION,
            ReturnStatus.APPROVED,
            ReturnStatus.REJECTED,
        ),
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        note_required = attrs["target_status"] in {
            ReturnStatus.NEEDS_INFORMATION,
            ReturnStatus.REJECTED,
        }
        if note_required and not attrs["note"]:
            raise serializers.ValidationError(
                {
                    "note": ErrorDetail(
                        "A note is required for this transition.",
                        code="transition_note_required",
                    )
                }
            )
        return attrs


class OperationsQueueQuerySerializer(
    StrictInputMixin,
    serializers.Serializer,
):
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=120,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        required=False,
        allow_null=True,
        choices=(
            ReturnStatus.SUBMITTED,
            ReturnStatus.NEEDS_INFORMATION,
            ReturnStatus.APPROVED,
            ReturnStatus.REJECTED,
        ),
    )
    ordering = serializers.ChoiceField(
        required=False,
        default="-updated_at",
        choices=(
            "-updated_at",
            "updated_at",
            "-total_value",
            "total_value",
            "reference",
        ),
    )
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=50,
    )


class VisitorSessionResponseSerializer(serializers.Serializer):
    expires_at = serializers.DateTimeField(read_only=True)
    available_roles = serializers.ListField(
        child=serializers.ChoiceField(
            choices=("CUSTOMER", "OPERATIONS"),
        ),
        read_only=True,
    )
    supported_locales = serializers.ListField(
        child=serializers.ChoiceField(choices=("en", "es")),
        read_only=True,
    )
    dataset_ready = serializers.BooleanField(read_only=True)


class DemoResetResponseSerializer(serializers.Serializer):
    reset_at = serializers.DateTimeField(read_only=True)
    return_count = serializers.IntegerField(read_only=True)
    message_code = serializers.CharField(read_only=True)


class APIErrorSerializer(serializers.Serializer):
    """Stable error envelope returned by every handled API exception."""

    code = serializers.CharField(read_only=True)
    detail = serializers.CharField(read_only=True)
    fields = serializers.JSONField(read_only=True)
