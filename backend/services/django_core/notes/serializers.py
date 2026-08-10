from rest_framework import serializers
from .models import Note

class NoteSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'user_id', 'content', 'created_at', 'updated_at', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'user_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt']
