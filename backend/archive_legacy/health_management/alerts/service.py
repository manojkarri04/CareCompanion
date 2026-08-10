from health_management.alerts.repository import AlertsRepository

class AlertsService:
    """Service Layer: Business logic & validation for Medication Alerts."""

    @staticmethod
    def get_user_alerts(user_id: str):
        if not user_id:
            raise ValueError("User ID is required")
        return AlertsRepository.get_all(user_id)

    @staticmethod
    def create_alert(user_id: str, data: dict):
        if not user_id:
            raise ValueError("User ID is required")
        
        medication_name = data.get("medicationName", "").strip()
        time_str = data.get("time", "").strip()
        date_str = data.get("date", "").strip()

        if not medication_name:
            raise ValueError("Medication name is required")
        if not time_str or not date_str:
            raise ValueError("Time and date are required for medication alert")

        return AlertsRepository.create(user_id, medication_name, time_str, date_str)

    @staticmethod
    def update_alert(user_id: str, alert_id: str, data: dict):
        if not user_id or not alert_id:
            raise ValueError("User ID and Alert ID are required")
        
        updated_alert = AlertsRepository.update(user_id, alert_id, data)
        if not updated_alert:
            raise KeyError("Alert not found or unauthorized")
        return updated_alert

    @staticmethod
    def delete_alert(user_id: str, alert_id: str):
        if not user_id or not alert_id:
            raise ValueError("User ID and Alert ID are required")
        return AlertsRepository.delete(user_id, alert_id)
