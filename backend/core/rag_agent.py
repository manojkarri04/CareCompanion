from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from core.config import Config
from db.client import supabase, get_user_db
from core.vector_service import similarity_search


class RAGState(TypedDict):
    """State schema for the LangGraph RAG Agent Graph"""
    user_id: str
    user_message: str
    user_profile: Dict[str, Any]
    appointments: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    notes: List[Dict[str, Any]]
    vector_passages: List[Dict[str, Any]]
    chat_history: List[Dict[str, Any]]
    rag_prompt: str
    final_response: str


def fetch_user_context(state: RAGState) -> RAGState:
    """Node 1: Retrieves user profile, schedule, medication alerts, notes, and chat history."""
    db = get_user_db() or supabase
    user_id = state.get("user_id", "")

    # Profile
    profile = {}
    try:
        res = db.table('profiles').select('full_name, email').eq('id', user_id).execute()
        if res.data:
            profile = res.data[0]
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching profile: {e}")
    state["user_profile"] = profile

    # Appointments
    apts = []
    try:
        res = db.table('appointments').select('*').eq('user_id', user_id).execute()
        if res.data:
            apts = res.data
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching appointments: {e}")
    state["appointments"] = apts

    # Alerts
    alerts = []
    try:
        res = db.table('alerts').select('*').eq('user_id', user_id).execute()
        if res.data:
            alerts = res.data
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching alerts: {e}")
    state["alerts"] = alerts

    # Notes
    notes = []
    try:
        res = db.table('notes').select('content, created_at').eq('user_id', user_id).order('id', desc=True).limit(5).execute()
        if res.data:
            notes = res.data
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching notes: {e}")
    state["notes"] = notes

    # Recent DB Chat History
    history = []
    try:
        res = db.table('chat_history').select('role, message').eq('user_id', user_id).order('created_at', desc=True).limit(6).execute()
        if res.data:
            history = list(reversed(res.data))
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching history: {e}")
    state["chat_history"] = history

    return state


def search_vector_db(state: RAGState) -> RAGState:
    """Node 2: Performs pgvector similarity search on document embeddings."""
    db = get_user_db() or supabase
    user_id = state.get("user_id", "")
    query = state.get("user_message", "")

    passages = []
    try:
        matched = similarity_search(db, user_id, query, top_k=5)
        if matched:
            passages = matched
    except Exception as e:
        print(f"[LangGraph Node 2] Error searching vector DB: {e}")

    state["vector_passages"] = passages
    return state


def build_rag_prompt(state: RAGState) -> RAGState:
    """Node 3: Merges profile, vector search passages, schedule, notes, and chat history into a structured prompt."""
    prof = state.get("user_profile", {})
    name = prof.get("full_name") or "User"
    email = prof.get("email") or ""

    apts = state.get("appointments", [])
    apts_str = "\n".join([f"- {a.get('doctor')} ({a.get('specialty', 'General')}) on {a.get('date')} at {a.get('time')} [{a.get('status', 'Confirmed')}]" for a in apts]) if apts else "No appointments scheduled."

    alerts = state.get("alerts", [])
    alerts_str = "\n".join([f"- {al.get('medicationName')} at {al.get('time')} on {al.get('date', 'daily')}" for al in alerts]) if alerts else "No medication alerts set."

    notes = state.get("notes", [])
    notes_str = "\n".join([f"- {n.get('content')}" for n in notes]) if notes else "No saved notes."

    passages = state.get("vector_passages", [])
    passages_str = "\n\n".join([f"[Document Passages]: {p.get('content')}" for p in passages]) if passages else "No matching document passages found."

    history = state.get("chat_history", [])
    history_str = "\n".join([f"{h.get('role', 'user').upper()}: {h.get('message')}" for h in history]) if history else "No previous history."

    system_prompt = f"""You are CareCompanion AI, an empathetic and helpful personal assistant.
Utilize the user's personal details, schedule, medication alerts, notes, and document records to answer their query accurately.

=== USER PROFILE ===
Name: {name}
Email: {email}

=== RELEVANT DOCUMENT EXCERPTS (pgvector RAG) ===
{passages_str}

=== SCHEDULE & APPOINTMENTS ===
{apts_str}

=== MEDICATION ALERTS ===
{alerts_str}

=== SAVED NOTES ===
{notes_str}

=== RECENT CHAT HISTORY ===
{history_str}

=== INSTRUCTIONS ===
- Directly and warmly answer the user's question using the context above.
- If asked about their profile, appointments, alerts, notes, or uploaded documents, use the provided records.
- Maintain a helpful, empathetic, and clear tone.
"""

    state["rag_prompt"] = system_prompt
    return state


def generate_llm_response(state: RAGState) -> RAGState:
    """Node 4: Executes ChatGroq model chain using Llama 3.1."""
    prompt_text = state.get("rag_prompt", "")
    user_msg = state.get("user_message", "")

    try:
        chat_model = ChatGroq(
            temperature=0.5,
            model_name="llama-3.1-8b-instant",
            groq_api_key=Config.GROQ_API_KEY
        )
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_message}")
        ])
        chain = prompt_template | chat_model
        response = chain.invoke({
            "system_prompt": prompt_text,
            "user_message": user_msg
        })
        state["final_response"] = response.content
    except Exception as e:
        print(f"[LangGraph Node 4] LLM Error: {e}")
        state["final_response"] = "I'm having trouble connecting to the AI model right now. Please try again."

    return state


def persist_history(state: RAGState) -> RAGState:
    """Node 5: Persists user message and assistant reply to Supabase chat_history table."""
    db = get_user_db() or supabase
    user_id = state.get("user_id", "")
    user_msg = state.get("user_message", "")
    bot_reply = state.get("final_response", "")

    if db and user_id:
        try:
            db.table('chat_history').insert({
                'user_id': user_id,
                'role': 'user',
                'message': user_msg
            }).execute()

            db.table('chat_history').insert({
                'user_id': user_id,
                'role': 'assistant',
                'message': bot_reply
            }).execute()
            print(f"[LangGraph Node 5] Successfully saved chat turn to chat_history for user {user_id}")
        except Exception as e:
            print(f"[LangGraph Node 5] Error persisting chat history: {e}")

    return state


# Build the LangGraph StateGraph
workflow = StateGraph(RAGState)

workflow.add_node("context_retriever", fetch_user_context)
workflow.add_node("vector_search", search_vector_db)
workflow.add_node("prompt_builder", build_rag_prompt)
workflow.add_node("llm_generator", generate_llm_response)
workflow.add_node("history_saver", persist_history)

workflow.set_entry_point("context_retriever")
workflow.add_edge("context_retriever", "vector_search")
workflow.add_edge("vector_search", "prompt_builder")
workflow.add_edge("prompt_builder", "llm_generator")
workflow.add_edge("llm_generator", "history_saver")
workflow.add_edge("history_saver", END)

rag_agent_app = workflow.compile()
