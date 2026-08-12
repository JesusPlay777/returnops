import json
import os
from pathlib import Path
import subprocess
import sys

from django.test import SimpleTestCase, TestCase
from django.urls import reverse


class HealthViewTests(TestCase):
    def test_health_endpoint_checks_database(self):
        response = self.client.get(reverse("core:health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "service": "returnops-api",
                "status": "ok",
                "database": "ok",
            },
        )


class ProductionSettingsTests(SimpleTestCase):
    backend_dir = Path(__file__).resolve().parents[1]
    production_env = {
        "DJANGO_SETTINGS_MODULE": "config.settings",
        "DJANGO_DEBUG": "false",
        "DJANGO_SECRET_KEY": (
            "returnops-production-test-key-"
            "7Vtq9xH3pL2mN8cR5wK4zF6sB1yD0aJ"
        ),
        "DJANGO_ALLOWED_HOSTS": "api.example.test",
        "DJANGO_CORS_ALLOWED_ORIGINS": "https://demo.example.test",
        "DJANGO_CSRF_TRUSTED_ORIGINS": "https://demo.example.test",
        "DJANGO_ENABLE_ADMIN": "false",
        "DATABASE_URL": (
            "postgresql://returnops:password@database.example.test:5432/"
            "returnops?sslmode=require"
        ),
    }

    def run_settings_probe(self, code, overrides=None):
        environment = os.environ.copy()
        values = {**self.production_env, **(overrides or {})}
        for name, value in values.items():
            if value is None:
                environment.pop(name, None)
            else:
                environment[name] = value

        return subprocess.run(
            [sys.executable, "-c", code],
            cwd=self.backend_dir,
            env=environment,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_production_requires_a_secure_secret_key(self):
        result = self.run_settings_probe(
            "import config.settings",
            {"DJANGO_SECRET_KEY": None},
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY must be set", result.stderr)

    def test_production_requires_database_url(self):
        result = self.run_settings_probe(
            "import config.settings",
            {"DATABASE_URL": None},
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DATABASE_URL must be set", result.stderr)

    def test_invalid_throttle_rate_fails_fast(self):
        result = self.run_settings_probe(
            "import config.settings",
            {"RETURNOPS_BOOTSTRAP_THROTTLE_RATE": "unlimited/hour"},
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(
            "RETURNOPS_BOOTSTRAP_THROTTLE_RATE must use the format",
            result.stderr,
        )

    def test_database_url_enables_healthy_persistent_connections(self):
        result = self.run_settings_probe(
            """
import json
from config import settings

database = settings.DATABASES["default"]
print(json.dumps({
    "engine": database["ENGINE"],
    "host": database["HOST"],
    "port": database["PORT"],
    "name": database["NAME"],
    "conn_max_age": database["CONN_MAX_AGE"],
    "conn_health_checks": database["CONN_HEALTH_CHECKS"],
    "sslmode": database["OPTIONS"]["sslmode"],
}))
""",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {
                "engine": "django.db.backends.postgresql",
                "host": "database.example.test",
                "port": 5432,
                "name": "returnops",
                "conn_max_age": 60,
                "conn_health_checks": True,
                "sslmode": "require",
            },
        )

    def test_database_url_rejects_a_non_postgresql_engine(self):
        result = self.run_settings_probe(
            "import config.settings",
            {
                "DATABASE_URL": (
                    "postgis://returnops:password@database.example.test/"
                    "returnops"
                )
            },
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(
            "DATABASE_URL must use the PostgreSQL engine",
            result.stderr,
        )

    def test_production_enables_security_and_disables_admin(self):
        result = self.run_settings_probe(
            """
import json
import django

django.setup()

from django.conf import settings
from django.urls import get_resolver

routes = [str(pattern.pattern) for pattern in get_resolver().url_patterns]
print(json.dumps({
    "session_secure": settings.SESSION_COOKIE_SECURE,
    "csrf_secure": settings.CSRF_COOKIE_SECURE,
    "ssl_redirect": settings.SECURE_SSL_REDIRECT,
    "hsts_seconds": settings.SECURE_HSTS_SECONDS,
    "admin_enabled": settings.DJANGO_ENABLE_ADMIN,
    "admin_route": "admin/" in routes,
    "whitenoise_middleware": settings.MIDDLEWARE[1],
    "static_storage": settings.STORAGES["staticfiles"]["BACKEND"],
}))
""",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {
                "session_secure": True,
                "csrf_secure": True,
                "ssl_redirect": True,
                "hsts_seconds": 3600,
                "admin_enabled": False,
                "admin_route": False,
                "whitenoise_middleware": (
                    "whitenoise.middleware.WhiteNoiseMiddleware"
                ),
                "static_storage": (
                    "whitenoise.storage."
                    "CompressedManifestStaticFilesStorage"
                ),
            },
        )
