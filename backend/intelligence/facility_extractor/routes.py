import json
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.llms.groq import Groq as LlamaGroq

from shared.security import check_token
from shared.config import Config
from intelligence.facility_extractor.agent_workflow import medical_agent_app

hackathon_bp = Blueprint('hackathon', __name__)

Settings.llm = LlamaGroq(model="llama-3.1-8b-instant", api_key=Config.GROQ_API_KEY)
Settings.embed_model = "local:BAAI/bge-small-en-v1.5"


class FacilityData(BaseModel):
    ngos: Optional[List[str]] = Field(default_factory=list, description="NGO names present in the text.")
    facilities: Optional[List[str]] = Field(default_factory=list, description="Healthcare facility names present in the text.")
    facilityTypeId: Optional[Literal["hospital", "pharmacy", "doctor", "clinic", "dentist"]] = Field(None)
    operatorTypeId: Optional[Literal["public", "private"]] = Field(None)
    capacity: Optional[int] = Field(None)
    procedure: Optional[List[str]] = Field(default_factory=list)
    equipment: Optional[List[str]] = Field(default_factory=list)
    capability: Optional[List[str]] = Field(default_factory=list)
    specialties: Optional[List[str]] = Field(default_factory=list)


@hackathon_bp.route('/api/hackathon-analyze', methods=['POST'])
@check_token
def run_hackathon_agent():
    """Runs LangGraph medical facility anomaly detection workflow."""
    data = request.json or {}
    medical_text = data.get('text', '')
    file_name = data.get('fileName', 'Manual Text Entry')

    if not medical_text:
        return jsonify({"error": "No text provided"}), 400

    initial_state = {
        "medical_text": medical_text,
        "user_id": request.user_id,
        "file_name": file_name,
        "reasoning_log": ["Agent Initialized. Starting analysis..."],
        "final_data": {},
        "anomalies_detected": [],
        "citations": []
    }

    result = medical_agent_app.invoke(initial_state)

    return jsonify({
        "status": "success",
        "facility_data": result["final_data"],
        "anomalies": result["anomalies_detected"],
        "agent_thinking_process": result["reasoning_log"],
        "citations": result["citations"]
    }), 200


@hackathon_bp.route('/api/hackathon-extract', methods=['POST'])
@check_token
def hackathon_extract():
    """LlamaIndex structured facility information extraction."""
    data = request.json or {}
    medical_text = data.get('text', '')

    if not medical_text:
        return jsonify({"error": "No text provided"}), 400

    try:
        doc = Document(text=medical_text)
        index = VectorStoreIndex.from_documents([doc])
        query_engine = index.as_query_engine(output_cls=FacilityData)

        prompt = """
        You are a specialized medical facility information extractor for the Virtue Foundation.
        Analyze the following text to extract structured facts about healthcare facilities and NGOs.

        CRITICAL RULES:
        1. ngos & facilities: ONLY extract organizations explicitly mentioned by NAME. Use unabbreviated forms.
        2. equipment: Do NOT list bed counts here; only list specific bed devices/models or infrastructure like "MRI".
        3. capability: Extract Trauma/emergency care levels, Specialized medical units (ICU, NICU), and Accreditations.
        4. specialties: Use exact camelCase terminology based on context.
        5. Use clear, declarative statements in plain English for procedures and equipment. Include specific quantities when available.
        6. If a value cannot be directly mapped or is not explicitly stated, omit it or leave the array empty.

        Extract the structured JSON from this report.
        """

        response = query_engine.query(prompt)
        if hasattr(response, 'raw_output') and response.raw_output:
            extracted_json = response.raw_output.model_dump()
        else:
            extracted_json = json.loads(response.response)

        return jsonify({"status": "success", "data": extracted_json}), 200

    except Exception as e:
        print(f"Hackathon Agent Error: {e}")
        return jsonify({"error": "Agent failed to process document"}), 500


@hackathon_bp.route('/api/langgraph-extract', methods=['POST'])
@check_token
def run_langgraph_agent_route():
    """LangGraph extraction route."""
    data = request.json or {}
    medical_text = data.get('text', '')

    if not medical_text:
        return jsonify({"error": "No text provided"}), 400

    initial_state = {
        "medical_text": medical_text,
        "reasoning_log": ["Agent Initialized. Starting analysis..."],
        "final_data": {},
        "anomalies_detected": [],
        "citations": []
    }

    result = medical_agent_app.invoke(initial_state)

    return jsonify({
        "status": "success",
        "agent_log": result["reasoning_log"],
        "data": result["final_data"]
    }), 200
