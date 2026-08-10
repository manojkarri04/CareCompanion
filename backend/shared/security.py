import jwt
import base64
from flask import request, jsonify
from functools import wraps
from shared.config import Config

def check_token(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No key provided'}), 401

        try:
            token = auth_header.split(" ")[1]

            print(f"👀 DETECTIVE CHECK - Token received: {token[:15]}...")

            secret = Config.SUPABASE_JWT_SECRET
            if not secret:
                print("🛑 CRITICAL: SUPABASE_JWT_SECRET is missing from your .env file!")
                return jsonify({'error': 'Server Configuration Error'}), 500

            decoded_token = None
            try:
                decoded_token = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False, "verify_signature": True},
                    leeway=10
                )
            except (jwt.exceptions.InvalidSignatureError, Exception) as first_err:
                try:
                    secret_bytes = base64.b64decode(secret)
                    decoded_token = jwt.decode(
                        token,
                        secret_bytes,
                        algorithms=["HS256"],
                        options={"verify_aud": False, "verify_signature": True},
                        leeway=10
                    )
                except jwt.exceptions.InvalidSignatureError:
                    print("🔥 SECURITY ALERT: InvalidSignatureError - JWT Secret mismatch.")
                    return jsonify({'error': 'Invalid key or unauthorized (JWT Secret mismatch)'}), 401
                except jwt.exceptions.ExpiredSignatureError:
                    raise
                except Exception as second_err:
                    if isinstance(first_err, jwt.exceptions.ExpiredSignatureError):
                        raise first_err
                    raise second_err

            request.user_id = decoded_token.get('sub')
            request.token = token

        except IndexError:
            return jsonify({'error': 'Invalid Authorization header format'}), 401
        except jwt.exceptions.ExpiredSignatureError:
            print("🔥 SECURITY ALERT: ExpiredSignatureError - User session token has expired.")
            return jsonify({'error': 'token_expired', 'message': 'Session expired. Please log in again.'}), 401
        except jwt.exceptions.InvalidSignatureError:
            print("🔥 SECURITY ALERT: InvalidSignatureError - JWT Secret mismatch.")
            return jsonify({'error': 'Invalid key or unauthorized (JWT Secret mismatch)'}), 401
        except Exception as e:
            print(f"🔥 SECURITY ALERT: {type(e).__name__} - {e}")
            return jsonify({'error': f'Unauthorized: {str(e)}'}), 401

        return f(*args, **kwargs)
    return wrap
