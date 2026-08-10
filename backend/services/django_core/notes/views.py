from rest_framework import viewsets
from .models import Note
from .serializers import NoteSerializer
from authentication.auth import SupabaseAuthentication

class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    authentication_classes = [SupabaseAuthentication]

    def get_queryset(self):
        user_id = getattr(self.request.user, 'id', 'guest')
        return Note.objects.filter(user_id=user_id).order_by('-updated_at')

    def perform_create(self, serializer):
        user_id = getattr(self.request.user, 'id', 'guest')
        serializer.save(user_id=user_id)
