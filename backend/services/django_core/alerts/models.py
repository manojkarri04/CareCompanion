from django.db import models

class Alert(models.Model):
    user_id = models.CharField(max_length=255, default='guest')
    medication_name = models.CharField(max_length=255)
    time = models.CharField(max_length=100)
    date = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} at {self.time} ({self.date})"
