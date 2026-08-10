from flask import request, jsonify, Response
from api.__init__ import documents_bp
from core.security import check_token
from db.client import supabase, get_user_db
from services.text_extractor import extract_text_from_bytes
from services.report_summarizer import background_ai_task
import threading


def format_size(size_in_bytes: int) -> str:
    if size_in_bytes >= 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"
    return f"{size_in_bytes / 1024:.1f} KB"


@documents_bp.route('/api/analyze', methods=['POST'])
@check_token
def analyze_report():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    chat_id = request.form.get('chat_id', '')

    try:
        db = get_user_db() or supabase
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500

        file_bytes = file.read()
        file_size_bytes = len(file_bytes)
        formatted_size = format_size(file_size_bytes)

        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'document'
        file_type = 'pdf' if file_extension == 'pdf' else 'image' if file_extension in ['jpg', 'png', 'jpeg'] else 'document'

        storage_path = f"{request.user_id}/{file.filename}"

        # 1. Store actual document file in Supabase Storage Bucket 'medical_documents'
        db.storage.from_("medical_documents").upload(
            file=file_bytes,
            path=storage_path,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )

        # 2. Store document metadata strictly in 'saved_documents' table (no summary stored in DB table)
        doc_record = db.table('saved_documents').insert({
            'user_id': request.user_id,
            'file_name': file.filename,
            'file_type': file_type,
            'file_size': formatted_size
        }).execute()

        doc_id = doc_record.data[0]['id'] if doc_record.data else ''

        # 3. Perform text extraction (PyPDF2, PyTesseract OCR, DOCX, TXT)
        extracted_text = extract_text_from_bytes(file_bytes, file.filename)

        # 4. Trigger background task for pgvector chunk ingestion and socket notification
        ai_thread = threading.Thread(
            target=background_ai_task,
            args=(file.filename, extracted_text, request.user_id, chat_id, doc_id)
        )
        ai_thread.daemon = True
        ai_thread.start()

        return jsonify({
            "status": "processing",
            "message": "File uploaded securely to Supabase Storage! AI is indexing and analyzing it.",
            "chat_id": chat_id,
            "document_id": doc_id
        }), 202

    except Exception as e:
        print("Upload Error:", e)
        return jsonify({"error": "Could not process the file."}), 500


@documents_bp.route('/api/documents', methods=['GET'])
@check_token
def get_documents():
    try:
        db = get_user_db() or supabase
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500
        response = db.table('saved_documents') \
            .select('*') \
            .eq('user_id', request.user_id) \
            .order('upload_date', desc=True) \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        print("Database Error:", e)
        return jsonify({"error": "Could not fetch documents"}), 500


@documents_bp.route('/api/documents/<doc_id>', methods=['DELETE'])
@check_token
def delete_document(doc_id):
    try:
        db = get_user_db() or supabase
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500
        doc = db.table('saved_documents').select('file_name').eq('id', doc_id).eq('user_id', request.user_id).execute()
        if doc.data:
            filename = doc.data[0]['file_name']
            storage_path = f"{request.user_id}/{filename}"
            db.storage.from_('medical_documents').remove([storage_path])

        # Delete embeddings from vector table as well
        db.table('document_embeddings').delete().eq('document_id', doc_id).eq('user_id', request.user_id).execute()
        db.table('saved_documents').delete().eq('id', doc_id).eq('user_id', request.user_id).execute()
        return jsonify({"message": "Document and embeddings deleted successfully"})
    except Exception as e:
        return jsonify({"error": "Failed to delete"}), 500


@documents_bp.route('/api/documents/file/<filename>', methods=['GET'])
@check_token
def serve_document(filename):
    try:
        db = get_user_db() or supabase
        if not db:
            return jsonify({"error": "Supabase client not initialized"}), 500
        storage_path = f"{request.user_id}/{filename}"
        file_data = db.storage.from_("medical_documents").download(storage_path)

        return Response(file_data, mimetype="application/pdf")
    except Exception as e:
        print("Serve Error:", e)
        return jsonify({"error": "File not found in cloud"}), 404
