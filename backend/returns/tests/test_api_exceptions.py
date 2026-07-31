from rest_framework.exceptions import ValidationError

from django.test import SimpleTestCase

from returns.api.exceptions import exception_handler
from returns.services.demo_dataset import VisitorSessionUnavailable
from returns.services.transitions import (
    InvalidReturnTransition,
    ReturnItemsRequired,
    ReturnRequestNotFound,
)
from returns.services.visitor_sessions import VisitorSessionRequired


class ReturnAPIExceptionHandlerTests(SimpleTestCase):
    def test_visitor_errors_use_the_401_contract(self):
        for exception in (
            VisitorSessionRequired(),
            VisitorSessionUnavailable(),
        ):
            with self.subTest(exception=type(exception).__name__):
                response = exception_handler(exception, {})

                self.assertEqual(response.status_code, 401)
                self.assertEqual(
                    response.data,
                    {
                        "code": "visitor_session_required",
                        "detail": (
                            "An active visitor session is required."
                        ),
                        "fields": {},
                    },
                )

    def test_cross_visitor_not_found_uses_non_disclosing_response(self):
        response = exception_handler(ReturnRequestNotFound(), {})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "return_not_found")
        self.assertEqual(response.data["fields"], {})

    def test_invalid_transition_uses_409_conflict(self):
        response = exception_handler(
            InvalidReturnTransition("APPROVED", "REJECTED"),
            {},
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.data["code"],
            "invalid_status_transition",
        )
        self.assertEqual(response.data["fields"], {})

    def test_domain_prerequisite_uses_400(self):
        response = exception_handler(ReturnItemsRequired(), {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "return_items_required")
        self.assertEqual(response.data["fields"], {})

    def test_serializer_validation_preserves_field_errors(self):
        response = exception_handler(
            ValidationError(
                {
                    "quantity": ["Ensure this value is greater than 0."],
                }
            ),
            {},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertEqual(
            response.data["detail"],
            "Request validation failed.",
        )
        self.assertEqual(
            response.data["fields"],
            {
                "quantity": [
                    "Ensure this value is greater than 0.",
                ]
            },
        )

    def test_unhandled_exception_is_left_for_django(self):
        self.assertIsNone(
            exception_handler(RuntimeError("unexpected"), {}),
        )
