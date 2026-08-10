import sys
import threading
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from services.fastapi_chatbot.dependencies import get_current_user, get_raw_token
from services.text_extractor import extract_text_from_bytes
from services.report_summarizer import background_ai_task

router = APIRouter(prefix="/api/analyze", tags=["Medical Report Analyzer"])

def format_size(size_in_bytes: int) -> str:
    if size_in_bytes >= 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"
    return f"{size_in_bytes / 1024:.1f} KB"

@router.post("")
async def analyze_medical_report(
    file: UploadFile = File(...),
    chat_id: str = Form(""),
    user: dict = Depends(get_current_user),
    user_token: str = Depends(get_raw_token)
):
    """Async file upload endpoint for extracting text and analyzing medical reports."""
    user_id = user.get("sub", "guest")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or "medical_report.pdf"
    formatted_size = format_size(len(file_bytes))

    try:
        extracted_text = extract_text_from_bytes(file_bytes, filename)
        
        # Launch background AI analysis task
        ai_thread = threading.Thread(
            target=background_ai_task,
            args=(filename, extracted_text, user_id, chat_id, "doc_fastapi", user_token)
        )
        ai_thread.daemon = True
        ai_thread.start()

        return {
            "status": "processing",
            "message": "File received by FastAPI AI service. AI is indexing and analyzing text.",
            "chat_id": chat_id,
            "filename": filename,
            "size": formatted_size
        }
    except Exception as e:
        print(f"[FastAPI Analyzer Error]: {e}")
        raise HTTPException(status_code=500, detail="Could not analyze file.")
