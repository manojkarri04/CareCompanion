from chatbot.rag_agent import rag_agent_app
from services.text_extractor import extract_text_from_bytes
from services.report_summarizer import analyze_with_llama
from chatbot.vector_service import store_document_chunks
from shared.db_client import get_user_db

from chatbot.tools import execute_tool_call

# In-memory store for Human-In-The-Loop pending actions
pending_actions = {}

class ChatService:
    """Service Layer: Orchestrates Conversational RAG, Document Attachment & On-Demand Summarization."""

    @staticmethod
    def process_user_message(user_id: str, message: str, attachment_context: str = "", user_token: str = None):
        if not user_id:
            raise ValueError("User ID is required")
        if not message and not attachment_context:
            raise ValueError("Message or document attachment is required")

        # HITL Confirmation Check
        if user_id in pending_actions:
            pending = pending_actions[user_id]
            msg_lower = message.strip().lower()
            if msg_lower in ['yes', 'y', 'confirm', 'sure', 'do it', 'ok', 'okay']:
                results = []
                for tc in pending:
                    res = execute_tool_call(tc["name"], tc.get("args", tc.get("kwargs", {})), user_token, user_id)
                    results.append(res)
                
                del pending_actions[user_id]
                final_res = "\n".join(results)
                
                # Persist directly
                from shared.db_client import get_user_db, supabase
                db = get_user_db(user_token) or supabase
                if db:
                    db.table('chat_history').insert({'user_id': user_id, 'role': 'user', 'message': message}).execute()
                    db.table('chat_history').insert({'user_id': user_id, 'role': 'assistant', 'message': final_res}).execute()
                
                return final_res
            elif msg_lower in ['no', 'n', 'cancel', 'stop', 'abort']:
                del pending_actions[user_id]
                return "Okay, action cancelled. How else can I help you?"
            else:
                # If they just said something else, clear it and process normally
                del pending_actions[user_id]

        full_user_message = message
        if attachment_context:
            full_user_message += f"\n\n[Attached Document Context]:\n{attachment_context}"

        initial_state = {
            "user_id": user_id,
            "user_token": user_token,
            "user_message": full_user_message,
            "user_profile": {},
            "appointments": [],
            "alerts": [],
            "notes": [],
            "vector_passages": [],
            "chat_history": [],
            "rag_prompt": "",
            "final_response": ""
        }

        final_state = rag_agent_app.invoke(initial_state)
        
        # Check if the LLM outputted tool calls requiring HITL
        pending_tc = final_state.get("pending_tool_calls")
        if pending_tc:
            pending_actions[user_id] = pending_tc
            
        return final_state.get("final_response", "No response generated.")

    @staticmethod
    def handle_document_upload(user_id: str, file_bytes: bytes, filename: str, user_token: str = None):
        """Extracts text from file in chat context and indexes it for RAG search."""
        if not user_id or not file_bytes:
            raise ValueError("User ID and valid file content are required")

        extracted_text = extract_text_from_bytes(file_bytes, filename)
        if not extracted_text:
            return {
                "filename": filename,
                "extracted_text": "",
                "message": "File uploaded but no readable text could be extracted."
            }

        # Store in vector store for dynamic RAG retrieval
        db = get_user_db(user_token)
        if db:
            try:
                store_document_chunks(db, user_id, doc_id=filename, filename=filename, text=extracted_text)
                
                # Also upload to Supabase Storage bucket so it can be saved permanently if requested
                db.storage.from_('documents').upload(filename, file_bytes)
            except Exception as e:
                print(f"[ChatService] Vector store indexing warning: {e}")

        return {
            "filename": filename,
            "extracted_text": extracted_text,
            "message": f"Successfully extracted text from {filename}. You can now ask questions about this report!"
        }

    @staticmethod
    def summarize_document_ondemand(text: str):
        """Triggers AI Report Summarizer ONLY when explicitly requested by user."""
        if not text or not text.strip():
            raise ValueError("No document text provided to summarize.")
        return analyze_with_llama(text)