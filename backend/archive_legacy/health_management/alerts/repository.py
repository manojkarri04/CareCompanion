from shared.db_client import get_user_db

class AlertsRepository:
    """Repository Layer: Direct Data Access for Alerts."""

    @staticmethod
    def get_all(user_id: str):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        response = db.table('alerts').select('*').eq('user_id', user_id).order('date', desc=False).execute()
        return response.data

    @staticmethod
    def create(user_id: str, medication_name: str, time: str, date: str):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        response = db.table('alerts').insert({
            'user_id': user_id,
            'medicationName': medication_name,
            'time': time,
            'date': date
        }).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def update(user_id: str, alert_id: str, data: dict):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        
        update_payload = {}
        if "medicationName" in data:
            update_payload["medicationName"] = data["medicationName"]
        if "time" in data:
            update_payload["time"] = data["time"]
        if "date" in data:
            update_payload["date"] = data["date"]

        response = db.table('alerts').update(update_payload).eq('id', alert_id).eq('user_id', user_id).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def delete(user_id: str, alert_id: str):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        db.table('alerts').delete().eq('id', alert_id).eq('user_id', user_id).execute()
        return True
