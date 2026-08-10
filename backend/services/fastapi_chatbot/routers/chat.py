import sys
import os
from pathlib import Path

# Add backend directory to sys.path so imports like `chatbot.service` work seamlessly
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from services.fastapi_chatbot.dependencies import get_current_user, get_raw_token
from chatbot.service import ChatService

router = APIRouter(prefix="/api/chat", tags=["Chat & AI Assistant"])

class ChatRequest(BaseModel):
    message: str = ""
    attachment_context: Optional[str] = ""
    chat_id: Optional[str] = None

class OnDemandSummaryRequest(BaseModel):
    text: str

@router.post("")
async def chat_with_ai(
    req: ChatRequest,
    user: dict = Depends(get_current_user),
    user_token: str = Depends(get_raw_token)
):
    """RAG AI Chatbot conversation endpoint."""
    user_id = user.get("sub", "guest")
    try:
        reply = ChatService.process_user_message(
            user_id=user_id,
            message=req.message.strip(),
            attachment_context=(req.attachment_context or "").strip(),
            user_token=user_token,
            chat_id=req.chat_id
        )
        return {"reply": reply}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[FastAPI Chat Router] Exception: {e}")
        return {"reply": f"I processed your message: '{req.message}'. (Note: AI service logged: {str(e)})"}

@router.post("/upload-document")
async def upload_document_in_chat(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    user_token: str = Depends(get_raw_token)
):
    """Attach file in chat window and extract text."""
    user_id = user.get("sub", "guest")
    file_bytes = await file.read()
    try:
        result = ChatService.handle_document_upload(user_id, file_bytes, file.filename or "uploaded_file", user_token=user_token)
        return {"success": True, "data": result, "message": "Document processed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/summarize")
async def summarize_on_demand(
    req: OnDemandSummaryRequest,
    user: dict = Depends(get_current_user),
    user_token: str = Depends(get_raw_token)
):
    """Trigger AI Report Summarizer on-demand."""
    try:
        summary = ChatService.summarize_document_ondemand(req.text.strip())
        return {"success": True, "data": {"summary": summary}, "error": None}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    user: dict = Depends(get_current_user),
    user_token: str = Depends(get_raw_token)
):
    """Delete all messages for a specific chat."""
    user_id = user.get("sub", "guest")
    try:
        from shared.db_client import get_user_db, supabase
        db = get_user_db(user_token) or supabase
        if db:
            res = db.table('chat_history').delete().eq('user_id', user_id).eq('chat_id', chat_id).execute()
            return {"success": True, "message": "Chat deleted successfully", "data": res.data}
        else:
            raise HTTPException(status_code=500, detail="Database connection failed")
    except Exception as e:
        print(f"[FastAPI Chat Router] Delete Exception: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete chat")
