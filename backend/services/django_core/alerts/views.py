from rest_framework import viewsets
from .models import Alert
from .serializers import AlertSerializer
from authentication.auth import SupabaseAuthentication

class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    authentication_classes = [SupabaseAuthentication]

    def get_queryset(self):
        user_id = getattr(self.request.user, 'id', 'guest')
        return Alert.objects.filter(user_id=user_id).order_by('-created_at')

    def perform_create(self, serializer):
        user_id = getattr(self.request.user, 'id', 'guest')
        serializer.save(user_id=user_id)
