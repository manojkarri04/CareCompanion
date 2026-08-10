from django.db import models

class Note(models.Model):
    user_id = models.CharField(max_length=255, default='guest')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note {self.id} by {self.user_id}"
