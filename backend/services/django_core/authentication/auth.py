import os
import base64
import jwt
from rest_framework import authentication
from rest_framework import exceptions

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

class AnonymousUser:
    is_authenticated = True
    def __init__(self, user_id):
        self.id = user_id
        self.username = user_id
        self.is_anonymous = False

class SupabaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return (AnonymousUser('guest'), None)
        
        token = auth_header.replace('Bearer ', '').strip()
        if not token:
            return (AnonymousUser('guest'), None)

        if not SUPABASE_JWT_SECRET:
            try:
                unverified = jwt.decode(token, options={"verify_signature": False})
                user_id = unverified.get('sub', 'guest')
                return (AnonymousUser(user_id), None)
            except Exception:
                return (AnonymousUser('guest'), None)

        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            user_id = payload.get('sub', 'guest')
            return (AnonymousUser(user_id), None)
        except Exception:
            try:
                secret_bytes = base64.b64decode(SUPABASE_JWT_SECRET)
                payload = jwt.decode(
                    token,
                    secret_bytes,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                user_id = payload.get('sub', 'guest')
                return (AnonymousUser(user_id), None)
            except Exception as e:
                raise exceptions.AuthenticationFailed(f"Invalid token: {str(e)}")
