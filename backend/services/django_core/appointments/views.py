from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Appointment
from .serializers import AppointmentSerializer
from authentication.auth import SupabaseAuthentication

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    authentication_classes = [SupabaseAuthentication]

    def get_queryset(self):
        user_id = getattr(self.request.user, 'id', 'guest')
        return Appointment.objects.filter(user_id=user_id).order_by('-created_at')

    def perform_create(self, serializer):
        user_id = getattr(self.request.user, 'id', 'guest')
        serializer.save(user_id=user_id)

    @action(detail=True, methods=['put'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'Cancelled'
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data, status=status.HTTP_200_OK)
