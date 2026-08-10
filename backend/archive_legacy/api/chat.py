from flask import Blueprint, request, jsonify
from core.security import check_token
from core.rag_agent import rag_agent_app

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/chat', methods=['POST'])
@check_token
def chat_with_ai():
    """RAG Chat Bot endpoint powered by compiled LangGraph StateGraph."""
    data = request.json or {}
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"reply": "Please type a message."}), 400

    initial_state = {
        "user_id": request.user_id,
        "user_message": user_message,
        "user_profile": {},
        "appointments": [],
        "alerts": [],
        "notes": [],
        "vector_passages": [],
        "chat_history": [],
        "rag_prompt": "",
        "final_response": ""
    }

    try:
        final_state = rag_agent_app.invoke(initial_state)
        return jsonify({"reply": final_state.get("final_response", "No response generated.")}), 200
    except Exception as e:
        print(f"[Chat API] Graph execution error: {e}")
        return jsonify({"reply": "I encountered an issue processing your request through the LangGraph engine."}), 500
