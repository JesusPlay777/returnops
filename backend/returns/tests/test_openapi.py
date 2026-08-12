from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APIClient


class OpenAPIContractTests(SimpleTestCase):
    maxDiff = None

    def setUp(self):
        self.client = APIClient()
        response = self.client.get(
            reverse("api-schema"),
            HTTP_ACCEPT="application/vnd.oai.openapi+json",
        )
        self.assertEqual(response.status_code, 200)
        self.schema = response.data

    def test_schema_exposes_only_the_versioned_domain_contract(self):
        self.assertEqual(self.schema["openapi"], "3.0.3")
        self.assertEqual(self.schema["info"]["title"], "ReturnOps API")
        self.assertEqual(self.schema["info"]["version"], "1.0.0")
        self.assertEqual(
            set(self.schema["paths"]),
            {
                "/api/v1/session/",
                "/api/v1/demo/reset/",
                "/api/v1/demo/orders/",
                "/api/v1/returns/",
                "/api/v1/returns/{id}/",
                "/api/v1/returns/{id}/submit/",
                "/api/v1/returns/{id}/items/{item_id}/",
                (
                    "/api/v1/returns/{id}/items/{item_id}/"
                    "evidence/"
                ),
                (
                    "/api/v1/returns/{id}/items/{item_id}/"
                    "evidence/{evidence_id}/"
                ),
                "/api/v1/operations/returns/",
                "/api/v1/operations/returns/{id}/",
                "/api/v1/operations/returns/{id}/transition/",
            },
        )

    def test_schema_documents_cookie_and_csrf_security(self):
        security_schemes = self.schema["components"]["securitySchemes"]
        self.assertEqual(
            security_schemes["visitorSession"]["name"],
            "returnops_sessionid",
        )
        self.assertEqual(
            security_schemes["csrfToken"]["name"],
            "X-CSRFToken",
        )

        session_get = self.schema["paths"]["/api/v1/session/"]["get"]
        returns_get = self.schema["paths"]["/api/v1/returns/"]["get"]
        returns_post = self.schema["paths"]["/api/v1/returns/"]["post"]
        orders_get = self.schema["paths"]["/api/v1/demo/orders/"]["get"]

        self.assertNotIn("security", session_get)
        self.assertIn("429", session_get["responses"])
        self.assertIn(
            "429",
            self.schema["paths"]["/api/v1/demo/reset/"]["post"]["responses"],
        )
        self.assertEqual(
            returns_get["security"],
            [{"visitorSession": []}],
        )
        self.assertEqual(
            orders_get["security"],
            [{"visitorSession": []}],
        )
        self.assertEqual(
            returns_post["security"],
            [{"visitorSession": [], "csrfToken": []}],
        )

    def test_schema_documents_stable_errors_and_operation_ids(self):
        error_schema = self.schema["components"]["schemas"]["APIError"]
        self.assertEqual(
            set(error_schema["properties"]),
            {"code", "detail", "fields"},
        )
        transition = self.schema["paths"][
            "/api/v1/operations/returns/{id}/transition/"
        ]["post"]
        self.assertEqual(
            transition["operationId"],
            "transitionOperationsReturn",
        )
        self.assertIn("409", transition["responses"])

    def test_swagger_and_redoc_are_publicly_renderable(self):
        swagger = self.client.get(reverse("api-docs"))
        redoc = self.client.get(reverse("api-redoc"))

        self.assertEqual(swagger.status_code, 200)
        self.assertEqual(redoc.status_code, 200)
        self.assertContains(swagger, reverse("api-schema"))
        self.assertContains(redoc, reverse("api-schema"))
