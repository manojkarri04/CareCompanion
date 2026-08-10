from flask import jsonify, Blueprint

system_bp = Blueprint('system', __name__)


@system_bp.route('/api/ping', methods=['GET'])
def ping_server():
    return jsonify({"reply": "pong"}), 200


@system_bp.route('/', methods=['GET'])
def home():
    return "CareCompanion Backend is running perfectly with all routes!"
