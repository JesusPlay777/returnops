from rest_framework import exceptions
from rest_framework.authentication import (
    BaseAuthentication,
    CSRFCheck,
)
from rest_framework.permissions import SAFE_METHODS


def _empty_response(request):
    return None


class VisitorCSRFAuthentication(BaseAuthentication):
    """Enforce CSRF for anonymous cookie-based visitor writes."""

    def authenticate(self, request):
        if request.method in SAFE_METHODS:
            return None

        check = CSRFCheck(_empty_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(
                f"CSRF Failed: {reason}",
            )
        return None
