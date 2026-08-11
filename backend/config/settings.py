"""Django settings for ReturnOps."""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent
INSECURE_LOCAL_SECRET_KEY = "returnops-insecure-local-key"


def env_bool(name: str, default: bool = False) -> bool:
    """Read a conventional boolean value from the environment."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    """Read a comma-separated list and discard empty entries."""
    return [
        item.strip()
        for item in os.getenv(name, default).split(",")
        if item.strip()
    ]


def env_positive_int(name: str, default: int) -> int:
    """Read a positive integer or fail fast on invalid configuration."""
    raw_value = os.getenv(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be a positive integer.") from error
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer.")
    return value


def env_non_negative_int(name: str, default: int) -> int:
    """Read a non-negative integer or fail fast on invalid configuration."""
    raw_value = os.getenv(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be a non-negative integer.") from error
    if value < 0:
        raise ValueError(f"{name} must be a non-negative integer.")
    return value


DEBUG = env_bool("DJANGO_DEBUG", True)
configured_secret_key = os.getenv("DJANGO_SECRET_KEY", "").strip()
if not DEBUG and (
    not configured_secret_key
    or configured_secret_key == INSECURE_LOCAL_SECRET_KEY
):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set to a secure value when "
        "DJANGO_DEBUG is false."
    )
SECRET_KEY = configured_secret_key or INSECURE_LOCAL_SECRET_KEY

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1,backend" if DEBUG else "",
)
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS must list the production host names."
    )

DJANGO_ENABLE_ADMIN = env_bool("DJANGO_ENABLE_ADMIN", DEBUG)
RETURNOPS_VISITOR_SESSION_TTL_HOURS = env_positive_int(
    "RETURNOPS_VISITOR_SESSION_TTL_HOURS",
    24,
)

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "rest_framework",
    "core",
    "returns.apps.ReturnsConfig",
]
if DJANGO_ENABLE_ADMIN:
    INSTALLED_APPS.insert(0, "django.contrib.admin")

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

database_url = os.getenv("DATABASE_URL", "").strip()
database_engine = os.getenv("DB_ENGINE", "postgresql").strip().lower()

if database_url:
    try:
        production_database = dj_database_url.parse(
            database_url,
            conn_max_age=60,
            conn_health_checks=True,
        )
    except ValueError as error:
        raise ImproperlyConfigured(
            "DATABASE_URL must be a valid PostgreSQL URL."
        ) from error
    if production_database["ENGINE"] != "django.db.backends.postgresql":
        raise ImproperlyConfigured(
            "DATABASE_URL must use the PostgreSQL engine."
        )
    DATABASES = {"default": production_database}
elif database_engine == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
elif not DEBUG:
    raise ImproperlyConfigured(
        "DATABASE_URL must be set when DJANGO_DEBUG is false."
    )
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "returnops"),
            "USER": os.getenv("POSTGRES_USER", "returnops"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "returnops_local"),
            "HOST": os.getenv("POSTGRES_HOST", "db"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
            "CONN_HEALTH_CHECKS": True,
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
        ),
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:3000" if DEBUG else "",
)
CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000" if DEBUG else "",
)
if not DEBUG and not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured(
        "DJANGO_CSRF_TRUSTED_ORIGINS must list the public frontend origin."
    )
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "returns.api.authentication.VisitorCSRFAuthentication",
    ],
    "EXCEPTION_HANDLER": "returns.api.exceptions.exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_NAME = "returnops_sessionid"
SESSION_COOKIE_AGE = RETURNOPS_VISITOR_SESSION_TTL_HOURS * 60 * 60
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_NAME = "returnops_csrftoken"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_SSL_REDIRECT = not DEBUG and env_bool(
    "DJANGO_SECURE_SSL_REDIRECT",
    True,
)
SECURE_HSTS_SECONDS = env_non_negative_int(
    "DJANGO_SECURE_HSTS_SECONDS",
    3600 if not DEBUG else 0,
)
# Keep these disabled until ReturnOps uses a domain whose subdomains and HSTS
# preload lifecycle are fully controlled by the project owner.
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG and env_bool(
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    False,
)
SECURE_HSTS_PRELOAD = not DEBUG and env_bool(
    "DJANGO_SECURE_HSTS_PRELOAD",
    False,
)
X_FRAME_OPTIONS = "DENY"

SPECTACULAR_SETTINGS = {
    "TITLE": "ReturnOps API",
    "DESCRIPTION": (
        "Versioned API contract for the ReturnOps clean-room portfolio demo. "
        "All business data is fictional and isolated by browser visitor."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "displayOperationId": True,
        "persistAuthorization": False,
    },
    "TAGS": [
        {
            "name": "Demo session",
            "description": "Bootstrap and reset the isolated visitor sandbox.",
        },
        {
            "name": "Customer returns",
            "description": "Create, edit, submit, and follow returns.",
        },
        {
            "name": "Operations queue",
            "description": "Review and transition submitted returns.",
        },
    ],
    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "visitorSession": {
                "type": "apiKey",
                "in": "cookie",
                "name": SESSION_COOKIE_NAME,
                "description": (
                    "Opaque HttpOnly Django session cookie. Obtain it from "
                    "GET /api/v1/session/; visitor UUIDs are never accepted."
                ),
            },
            "csrfToken": {
                "type": "apiKey",
                "in": "header",
                "name": "X-CSRFToken",
                "description": (
                    "Required with the visitor session for POST, PATCH, and "
                    "DELETE. Read its value from the non-HttpOnly "
                    f"{CSRF_COOKIE_NAME} cookie."
                ),
            },
        }
    },
}
