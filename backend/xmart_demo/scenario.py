"""Canonical fictional scenario for the Xmart portfolio demo.

This module is intentionally independent from persistence and HTTP concerns.
Later phases consume this contract when seeding each visitor's isolated demo.
"""

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum


class XmartWorkflowPhase(str, Enum):
    CUSTOMER_WORKSPACE = "CUSTOMER_WORKSPACE"
    USER_ACCESS = "USER_ACCESS"
    DEVICE_ASSIGNMENT = "DEVICE_ASSIGNMENT"
    SECURITY_AUDIT = "SECURITY_AUDIT"
    WORKFLOW_COMPLETE = "WORKFLOW_COMPLETE"


@dataclass(frozen=True, slots=True)
class CountCapacity:
    used: int
    limit: int

    def __post_init__(self):
        if self.used < 0 or self.limit <= 0 or self.used > self.limit:
            raise ValueError("Count capacity must remain within its limit.")

    @property
    def remaining(self) -> int:
        return self.limit - self.used


@dataclass(frozen=True, slots=True)
class StorageCapacity:
    used_gb: Decimal
    limit_gb: Decimal

    def __post_init__(self):
        if (
            self.used_gb < Decimal("0")
            or self.limit_gb <= Decimal("0")
            or self.used_gb > self.limit_gb
        ):
            raise ValueError("Storage capacity must remain within its limit.")

    @property
    def remaining_gb(self) -> Decimal:
        return self.limit_gb - self.used_gb


@dataclass(frozen=True, slots=True)
class CapacitySnapshot:
    users: CountCapacity
    storage: StorageCapacity
    imeis: CountCapacity


@dataclass(frozen=True, slots=True)
class WorkflowStep:
    phase: XmartWorkflowPhase
    visible_result: str
    capacities: CapacitySnapshot


@dataclass(frozen=True, slots=True)
class XmartScenario:
    customer_name: str
    project_name: str
    actor_email: str
    target_user_email: str
    actor_ip: str
    device_model: str
    demo_imei: str
    modules: tuple[str, ...]
    disclosure: str
    workflow: tuple[WorkflowStep, ...]


INITIAL_CAPACITIES = CapacitySnapshot(
    users=CountCapacity(used=4, limit=10),
    storage=StorageCapacity(
        used_gb=Decimal("6.4"),
        limit_gb=Decimal("20"),
    ),
    imeis=CountCapacity(used=8, limit=15),
)

AFTER_USER_ACCESS = CapacitySnapshot(
    users=CountCapacity(used=5, limit=10),
    storage=INITIAL_CAPACITIES.storage,
    imeis=INITIAL_CAPACITIES.imeis,
)

AFTER_DEVICE_ASSIGNMENT = CapacitySnapshot(
    users=AFTER_USER_ACCESS.users,
    storage=INITIAL_CAPACITIES.storage,
    imeis=CountCapacity(used=9, limit=15),
)

XMART_SCENARIO = XmartScenario(
    customer_name="Atlas Field Services",
    project_name="Atlas Network Rollout",
    actor_email="portfolio.admin@example.test",
    target_user_email="field.operator@example.test",
    actor_ip="192.0.2.44",
    device_model="Orion X5 Demo",
    demo_imei="DEMO-IMEI-0001",
    modules=(
        "Field Testing",
        "Device Management",
        "Log Center",
        "Security Audit",
    ),
    disclosure=(
        "All organizations, people, identifiers, network data, and events in "
        "this scenario are fictional and exist only for demonstration."
    ),
    workflow=(
        WorkflowStep(
            phase=XmartWorkflowPhase.CUSTOMER_WORKSPACE,
            visible_result="Customer workspace and contracted limits reviewed.",
            capacities=INITIAL_CAPACITIES,
        ),
        WorkflowStep(
            phase=XmartWorkflowPhase.USER_ACCESS,
            visible_result="Field operator activated and one user seat consumed.",
            capacities=AFTER_USER_ACCESS,
        ),
        WorkflowStep(
            phase=XmartWorkflowPhase.DEVICE_ASSIGNMENT,
            visible_result="Synthetic demo IMEI assigned to the rollout project.",
            capacities=AFTER_DEVICE_ASSIGNMENT,
        ),
        WorkflowStep(
            phase=XmartWorkflowPhase.SECURITY_AUDIT,
            visible_result="User and device operations recorded in the audit trail.",
            capacities=AFTER_DEVICE_ASSIGNMENT,
        ),
        WorkflowStep(
            phase=XmartWorkflowPhase.WORKFLOW_COMPLETE,
            visible_result="Provisioning workflow completed.",
            capacities=AFTER_DEVICE_ASSIGNMENT,
        ),
    ),
)
