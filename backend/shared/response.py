from flask import jsonify

def success_response(data=None, message=None, status_code=200):
    """Standardized API success envelope."""
    payload = {
        "success": True,
        "data": data,
        "error": None
    }
    if message:
        payload["message"] = message
    return jsonify(payload), status_code

def error_response(error_message, status_code=400, details=None):
    """Standardized API error envelope."""
    payload = {
        "success": False,
        "data": None,
        "error": error_message
    }
    if details:
        payload["details"] = details
    return jsonify(payload), status_code
