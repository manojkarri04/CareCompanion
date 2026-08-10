from health_management.appointments.repository import AppointmentsRepository
from health_management.appointments.sorter import AppointmentSorter

sorter = AppointmentSorter()

class AppointmentsService:
    """Service Layer: Business Logic for Appointments."""

    @staticmethod
    def get_user_appointments(user_id: str):
        if not user_id:
            raise ValueError("User ID is required")
        appointments_list = AppointmentsRepository.get_all(user_id)
        try:
            return sorter.merge_sort(appointments_list)
        except Exception as sort_err:
            print(f"[Appointments Service] Sort warning: {sort_err}. Returning raw list.")
            return appointments_list

    @staticmethod
    def create_appointment(user_id: str, data: dict):
        if not user_id:
            raise ValueError("User ID is required")
        if not data.get("date") or not data.get("time") or not data.get("doctor"):
            raise ValueError("Missing required appointment fields: date, time, and doctor")

        created = AppointmentsRepository.create(user_id, data)
        if not created:
            raise RuntimeError("Failed to create appointment record")
        return created

    @staticmethod
    def update_appointment(user_id: str, apt_id: str, data: dict):
        if not user_id or not apt_id:
            raise ValueError("User ID and Appointment ID are required")
        updated = AppointmentsRepository.update(user_id, apt_id, data)
        if not updated:
            raise KeyError("Appointment not found or unauthorized")
        return updated

    @staticmethod
    def cancel_appointment(user_id: str, apt_id: str):
        if not user_id or not apt_id:
            raise ValueError("User ID and Appointment ID are required")
        return AppointmentsRepository.cancel(user_id, apt_id)
