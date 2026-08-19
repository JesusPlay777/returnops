from ipaddress import IPv4Address, IPv4Network
from unittest import TestCase

from xmart_demo.scenario import (
    AFTER_DEVICE_ASSIGNMENT,
    AFTER_USER_ACCESS,
    INITIAL_CAPACITIES,
    XMART_SCENARIO,
    CountCapacity,
    XmartWorkflowPhase,
)


class XmartScenarioContractTests(TestCase):
    def test_uses_the_approved_fictional_identifiers(self):
        self.assertEqual(XMART_SCENARIO.customer_name, "Atlas Field Services")
        self.assertEqual(XMART_SCENARIO.project_name, "Atlas Network Rollout")
        self.assertEqual(
            XMART_SCENARIO.actor_email,
            "portfolio.admin@example.test",
        )
        self.assertEqual(
            XMART_SCENARIO.target_user_email,
            "field.operator@example.test",
        )
        self.assertEqual(XMART_SCENARIO.device_model, "Orion X5 Demo")
        self.assertTrue(XMART_SCENARIO.demo_imei.startswith("DEMO-IMEI-"))
        self.assertFalse(XMART_SCENARIO.demo_imei.isdecimal())

    def test_network_and_email_values_are_reserved_for_documentation(self):
        documentation_network = IPv4Network("192.0.2.0/24")

        self.assertIn(
            IPv4Address(XMART_SCENARIO.actor_ip),
            documentation_network,
        )
        self.assertTrue(XMART_SCENARIO.actor_email.endswith("@example.test"))
        self.assertTrue(
            XMART_SCENARIO.target_user_email.endswith("@example.test")
        )

    def test_exposes_the_four_approved_modules_once(self):
        self.assertEqual(
            XMART_SCENARIO.modules,
            (
                "Field Testing",
                "Device Management",
                "Log Center",
                "Security Audit",
            ),
        )
        self.assertEqual(
            len(XMART_SCENARIO.modules),
            len(set(XMART_SCENARIO.modules)),
        )

    def test_capacity_timeline_has_the_expected_visible_changes(self):
        self.assertEqual(INITIAL_CAPACITIES.users, CountCapacity(4, 10))
        self.assertEqual(str(INITIAL_CAPACITIES.storage.used_gb), "6.4")
        self.assertEqual(str(INITIAL_CAPACITIES.storage.limit_gb), "20")
        self.assertEqual(INITIAL_CAPACITIES.imeis, CountCapacity(8, 15))

        self.assertEqual(AFTER_USER_ACCESS.users, CountCapacity(5, 10))
        self.assertEqual(AFTER_USER_ACCESS.imeis, CountCapacity(8, 15))
        self.assertEqual(
            AFTER_USER_ACCESS.storage,
            INITIAL_CAPACITIES.storage,
        )

        self.assertEqual(AFTER_DEVICE_ASSIGNMENT.users, CountCapacity(5, 10))
        self.assertEqual(AFTER_DEVICE_ASSIGNMENT.imeis, CountCapacity(9, 15))
        self.assertEqual(
            AFTER_DEVICE_ASSIGNMENT.storage,
            INITIAL_CAPACITIES.storage,
        )

    def test_workflow_order_is_stable_for_future_api_and_ui_consumers(self):
        self.assertEqual(
            tuple(step.phase for step in XMART_SCENARIO.workflow),
            (
                XmartWorkflowPhase.CUSTOMER_WORKSPACE,
                XmartWorkflowPhase.USER_ACCESS,
                XmartWorkflowPhase.DEVICE_ASSIGNMENT,
                XmartWorkflowPhase.SECURITY_AUDIT,
                XmartWorkflowPhase.WORKFLOW_COMPLETE,
            ),
        )
        self.assertEqual(
            XMART_SCENARIO.workflow[0].capacities,
            INITIAL_CAPACITIES,
        )
        self.assertEqual(
            XMART_SCENARIO.workflow[-1].capacities,
            AFTER_DEVICE_ASSIGNMENT,
        )

    def test_disclosure_explicitly_marks_the_entire_scenario_as_fictional(self):
        self.assertIn("fictional", XMART_SCENARIO.disclosure.lower())
        self.assertIn("demonstration", XMART_SCENARIO.disclosure.lower())

    def test_invalid_capacity_contracts_are_rejected(self):
        with self.assertRaises(ValueError):
            CountCapacity(used=11, limit=10)
