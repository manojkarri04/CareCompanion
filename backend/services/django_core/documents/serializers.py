from rest_framework import serializers
from .models import SavedDocument

class SavedDocumentSerializer(serializers.ModelSerializer):
    fileName = serializers.CharField(source='file_name')
    fileType = serializers.CharField(source='file_type')
    fileSize = serializers.CharField(source='file_size')
    uploadDate = serializers.DateTimeField(source='upload_date', read_only=True)

    class Meta:
        model = SavedDocument
        fields = ['id', 'user_id', 'fileName', 'fileType', 'fileSize', 'uploadDate']
        read_only_fields = ['id', 'user_id', 'uploadDate']
