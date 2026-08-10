import os
import base64
import jwt
from fastapi import HTTPException, Header, Depends, status
from dotenv import load_dotenv

load_dotenv()

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

async def get_raw_token(authorization: str = Header(None)) -> str | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return token if token else None

async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization:
        # For development / guest fallback if no token provided
        return {"sub": "guest", "email": "guest@carecompanion.local"}
    
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        return {"sub": "guest", "email": "guest@carecompanion.local"}

    if not SUPABASE_JWT_SECRET:
        # If secret not set in dev, allow decoded payload or guest
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            return unverified
        except Exception:
            return {"sub": "guest", "email": "guest@carecompanion.local"}

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except Exception:
        try:
            secret_bytes = base64.b64decode(SUPABASE_JWT_SECRET)
            payload = jwt.decode(
                token,
                secret_bytes,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            return payload
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}"
            )
