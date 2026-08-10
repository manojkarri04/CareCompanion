from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from shared.config import Config
from shared.db_client import supabase, get_user_db
from chatbot.vector_service import similarity_search

class RAGState(TypedDict):
    """State schema for the LangGraph RAG Agent Graph"""
    user_id: str
    user_token: str
    user_message: str
    user_profile: Dict[str, Any]
    appointments: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    notes: List[Dict[str, Any]]
    vector_passages: List[Dict[str, Any]]
    chat_history: List[Dict[str, Any]]
    rag_prompt: str
    final_response: str
    pending_tool_calls: list


def fetch_user_context(state: RAGState) -> RAGState:
    """Node 1: Retrieves user profile, schedule, medication alerts, notes, and chat history."""
    db = get_user_db(state.get("user_token")) or supabase
    user_id = state.get("user_id", "")

    profile = {}
    try:
        res = db.table('profiles').select('full_name, email').eq('id', user_id).execute()
        if res.data:
            profile = res.data[0]
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching profile: {e}")
    state["user_profile"] = profile

    apts = []
    try:
        res = db.table('appointments_appointment').select('*').eq('user_id', user_id).execute()
        if res.data:
            apts = res.data
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching appointments: {e}")
    state["appointments"] = apts

    alerts = []
    try:
        res = db.table('alerts_alert').select('*').eq('user_id', user_id).execute()
        if res.data:
            alerts = res.data
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching alerts: {e}")
    state["alerts"] = alerts

    notes = []
    try:
        res = db.table('notes_note').select('content, created_at').eq('user_id', user_id).order('id', desc=True).limit(5).execute()
        if res.data:
            notes = res.data
    except Exception as e:
        print(f"[LangGraph Node 1] Error fetching notes: {e}")
    state["notes"] = notes

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
    db = get_user_db(state.get("user_token")) or supabase
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
    """Node 3: Merges all context sources into a structured RAG system prompt."""
    prof = state.get("user_profile", {})
    name = prof.get("full_name") or "User"
    email = prof.get("email") or ""

    apts = state.get("appointments", [])
    apts_str = "\n".join([f"- {a.get('doctor')} ({a.get('specialty', 'General')}) on {a.get('date')} at {a.get('time')} [{a.get('status', 'Confirmed')}]" for a in apts]) if apts else "No appointments scheduled."

    alerts = state.get("alerts", [])
    alerts_str = "\n".join([f"- {al.get('medication_name')} at {al.get('time')} on {al.get('date', 'daily')}" for al in alerts]) if alerts else "No medication alerts set."

    notes = state.get("notes", [])
    notes_str = "\n".join([f"- {n.get('content')}" for n in notes]) if notes else "No saved notes."

    passages = state.get("vector_passages", [])
    passages_str = "\n\n".join([f"[Document Passages]: {p.get('content')}" for p in passages]) if passages else "No matching document passages found."

    history = state.get("chat_history", [])
    history_str = "\n".join([f"{h.get('role', 'user').upper()}: {h.get('message')}" for h in history]) if history else "No previous history."

    state["rag_prompt"] = f"""You are CareCompanion AI, an empathetic and helpful personal assistant.
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
- If you decide an action is needed (like scheduling an appointment, creating an alert, saving a note, or generating/saving a document), simply use the provided tool. The system will handle asking the user for confirmation.
- IMPORTANT: If a user uploads a medical report for analysis, once you have answered their questions and cleared their doubts, you MUST proactively ask them if they would like to save the analysis into their Saved Documents.
- Maintain a helpful, empathetic, and clear tone.
"""
    return state


def generate_llm_response(state: RAGState) -> RAGState:
    """Node 4: Executes ChatGroq model chain using Llama 3.1."""
    from chatbot.tools import tools_schema
    try:
        chat_model = ChatGroq(temperature=0.0, model_name="llama-3.1-8b-instant", groq_api_key=Config.GROQ_API_KEY)
        chat_model = chat_model.bind_tools(tools_schema)
        
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_message}")
        ])
        chain = prompt_template | chat_model
        response = chain.invoke({"system_prompt": state.get("rag_prompt", ""), "user_message": state.get("user_message", "")})
        
        if response.tool_calls:
            state["pending_tool_calls"] = response.tool_calls
            # Let the interceptor generate the confirmation message
            tool_names = ", ".join([tc["name"] for tc in response.tool_calls])
            state["final_response"] = f"I am preparing to run the following action(s): {tool_names}. Please reply with 'yes' to confirm or 'no' to cancel."
        else:
            state["final_response"] = response.content
            state["pending_tool_calls"] = []
    except Exception as e:
        print(f"[LangGraph Node 4] LLM Error: {e}")
        state["final_response"] = "I'm having trouble connecting to the AI model right now. Please try again."
        state["pending_tool_calls"] = []
    return state


def persist_history(state: RAGState) -> RAGState:
    """Node 5: Persists user message and assistant reply to Supabase chat_history table."""
    db = get_user_db(state.get("user_token")) or supabase
    user_id = state.get("user_id", "")
    chat_id = state.get("chat_id", "")
    if db and user_id:
        try:
            db.table('chat_history').insert({'user_id': user_id, 'chat_id': chat_id, 'role': 'user', 'message': state.get("user_message", "")}).execute()
            db.table('chat_history').insert({'user_id': user_id, 'chat_id': chat_id, 'role': 'assistant', 'message': state.get("final_response", "")}).execute()
            print(f"[LangGraph Node 5] Saved chat turn for user {user_id}")
        except Exception as e:
            print(f"[LangGraph Node 5] Error persisting chat history: {e}")
    return state


# Build the compiled LangGraph StateGraph
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
