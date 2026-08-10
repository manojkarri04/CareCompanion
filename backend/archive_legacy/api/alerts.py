from db.client import get_user_db
from flask import request, jsonify
from core.security import check_token
from api.__init__ import alerts_bp

@alerts_bp.route('/api/alerts', methods=['POST'])
@check_token
def manage_alerts():
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500
        
        data = request.json
        response = db.table('alerts').insert({
            'user_id': request.user_id,
            'medicationName': data.get("medicationName"),
            'time': data.get("time"),
            'date': data.get("date")
        }).execute()
        
        return jsonify(response.data[0]), 201

    except Exception as e:
        print(f"Alerts Error: {e}")
        return jsonify({"error": "Database Connection Error: Could not manage alerts"}), 500


# 2. Route for Editing (PUT) and Deleting (DELETE) a specific alert
@alerts_bp.route('/api/alerts/<alert_id>', methods=['PUT', 'DELETE'])
@check_token
def handle_single_alert(alert_id):
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500

        if request.method == 'PUT':
            data = request.json or {}
            response = db.table('alerts').update({
                'medicationName': data.get("medicationName"),
                'time': data.get("time"),
                'date': data.get("date")
            }).eq('id', alert_id).eq('user_id', request.user_id).execute()

            if not response.data:
                return jsonify({"error": "Alert not found or update failed"}), 404
            return jsonify(response.data[0]), 200

        if request.method == 'DELETE':
            db.table('alerts').delete().eq('id', alert_id).eq('user_id', request.user_id).execute()
            return jsonify({"message": "Deleted successfully"}), 200
            
    except Exception as e:
        print(f"Single Alert Error: {e}")
        return jsonify({"error": "Database Connection Error: Operation failed"}), 500