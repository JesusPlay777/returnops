from datetime import timedelta
from uuid import UUID

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone

from returns.models import VisitorSession


VISITOR_SESSION_KEY = "returnops_visitor_session_id"


class VisitorSessionRequired(LookupError):
    """Raised when a domain operation has no active visitor sandbox."""

    code = "visitor_session_required"


def visitor_session_ttl() -> timedelta:
    """Return the configured lifetime for a visitor sandbox."""
    return timedelta(hours=settings.RETURNOPS_VISITOR_SESSION_TTL_HOURS)


def clear_visitor_session_reference(request: HttpRequest) -> None:
    """Remove only ReturnOps ownership state from the Django session."""
    request.session.pop(VISITOR_SESSION_KEY, None)


def resolve_visitor_session(
    request: HttpRequest,
) -> VisitorSession | None:
    """Resolve an active visitor exclusively from the server-side session."""
    raw_visitor_id = request.session.get(VISITOR_SESSION_KEY)
    if raw_visitor_id is None:
        return None

    try:
        visitor_id = UUID(str(raw_visitor_id))
    except (AttributeError, TypeError, ValueError):
        clear_visitor_session_reference(request)
        return None

    visitor = (
        VisitorSession.objects.filter(
            id=visitor_id,
            expires_at__gt=timezone.now(),
        )
        .only("id", "created_at", "expires_at")
        .first()
    )
    if visitor is None:
        clear_visitor_session_reference(request)
    return visitor


def bootstrap_visitor_session(request: HttpRequest) -> VisitorSession:
    """Return the active visitor or create one for the bootstrap flow."""
    visitor = resolve_visitor_session(request)
    if visitor is not None:
        return visitor

    now = timezone.now()
    ttl = visitor_session_ttl()
    visitor = VisitorSession.objects.create(expires_at=now + ttl)

    request.session.cycle_key()
    request.session[VISITOR_SESSION_KEY] = str(visitor.id)
    request.session.set_expiry(int(ttl.total_seconds()))
    return visitor


def require_visitor_session(request: HttpRequest) -> VisitorSession:
    """Return the active visitor or signal that bootstrap is required."""
    visitor = resolve_visitor_session(request)
    if visitor is None:
        raise VisitorSessionRequired
    return visitor
