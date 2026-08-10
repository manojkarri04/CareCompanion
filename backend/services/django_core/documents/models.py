from django.db import models

class SavedDocument(models.Model):
    user_id = models.CharField(max_length=255, default='guest')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50, default='document')
    file_size = models.CharField(max_length=50, default='0 KB')
    upload_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} ({self.user_id})"
