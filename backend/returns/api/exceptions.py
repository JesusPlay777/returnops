from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    ErrorDetail,
    NotAuthenticated,
    NotFound,
    ValidationError,
)
from rest_framework.views import exception_handler as drf_exception_handler

from returns.services.demo_dataset import VisitorSessionUnavailable
from returns.services.catalog_orders import (
    DemoOrderItemNotFound,
    DemoOrderNotFound,
    DemoOrderQuantityExceeded,
    DemoOrderSelectionInvalid,
    DemoOrderUnavailable,
)
from returns.services.return_requests import (
    EvidenceAlreadyAttached,
    EvidenceNotFound,
    ReturnItemNotFound,
    ReturnItemQuantityExceeded,
    ReturnRequestImmutable,
)
from returns.services.transitions import (
    InvalidReturnTransition,
    InvalidTransitionNote,
    ReturnItemsRequired,
    ReturnRequestNotFound,
    TransitionNoteRequired,
)
from returns.services.visitor_sessions import VisitorSessionRequired


class DomainAPIException(APIException):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        detail: str,
    ) -> None:
        self.status_code = status_code
        super().__init__(detail=detail, code=code)


def _translate_domain_exception(exception):
    if isinstance(
        exception,
        (VisitorSessionRequired, VisitorSessionUnavailable),
    ):
        return NotAuthenticated(
            detail="An active visitor session is required.",
            code="visitor_session_required",
        )
    if isinstance(exception, ReturnRequestNotFound):
        return NotFound(
            detail="The requested return was not found.",
            code="return_not_found",
        )
    if isinstance(exception, DemoOrderNotFound):
        return NotFound(
            detail="The fictional demo order was not found.",
            code=exception.code,
        )
    if isinstance(exception, DemoOrderItemNotFound):
        return NotFound(
            detail="The selected item does not belong to this demo order.",
            code=exception.code,
        )
    if isinstance(exception, DemoOrderUnavailable):
        return DomainAPIException(
            status_code=status.HTTP_409_CONFLICT,
            code=exception.code,
            detail="This fictional order is no longer available for return.",
        )
    if isinstance(exception, DemoOrderQuantityExceeded):
        return DomainAPIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=exception.code,
            detail="The selected quantity exceeds the fictional order quantity.",
        )
    if isinstance(exception, DemoOrderSelectionInvalid):
        return DomainAPIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=exception.code,
            detail="Select at least one unique fictional order item.",
        )
    if isinstance(exception, ReturnItemNotFound):
        return NotFound(
            detail="The requested return item was not found.",
            code=exception.code,
        )
    if isinstance(exception, EvidenceNotFound):
        return NotFound(
            detail="The requested evidence was not found.",
            code=exception.code,
        )
    if isinstance(exception, ReturnRequestImmutable):
        return DomainAPIException(
            status_code=status.HTTP_409_CONFLICT,
            code=exception.code,
            detail="The return cannot be modified in its current state.",
        )
    if isinstance(exception, ReturnItemQuantityExceeded):
        return DomainAPIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=exception.code,
            detail="The quantity exceeds the amount in the fictional order.",
        )
    if isinstance(exception, EvidenceAlreadyAttached):
        return DomainAPIException(
            status_code=status.HTTP_409_CONFLICT,
            code=exception.code,
            detail="This evidence is already attached to the item.",
        )
    if isinstance(exception, InvalidReturnTransition):
        return DomainAPIException(
            status_code=status.HTTP_409_CONFLICT,
            code=exception.code,
            detail=str(exception),
        )
    if isinstance(exception, ReturnItemsRequired):
        return DomainAPIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=exception.code,
            detail="At least one return item is required.",
        )
    if isinstance(exception, TransitionNoteRequired):
        return DomainAPIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=exception.code,
            detail="A note is required for this transition.",
        )
    if isinstance(exception, InvalidTransitionNote):
        return DomainAPIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=exception.code,
            detail="The transition note must be text.",
        )
    return exception


def _primitive(value):
    if isinstance(value, ErrorDetail):
        return str(value)
    if isinstance(value, dict):
        return {
            key: _primitive(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_primitive(item) for item in value]
    return value


def _error_code(exception) -> str:
    if hasattr(exception, "get_codes"):
        codes = exception.get_codes()
        if isinstance(codes, str):
            return codes
    return getattr(exception, "default_code", "error")


def exception_handler(exception, context):
    translated = _translate_domain_exception(exception)
    response = drf_exception_handler(translated, context)
    if response is None:
        return None

    response_data = response.data
    if isinstance(translated, ValidationError):
        code = "validation_error"
        detail = "Request validation failed."
        if isinstance(response_data, dict):
            fields = _primitive(response_data)
        else:
            fields = {"non_field_errors": _primitive(response_data)}
    elif isinstance(response_data, dict) and "detail" in response_data:
        code = _error_code(translated)
        detail = str(response_data["detail"])
        fields = {}
    else:
        code = _error_code(translated)
        detail = "The request could not be completed."
        fields = _primitive(response_data)

    response.data = {
        "code": code,
        "detail": detail,
        "fields": fields,
    }
    return response
