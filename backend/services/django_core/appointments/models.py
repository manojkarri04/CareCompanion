from django.db import models

class Appointment(models.Model):
    user_id = models.CharField(max_length=255, default='guest')
    doctor = models.CharField(max_length=255)
    specialty = models.CharField(max_length=255, blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    date = models.CharField(max_length=100)
    time = models.CharField(max_length=100)
    status = models.CharField(max_length=50, default='Confirmed')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doctor} - {self.date} ({self.status})"
