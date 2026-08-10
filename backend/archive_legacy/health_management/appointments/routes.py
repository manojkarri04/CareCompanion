from flask import Blueprint, request
from shared.security import check_token
from shared.response import success_response, error_response
from health_management.appointments.service import AppointmentsService

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/api/appointments', methods=['GET'])
@check_token
def get_appointments():
    """GET /api/appointments - Fetch sorted appointments for authenticated user."""
    try:
        apts = AppointmentsService.get_user_appointments(request.user_id)
        return success_response(data=apts)
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Appointments Controller] Error fetching: {e}")
        return error_response("Internal Server Error fetching appointments", status_code=500)

@appointments_bp.route('/api/appointments', methods=['POST'])
@check_token
def create_appointment():
    """POST /api/appointments - Schedule a new doctor appointment."""
    try:
        data = request.json or {}
        new_apt = AppointmentsService.create_appointment(request.user_id, data)
        return success_response(data=new_apt, message="Appointment created successfully", status_code=201)
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Appointments Controller] Error creating: {e}")
        return error_response("Internal Server Error creating appointment", status_code=500)

@appointments_bp.route('/api/appointments/<apt_id>', methods=['PUT'])
@check_token
def update_appointment(apt_id):
    """PUT /api/appointments/<apt_id> - Update appointment details."""
    try:
        data = request.json or {}
        updated_apt = AppointmentsService.update_appointment(request.user_id, apt_id, data)
        return success_response(data=updated_apt, message="Appointment updated successfully")
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except KeyError as key_err:
        return error_response(str(key_err), status_code=404)
    except Exception as e:
        print(f"[Appointments Controller] Error updating: {e}")
        return error_response("Internal Server Error updating appointment", status_code=500)

@appointments_bp.route('/api/appointments/<apt_id>/cancel', methods=['PUT'])
@check_token
def cancel_appointment(apt_id):
    """PUT /api/appointments/<apt_id>/cancel - Cancel appointment."""
    try:
        AppointmentsService.cancel_appointment(request.user_id, apt_id)
        return success_response(message="Appointment cancelled successfully")
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Appointments Controller] Error cancelling: {e}")
        return error_response("Internal Server Error cancelling appointment", status_code=500)
