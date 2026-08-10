import requests
from shared.config import Config
from shared.db_client import supabase, get_user_db
from chatbot.vector_service import store_document_chunks


def analyze_with_llama(text: str) -> str:
    """Uses Groq Llama 3.1 to generate a clean bulleted summary of an uploaded document."""
    if not text or not text.strip():
        return "Error: No Readable Text Found\n- The uploaded document contains no readable text.\n- If it is an image or scanned document, ensure PyTesseract OCR is enabled."

    prompt = f"""You are a helpful AI assistant. Summarize the following document in plain, simple English.
    Write a short title on the very first line.
    Write 3 to 5 bullet points on the following lines, starting each with a dash (-).
    Do NOT add any extra conversational text. Just output the title and bullet points.

    Document Content:
    {text}"""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {Config.GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}]}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        print("[ReportSummarizer] Groq Error:", e)
        return "Error Processing Report\n- Could not connect to Groq Llama 3.1 API.\n- Please verify your API key and connection."


def background_ai_task(filename: str, extracted_text: str, user_id: str, chat_id: str, document_id: str):
    """Runs pgvector chunk ingestion in background and emits report summary via WebSocket."""
    from extensions import socketio
    print(f"[ReportSummarizer] Processing {filename} for user {user_id}...")

    db = get_user_db() or supabase
    if db and extracted_text:
        store_document_chunks(db, user_id, document_id, filename, extracted_text)

    summary_text = analyze_with_llama(extracted_text)

    socketio.emit('report_ready', {
        'message': f'Your summary for {filename} is ready!',
        'analysis': summary_text,
        'extracted_text': extracted_text,
        'chat_id': chat_id,
        'document_id': document_id
    }, room=user_id)
    print(f"[ReportSummarizer] Finished processing {filename}!")
