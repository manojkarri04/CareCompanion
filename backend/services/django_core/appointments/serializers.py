from rest_framework import serializers
from .models import Appointment

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['id', 'user_id', 'doctor', 'specialty', 'location', 'date', 'time', 'status', 'created_at']
        read_only_fields = ['id', 'user_id', 'created_at']
