from flask import jsonify
from api.__init__ import system_bp

@system_bp.route('/api/ping', methods=['GET'])
def ping_server():
    return jsonify({"reply": "pong"}), 200

@system_bp.route('/', methods=['GET'])
def home():
    return "CareCompanion Backend is running perfectly with all routes!"
