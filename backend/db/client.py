from supabase import create_client, Client
from core.config import Config
from flask import request, has_request_context

anon_key = Config.SUPABASE_ANON_KEY or Config.SUPABASE_KEY

# Handle missing configs gracefully
if not Config.SUPABASE_URL or not anon_key:
    print("WARNING: Supabase keys are missing from your .env file!")
    supabase = None
else:
    supabase: Client = create_client(Config.SUPABASE_URL, anon_key)

def get_user_db() -> Client:
    """Returns a Supabase client configured with the requesting user's JWT access token.
    This ensures all database queries pass through Supabase Row Level Security (RLS) as auth.uid()."""
    if not Config.SUPABASE_URL or not anon_key:
        return None
    try:
        if has_request_context():
            user_token = getattr(request, 'token', None)
            if user_token:
                user_client = create_client(Config.SUPABASE_URL, anon_key)
                user_client.postgrest.auth(user_token)
                return user_client
    except Exception as e:
        print(f"Error scoping Supabase client to user token: {e}")
    return supabase

