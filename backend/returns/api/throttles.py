"""Rate limits for the public demo lifecycle endpoints."""

from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle

from returns.services.visitor_sessions import resolve_visitor_session


class SettingsRateThrottle(SimpleRateThrottle):
    """Read a throttle rate from a dedicated Django setting."""

    settings_name = ""

    def get_rate(self):
        return getattr(settings, self.settings_name)


class NewVisitorBootstrapThrottle(SettingsRateThrottle):
    """Limit only requests that would create a new visitor sandbox."""

    scope = "new_visitor_bootstrap"
    settings_name = "RETURNOPS_BOOTSTRAP_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        if resolve_visitor_session(request._request) is not None:
            return None

        ident = self.get_ident(request) or "unknown-client"
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class VisitorResetThrottle(SettingsRateThrottle):
    """Limit resets independently for each server-owned visitor."""

    scope = "visitor_demo_reset"
    settings_name = "RETURNOPS_RESET_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        visitor = resolve_visitor_session(request._request)
        if visitor is None:
            return None

        return self.cache_format % {
            "scope": self.scope,
            "ident": str(visitor.id),
        }
