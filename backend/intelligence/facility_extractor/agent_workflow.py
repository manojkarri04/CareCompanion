from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_groq import ChatGroq
from shared.config import Config
from shared.db_client import supabase


class AgentState(TypedDict):
    """State for the LangGraph Facility Reasoning Engine"""
    medical_text: str
    user_id: str
    file_name: str
    reasoning_log: List[str]
    final_data: dict
    anomalies_detected: List[str]
    citations: List[str]


llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant", groq_api_key=Config.GROQ_API_KEY)
json_parser = JsonOutputParser()


def extract_medical_data(state: AgentState):
    state["reasoning_log"].append("Step 1: Extracting medical entities using Llama 3.1.")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert IDP agent for the Virtue Foundation.
        Extract facts ONLY from the text. Return a JSON object EXACTLY matching this structure:
        {{
            "facilityName": "string",
            "procedure": ["list of strings"],
            "equipment": ["list of strings"],
            "specialties": ["list of strings"]
        }}
        If a field is missing in the text, return an empty list []."""),
        ("user", "Text to analyze:\n{text}")
    ])
    chain = prompt | llm | json_parser
    try:
        extracted_json = chain.invoke({"text": state["medical_text"]})
        state["final_data"] = extracted_json
        state["citations"].append("Data extracted directly from uploaded unstructured text.")
    except Exception as e:
        state["reasoning_log"].append(f"Extraction failed: {str(e)}")
        state["final_data"] = {"facilityName": "Unknown", "procedure": [], "equipment": [], "specialties": []}
    return state


def medical_reasoning_check(state: AgentState):
    state["reasoning_log"].append("Step 2: Running Medical Reasoning & Anomaly Detection.")
    data = state.get("final_data", {})
    anomalies = []

    procedures = data.get("procedure", [])
    equipment = data.get("equipment", [])

    if len(procedures) > 0 and len(equipment) == 0:
        anomalies.append(
            f"CRITICAL ANOMALY: Facility claims {len(procedures)} procedures "
            f"(including '{procedures[0]}') but lists 0 supporting equipment. "
            "High risk of misrepresentation or itinerant outreach."
        )

    procedure_text = " ".join(procedures).lower()
    equipment_text = " ".join(equipment).lower()
    if "surgery" in procedure_text or "surgical" in procedure_text:
        if "operating" not in equipment_text and "anesthesia" not in equipment_text:
            anomalies.append("GAP DETECTED: Claims surgical capability but lacks Operating Room/Anesthesia equipment signals.")

    state["anomalies_detected"] = anomalies
    if anomalies:
        state["reasoning_log"].append(f"Found {len(anomalies)} anomalies requiring review.")
    else:
        state["reasoning_log"].append("Facility claims appear consistent with infrastructure signals.")
    return state


def save_to_database(state: AgentState):
    state["reasoning_log"].append("Step 3: Saving verified hospital capabilities to database.")
    try:
        if not supabase:
            raise Exception("Supabase client is not initialized")
        payload = {
            "user_id": state["user_id"],
            "facility_name": state["final_data"].get("facilityName", "Unknown Facility"),
            "procedure": state["final_data"].get("procedure", []),
            "equipment": state["final_data"].get("equipment", []),
            "specialties": state["final_data"].get("specialties", []),
            "anomalies_detected": state["anomalies_detected"],
            "source_document_name": state["file_name"]
        }
        supabase.table('verified_facilities').insert(payload).execute()
        state["reasoning_log"].append("Success: Data securely committed to the verified_facilities database.")
    except Exception as e:
        print(f"Supabase Error: {e}")
        state["reasoning_log"].append("Database Error: Could not save data.")
    return state


workflow = StateGraph(AgentState)
workflow.add_node("extractor", extract_medical_data)
workflow.add_node("reasoning_engine", medical_reasoning_check)
workflow.add_node("database_saver", save_to_database)
workflow.set_entry_point("extractor")
workflow.add_edge("extractor", "reasoning_engine")
workflow.add_edge("reasoning_engine", "database_saver")
workflow.add_edge("database_saver", END)

medical_agent_app = workflow.compile()
