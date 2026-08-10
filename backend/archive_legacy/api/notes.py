from flask import request, jsonify
from datetime import datetime, timezone
from api.__init__ import notes_bp
from core.security import check_token
from db.client import get_user_db

@notes_bp.route('/api/notes', methods=['GET', 'POST'])
@check_token
def manage_notes():
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500

        if request.method == 'POST':
            incoming_data = request.json or {}
            note_text = incoming_data.get("content")
            
            if not note_text:
                return jsonify({"error": "Content cannot be empty"}), 400
                
            current_time = datetime.now(timezone.utc).isoformat()

            response = db.table('notes').insert({
                'user_id': request.user_id,
                'content': note_text,
                'created_at': current_time,
                'updated_at': current_time
            }).execute()
            
            if not response.data:
                return jsonify({"error": "Failed to save note to database"}), 500
                
            return jsonify(response.data[0]), 201

        if request.method == 'GET':
            response = db.table('notes').select('*').eq('user_id', request.user_id).order('id', desc=True).execute()
            return jsonify(response.data or [])
            
    except Exception as e:
        print(f"Notepad Error: {e}")
        return jsonify({"error": "Database Connection Error: Could not manage notes"}), 500


@notes_bp.route('/api/notes/<note_id>', methods=['PUT', 'DELETE'])
@check_token
def handle_single_note(note_id):
    try:
        db = get_user_db()
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500

        if request.method == 'PUT':
            incoming_data = request.json or {}
            note_text = incoming_data.get("content")
            if not note_text:
                return jsonify({"error": "Content cannot be empty"}), 400
            current_time = datetime.now(timezone.utc).isoformat()

            response = db.table('notes').update({
                'content': note_text,
                'updated_at': current_time
            }).eq('id', note_id).eq('user_id', request.user_id).execute()

            if not response.data:
                return jsonify({"error": "Note not found or update failed"}), 404
            return jsonify(response.data[0]), 200

        if request.method == 'DELETE':
            db.table('notes').delete().eq('id', note_id).eq('user_id', request.user_id).execute()
            return jsonify({"message": "Note deleted successfully"}), 200
    except Exception as e:
        print(f"Single Note Error: {e}")
        return jsonify({"error": "Database Connection Error: Operation failed"}), 500
