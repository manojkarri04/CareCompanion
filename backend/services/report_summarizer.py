import requests
from shared.config import Config

def analyze_with_llama(text: str) -> str:
    """Uses Groq Llama 3.1 to generate a clean summary of an uploaded document on-demand."""
    if not text or not text.strip():
        return "Error: No Readable Text Found\n- The document contains no readable text to summarize."

    prompt = f"""You are a helpful medical assistant AI. Summarize the following medical report in plain, simple English for a patient.
    Write a short title on the very first line.
    Write 3 to 5 bullet points explaining key findings, vital metrics, or next steps.
    Do NOT add any meta commentary. Output only the title and bullet points.

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
        print(f"[ReportSummarizerService] Groq API Error: {e}")
        return "Error Processing Summary\n- Could not connect to LLM Summarization service."

def background_ai_task(filename: str, extracted_text: str, user_id: str, chat_id: str, document_id: str, user_token: str = None):
    """Background AI task processing document indexing and summarization."""
    print(f"[ReportSummarizer] Processing {filename} for user {user_id}...")
    try:
        from shared.db_client import supabase, get_user_db
        from chatbot.vector_service import store_document_chunks
        import asyncio
        from services.fastapi_chatbot.routers.websockets import manager

        db = get_user_db(user_token) or supabase
        if db and extracted_text:
            store_document_chunks(db, user_id, document_id, filename, extracted_text)

        summary_text = analyze_with_llama(extracted_text)
        print(f"[ReportSummarizer] Finished processing {filename}: {summary_text[:60]}...")
        
        # Notify the user via WebSocket
        message = {
            "event": "report_ready",
            "chat_id": chat_id,
            "analysis": summary_text
        }
        
        # We are in a sync thread, so we create a new event loop to run the async broadcast
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.send_personal_message(message, user_id))
        except RuntimeError:
            asyncio.run(manager.send_personal_message(message, user_id))
            
    except Exception as e:
        print(f"[ReportSummarizer] Background task warning: {e}")
