"""Reusable OpenAPI declarations for the returns API."""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse

from returns.api.serializers import APIErrorSerializer


PUBLIC_SECURITY = []
VISITOR_SECURITY = [{"visitorSession": []}]
VISITOR_WRITE_SECURITY = [
    {
        "visitorSession": [],
        "csrfToken": [],
    }
]

ERROR_RESPONSE = OpenApiResponse(
    response=APIErrorSerializer,
    description="Stable API error envelope.",
)

RETURN_ID_PARAMETER = OpenApiParameter(
    name="id",
    type=OpenApiTypes.UUID,
    location=OpenApiParameter.PATH,
    description="Opaque return request UUID scoped to the current visitor.",
)
ITEM_ID_PARAMETER = OpenApiParameter(
    name="item_id",
    type=OpenApiTypes.UUID,
    location=OpenApiParameter.PATH,
    description="Opaque item UUID belonging to the selected return.",
)
EVIDENCE_ID_PARAMETER = OpenApiParameter(
    name="evidence_id",
    type=OpenApiTypes.UUID,
    location=OpenApiParameter.PATH,
    description="Opaque evidence UUID belonging to the selected item.",
)


def error_responses(*status_codes: int) -> dict[int, OpenApiResponse]:
    """Build a response mapping for operations sharing the error envelope."""
    return {status_code: ERROR_RESPONSE for status_code in status_codes}
