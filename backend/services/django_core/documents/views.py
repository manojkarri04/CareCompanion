from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from .models import SavedDocument
from .serializers import SavedDocumentSerializer
from authentication.auth import SupabaseAuthentication

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = SavedDocumentSerializer
    authentication_classes = [SupabaseAuthentication]

    def get_queryset(self):
        user_id = getattr(self.request.user, 'id', 'guest')
        return SavedDocument.objects.filter(user_id=user_id).order_by('-upload_date')

    def perform_create(self, serializer):
        user_id = getattr(self.request.user, 'id', 'guest')
        serializer.save(user_id=user_id)

    @action(detail=False, methods=['get'], url_path='file/(?P<filename>[^/.]+)')
    def serve_file(self, request, filename=None):
        return HttpResponse(f"Serving file {filename} for user {request.user.id}", content_type="application/pdf")
