from flask import Flask
from flask_cors import CORS
from flask_socketio import join_room
from shared.config import Config
from extensions import socketio
import jwt
import os

# ── Shared / System ──────────────────────────────────────────────
from shared.system_routes import system_bp

# ── Chat Bot Domain ──────────────────────────────────────────────
from chatbot.routes import chat_bp

# ── Documents Domain ─────────────────────────────────────────────
from documents.routes import documents_bp

# ── Video Generation Domain ──────────────────────────────────────
from video.routes import storyboard_bp

# ── Intelligence Domain ──────────────────────────────────────────
from intelligence.sql_agent.routes import sql_agent_bp
from intelligence.facility_extractor.routes import hackathon_bp

# ── Health Management Domain ─────────────────────────────────────
from health_management.appointments.routes import appointments_bp
from health_management.alerts.routes import alerts_bp
from health_management.notes.routes import notes_bp


app = Flask(__name__)
CORS(app)

os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER

# Initialize extensions
socketio.init_app(app, cors_allowed_origins="*")

# Register all domain blueprints
app.register_blueprint(system_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(documents_bp)
app.register_blueprint(storyboard_bp)
app.register_blueprint(sql_agent_bp)
app.register_blueprint(hackathon_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(notes_bp)


@socketio.on('connect')
def handle_connect():
    """When a client connects via WebSocket, read their JWT and put them in a
    private room named after their user_id so we can emit only to them."""
    from flask import request as ws_request
    import base64
    token = ws_request.args.get('token') or ws_request.headers.get('Authorization', '').replace('Bearer ', '')
    if token and Config.SUPABASE_JWT_SECRET:
        secret = Config.SUPABASE_JWT_SECRET
        decoded = None
        try:
            decoded = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        except Exception:
            try:
                import base64
                secret_bytes = base64.b64decode(secret)
                decoded = jwt.decode(
                    token,
                    secret_bytes,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
            except Exception as e:
                print(f"[WS] Could not authenticate socket connection: {e}")

        if decoded:
            user_id = decoded.get('sub')
            if user_id:
                join_room(user_id)
                print(f"[WS] User {user_id} joined their private room.")


if __name__ == '__main__':
    print("Starting CareCompanion server with WebSockets...")
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
