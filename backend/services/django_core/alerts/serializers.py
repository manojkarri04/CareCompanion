from rest_framework import serializers
from .models import Alert

class AlertSerializer(serializers.ModelSerializer):
    medicationName = serializers.CharField(source='medication_name')

    class Meta:
        model = Alert
        fields = ['id', 'user_id', 'medicationName', 'time', 'date', 'created_at']
        read_only_fields = ['id', 'user_id', 'created_at']
