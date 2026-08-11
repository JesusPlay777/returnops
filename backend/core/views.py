from django.db import connection
from django.db.utils import DatabaseError
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthResponseSerializer(serializers.Serializer):
    service = serializers.CharField()
    status = serializers.CharField()
    database = serializers.CharField()


class HealthView(APIView):
    """Report API readiness and verify the database connection."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=HealthResponseSerializer)
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except DatabaseError:
            return Response(
                {
                    "service": "returnops-api",
                    "status": "unavailable",
                    "database": "unavailable",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "service": "returnops-api",
                "status": "ok",
                "database": "ok",
            }
        )
