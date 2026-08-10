from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from appointments.views import AppointmentViewSet
from alerts.views import AlertViewSet
from notes.views import NoteViewSet
from documents.views import DocumentViewSet

def root_overview(request):
    return JsonResponse({
        "service": "CareCompanion Django Core Microservice",
        "status": "online",
        "api_root": "http://localhost:8000/api/",
        "endpoints": {
            "appointments": "http://localhost:8000/api/appointments",
            "alerts": "http://localhost:8000/api/alerts",
            "notes": "http://localhost:8000/api/notes",
            "documents": "http://localhost:8000/api/documents"
        }
    })

router = DefaultRouter(trailing_slash=False)
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', root_overview, name='root-overview'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
