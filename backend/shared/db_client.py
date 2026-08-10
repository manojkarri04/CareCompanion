from supabase import create_client, Client
from shared.config import Config
from typing import Optional

anon_key = Config.SUPABASE_ANON_KEY or Config.SUPABASE_KEY

if not Config.SUPABASE_URL or not anon_key:
    print("WARNING: Supabase keys are missing from your .env file!")
    supabase = None
else:
    supabase: Client = create_client(Config.SUPABASE_URL, anon_key)

def get_user_db(user_token: Optional[str] = None) -> Client:
    """Returns a Supabase client scoped to the requesting user's JWT token for RLS enforcement."""
    if not Config.SUPABASE_URL or not anon_key:
        return None
    
    if user_token:
        try:
            user_client = create_client(Config.SUPABASE_URL, anon_key)
            user_client.postgrest.auth(user_token)
            return user_client
        except Exception as e:
            print(f"Error scoping Supabase client to user token: {e}")
            
    return supabase
