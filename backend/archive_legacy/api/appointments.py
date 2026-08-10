from flask import request, jsonify
from api.__init__ import appointments_bp
from core.security import check_token
from db.client import get_user_db
from data_structures.linear.sorter import AppointmentSorter

my_sorter = AppointmentSorter()

@appointments_bp.route('/api/appointments', methods=['GET', 'POST'])
@check_token
def manage_appointments():
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500

        if request.method == 'POST':
            data = request.json or {}
            if not data.get("date") or not data.get("time") or not data.get("doctor"):
                return jsonify({"error": "Missing required appointment fields"}), 400
                
            response = db.table('appointments').insert({
                'user_id': request.user_id,
                'date': data.get("date"),
                'time': data.get("time"),
                'doctor': data.get("doctor"),
                'specialty': data.get("specialty"),
                'location': data.get("location", "TBD"),
                'status': data.get("status", "Confirmed")
            }).execute()
            
            if not response.data:
                return jsonify({"error": "Failed to create appointment"}), 500
                
            return jsonify(response.data[0]), 201

        if request.method == 'GET':
            response = db.table('appointments').select('*').eq('user_id', request.user_id).execute()
            appointments_list = response.data or []
            
            try:
                sorted_apts = my_sorter.merge_sort(appointments_list)
            except Exception as sort_err:
                print(f"Sorting failed: {sort_err}. Falling back to unsorted data.")
                sorted_apts = appointments_list
                
            return jsonify(sorted_apts)
            
    except Exception as e:
        print(f"Appointments Error: {e}")
        return jsonify({"error": "An internal error occurred managing appointments"}), 500


@appointments_bp.route('/api/appointments/<apt_id>/cancel', methods=['PUT'])
@check_token
def cancel_appointment(apt_id):
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500
        db.table('appointments').update({'status': 'Cancelled'}).eq('id', apt_id).eq('user_id', request.user_id).execute()
        return jsonify({"message": "Cancelled successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to cancel appointment: {str(e)}"}), 500


@appointments_bp.route('/api/appointments/<apt_id>', methods=['PUT'])
@check_token
def update_appointment(apt_id):
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500
        data = request.json or {}
        response = db.table('appointments').update({
            'date': data.get("date"),
            'time': data.get("time"),
            'doctor': data.get("doctor"),
            'specialty': data.get("specialty"),
            'location': data.get("location", "TBD")
        }).eq('id', apt_id).eq('user_id', request.user_id).execute()
        
        if not response.data:
            return jsonify({"error": "Appointment not found or update failed"}), 404
            
        return jsonify(response.data[0]), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update appointment: {str(e)}"}), 500
