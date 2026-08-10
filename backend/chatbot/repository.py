from shared.db_client import get_user_db

class ChatRepository:
    """Repository Layer: Database operations for Chat messages & attachments."""

    @staticmethod
    def save_chat_message(user_id: str, role: str, content: str, attachment_meta: dict = None, user_token: str = None):
        db = get_user_db(user_token)
        if not db:
            return None
        payload = {
            'user_id': user_id,
            'role': role,
            'content': content
        }
        if attachment_meta:
            payload['attachment'] = attachment_meta
        response = db.table('chat_history').insert(payload).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def get_chat_history(user_id: str, limit: int = 20, user_token: str = None):
        db = get_user_db(user_token)
        if not db:
            return []
        response = db.table('chat_history').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
        return list(reversed(response.data)) if response.data else []
