from flask import Blueprint, request
from shared.security import check_token
from shared.response import success_response, error_response
from chatbot.service import ChatService

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/chat', methods=['POST'])
@check_token
def chat_with_ai():
    """POST /api/chat - RAG Chat Bot conversation endpoint."""
    try:
        data = request.json or {}
        user_message = data.get("message", "").strip()
        attachment_context = data.get("attachment_context", "").strip()

        reply = ChatService.process_user_message(request.user_id, user_message, attachment_context)
        return success_response(data={"reply": reply})
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Chat Controller] Error in chat_with_ai: {e}")
        return error_response("Internal error processing chat request", status_code=500)

@chat_bp.route('/api/chat/upload-document', methods=['POST'])
@check_token
def upload_document_in_chat():
    """POST /api/chat/upload-document - Attach file in chat window and extract text."""
    try:
        if 'file' not in request.files:
            return error_response("No file provided in request", status_code=400)

        uploaded_file = request.files['file']
        filename = uploaded_file.filename or 'uploaded_document'
        file_bytes = uploaded_file.read()

        result = ChatService.handle_document_upload(request.user_id, file_bytes, filename)
        return success_response(data=result, message="Document uploaded and processed successfully")
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Chat Controller] Error uploading document in chat: {e}")
        return error_response("Internal error uploading document", status_code=500)

@chat_bp.route('/api/chat/summarize', methods=['POST'])
@check_token
def summarize_on_demand():
    """POST /api/chat/summarize - Trigger AI Report Summarizer on-demand."""
    try:
        data = request.json or {}
        extracted_text = data.get("text", "").strip()

        summary = ChatService.summarize_document_ondemand(extracted_text)
        return success_response(data={"summary": summary})
    except ValueError as val_err:
        return error_response(str(val_err), status_code=400)
    except Exception as e:
        print(f"[Chat Controller] Error generating on-demand summary: {e}")
        return error_response("Internal error generating summary", status_code=500)
