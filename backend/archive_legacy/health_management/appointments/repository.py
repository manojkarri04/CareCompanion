from shared.db_client import get_user_db

class AppointmentsRepository:
    """Repository Layer: Direct Data Access for Appointments."""

    @staticmethod
    def get_all(user_id: str):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        response = db.table('appointments').select('*').eq('user_id', user_id).execute()
        return response.data or []

    @staticmethod
    def create(user_id: str, data: dict):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        response = db.table('appointments').insert({
            'user_id': user_id,
            'date': data.get("date"),
            'time': data.get("time"),
            'doctor': data.get("doctor"),
            'specialty': data.get("specialty"),
            'location': data.get("location", "TBD"),
            'status': data.get("status", "Confirmed")
        }).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def update(user_id: str, apt_id: str, data: dict):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        
        update_payload = {}
        for field in ["date", "time", "doctor", "specialty", "location", "status"]:
            if field in data:
                update_payload[field] = data[field]

        response = db.table('appointments').update(update_payload).eq('id', apt_id).eq('user_id', user_id).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def cancel(user_id: str, apt_id: str):
        db = get_user_db()
        if not db:
            raise RuntimeError("Database client not initialized")
        db.table('appointments').update({'status': 'Cancelled'}).eq('id', apt_id).eq('user_id', user_id).execute()
        return True
