from flask import Blueprint, request
from shared.security import check_token
from shared.response import success_response, error_response
from health_management.alerts.service import AlertsService

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/api/alerts', methods=['GET'])
@check_token
def get_alerts():
    """GET /api/alerts - Fetch all alerts for authenticated user."""
    try:
        alerts = AlertsService.get_user_alerts(request.user_id)
        return success_response(data=alerts)
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Alerts Controller] Error fetching alerts: {e}")
        return error_response("Internal Server Error: Unable to fetch alerts", status_code=500)

@alerts_bp.route('/api/alerts', methods=['POST'])
@check_token
def create_alert():
    """POST /api/alerts - Create a new medication alert."""
    try:
        data = request.json or {}
        new_alert = AlertsService.create_alert(request.user_id, data)
        return success_response(data=new_alert, message="Alert created successfully", status_code=201)
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Alerts Controller] Error creating alert: {e}")
        return error_response("Internal Server Error: Unable to create alert", status_code=500)

@alerts_bp.route('/api/alerts/<alert_id>', methods=['PUT'])
@check_token
def update_alert(alert_id):
    """PUT /api/alerts/<alert_id> - Update an existing alert."""
    try:
        data = request.json or {}
        updated_alert = AlertsService.update_alert(request.user_id, alert_id, data)
        return success_response(data=updated_alert, message="Alert updated successfully")
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except KeyError as key_err:
        return error_response(str(key_err), status_code=404)
    except Exception as e:
        print(f"[Alerts Controller] Error updating alert: {e}")
        return error_response("Internal Server Error: Unable to update alert", status_code=500)

@alerts_bp.route('/api/alerts/<alert_id>', methods=['DELETE'])
@check_token
def delete_alert(alert_id):
    """DELETE /api/alerts/<alert_id> - Delete an alert."""
    try:
        AlertsService.delete_alert(request.user_id, alert_id)
        return success_response(message="Alert deleted successfully")
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Alerts Controller] Error deleting alert: {e}")
        return error_response("Internal Server Error: Unable to delete alert", status_code=500)
