"""Versioned, clean-room data definitions for the public demo."""

from dataclasses import dataclass
from decimal import Decimal

from returns.models import EvidenceKind, ReturnReason, ReturnStatus


@dataclass(frozen=True, slots=True)
class DemoItemDefinition:
    sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    reason: ReturnReason
    details: str
    evidence_kinds: tuple[EvidenceKind, ...]


@dataclass(frozen=True, slots=True)
class DemoReturnDefinition:
    reference: str
    order_reference: str
    customer_name: str
    customer_email: str
    status: ReturnStatus
    updated_minutes_ago: int
    items: tuple[DemoItemDefinition, ...]


def item(
    sku: str,
    product_name: str,
    unit_price: str,
    reason: ReturnReason,
    *,
    quantity: int = 1,
    details: str = "",
    evidence_kinds: tuple[EvidenceKind, ...] = (
        EvidenceKind.PRODUCT_PHOTO,
    ),
) -> DemoItemDefinition:
    return DemoItemDefinition(
        sku=sku,
        product_name=product_name,
        quantity=quantity,
        unit_price=Decimal(unit_price),
        reason=reason,
        details=details,
        evidence_kinds=evidence_kinds,
    )


DEMO_RETURNS: tuple[DemoReturnDefinition, ...] = (
    DemoReturnDefinition(
        reference="RTN-204",
        order_reference="ORD-84021",
        customer_name="Maya Bennett",
        customer_email="maya.bennett@example.com",
        status=ReturnStatus.SUBMITTED,
        updated_minutes_ago=0,
        items=(
            item(
                "DMO-ARM-01",
                "Adjustable monitor arm",
                "486.00",
                ReturnReason.NOT_AS_DESCRIBED,
                evidence_kinds=(
                    EvidenceKind.PRODUCT_PHOTO,
                    EvidenceKind.SERIAL_LABEL,
                ),
            ),
            item(
                "DMO-CAM-02",
                "Conference webcam",
                "288.00",
                ReturnReason.DAMAGED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-198",
        order_reference="ORD-83874",
        customer_name="Noah Brooks",
        customer_email="noah.brooks@example.com",
        status=ReturnStatus.NEEDS_INFORMATION,
        updated_minutes_ago=12,
        items=(
            item(
                "DMO-HUB-03",
                "Desktop connectivity hub",
                "286.00",
                ReturnReason.WRONG_ITEM,
                evidence_kinds=(
                    EvidenceKind.PRODUCT_PHOTO,
                    EvidenceKind.SERIAL_LABEL,
                ),
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-191",
        order_reference="ORD-83619",
        customer_name="Avery Morgan",
        customer_email="avery.morgan@example.com",
        status=ReturnStatus.APPROVED,
        updated_minutes_ago=60,
        items=(
            item(
                "DMO-LGT-04",
                "Studio desk light",
                "368.00",
                ReturnReason.DAMAGED,
            ),
            item(
                "DMO-MIC-05",
                "USB broadcast microphone",
                "368.00",
                ReturnReason.DAMAGED,
            ),
            item(
                "DMO-PAD-06",
                "Wireless charging pad",
                "368.00",
                ReturnReason.DAMAGED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-187",
        order_reference="ORD-83488",
        customer_name="Mia Larson",
        customer_email="mia.larson@example.com",
        status=ReturnStatus.REJECTED,
        updated_minutes_ago=120,
        items=(
            item(
                "DMO-KBD-07",
                "Compact mechanical keyboard",
                "188.00",
                ReturnReason.NO_LONGER_NEEDED,
                evidence_kinds=(
                    EvidenceKind.PRODUCT_PHOTO,
                    EvidenceKind.RECEIPT,
                ),
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-176",
        order_reference="ORD-83017",
        customer_name="Eli Turner",
        customer_email="eli.turner@example.com",
        status=ReturnStatus.APPROVED,
        updated_minutes_ago=1440,
        items=(
            item(
                "DMO-SPK-08",
                "Desktop speaker",
                "270.00",
                ReturnReason.NOT_AS_DESCRIBED,
            ),
            item(
                "DMO-SPK-09",
                "Desktop speaker",
                "270.00",
                ReturnReason.NOT_AS_DESCRIBED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-169",
        order_reference="ORD-82761",
        customer_name="Sofia Ramirez",
        customer_email="sofia.ramirez@example.com",
        status=ReturnStatus.SUBMITTED,
        updated_minutes_ago=18,
        items=(
            item(
                "DMO-MSE-10",
                "Ergonomic wireless mouse",
                "142.00",
                ReturnReason.WRONG_ITEM,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-165",
        order_reference="ORD-82540",
        customer_name="Lucas Martin",
        customer_email="lucas.martin@example.com",
        status=ReturnStatus.NEEDS_INFORMATION,
        updated_minutes_ago=45,
        items=(
            item(
                "DMO-STN-11",
                "Laptop stand",
                "156.00",
                ReturnReason.DAMAGED,
            ),
            item(
                "DMO-CBL-12",
                "Braided display cable",
                "42.00",
                ReturnReason.DAMAGED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-158",
        order_reference="ORD-82193",
        customer_name="Emma Wilson",
        customer_email="emma.wilson@example.com",
        status=ReturnStatus.APPROVED,
        updated_minutes_ago=180,
        items=(
            item(
                "DMO-HDP-13",
                "Wireless studio headphones",
                "324.00",
                ReturnReason.NOT_AS_DESCRIBED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-151",
        order_reference="ORD-81972",
        customer_name="Daniel Kim",
        customer_email="daniel.kim@example.com",
        status=ReturnStatus.SUBMITTED,
        updated_minutes_ago=300,
        items=(
            item(
                "DMO-DSK-14",
                "Desk organizer",
                "84.00",
                ReturnReason.WRONG_ITEM,
            ),
            item(
                "DMO-MAT-15",
                "Extended desk mat",
                "58.00",
                ReturnReason.WRONG_ITEM,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-144",
        order_reference="ORD-81604",
        customer_name="Olivia Parker",
        customer_email="olivia.parker@example.com",
        status=ReturnStatus.REJECTED,
        updated_minutes_ago=420,
        items=(
            item(
                "DMO-CHR-16",
                "Task chair cushion",
                "96.00",
                ReturnReason.NO_LONGER_NEEDED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-138",
        order_reference="ORD-81255",
        customer_name="Mateo Silva",
        customer_email="mateo.silva@example.com",
        status=ReturnStatus.APPROVED,
        updated_minutes_ago=720,
        items=(
            item(
                "DMO-PNL-17",
                "Acoustic desk panel",
                "212.00",
                ReturnReason.DAMAGED,
            ),
            item(
                "DMO-BRK-18",
                "Panel mounting bracket",
                "68.00",
                ReturnReason.DAMAGED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-129",
        order_reference="ORD-80831",
        customer_name="Chloe Davis",
        customer_email="chloe.davis@example.com",
        status=ReturnStatus.NEEDS_INFORMATION,
        updated_minutes_ago=1560,
        items=(
            item(
                "DMO-DOC-19",
                "Vertical laptop dock",
                "176.00",
                ReturnReason.NOT_AS_DESCRIBED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-117",
        order_reference="ORD-80214",
        customer_name="Ethan Clark",
        customer_email="ethan.clark@example.com",
        status=ReturnStatus.SUBMITTED,
        updated_minutes_ago=2880,
        items=(
            item(
                "DMO-PWR-20",
                "Compact power station",
                "248.00",
                ReturnReason.DAMAGED,
            ),
            item(
                "DMO-ADP-21",
                "Universal power adapter",
                "74.00",
                ReturnReason.DAMAGED,
            ),
        ),
    ),
    DemoReturnDefinition(
        reference="RTN-108",
        order_reference="ORD-79684",
        customer_name="Isabella Moore",
        customer_email="isabella.moore@example.com",
        status=ReturnStatus.SUBMITTED,
        updated_minutes_ago=4320,
        items=(
            item(
                "DMO-KEY-22",
                "Programmable shortcut keypad",
                "132.00",
                ReturnReason.OTHER,
                details="Fictional compatibility issue.",
            ),
        ),
    ),
)
