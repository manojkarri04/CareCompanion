import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.fastapi_chatbot.dependencies import get_current_user
from intelligence.facility_extractor.agent_workflow import medical_agent_app

router = APIRouter(prefix="/api", tags=["Geospatial & Facility Extractor"])

class AnalysisRequest(BaseModel):
    text: str
    fileName: Optional[str] = "Manual Text Entry"

@router.post("/hackathon-analyze")
async def run_hackathon_agent(
    req: AnalysisRequest,
    user: dict = Depends(get_current_user)
):
    """Runs LangGraph medical facility anomaly detection workflow."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    user_id = user.get("sub", "guest")
    initial_state = {
        "medical_text": req.text,
        "user_id": user_id,
        "file_name": req.fileName,
        "reasoning_log": ["Agent Initialized. Starting analysis..."],
        "final_data": {},
        "anomalies_detected": [],
        "citations": []
    }

    try:
        result = medical_agent_app.invoke(initial_state)
        return {
            "status": "success",
            "facility_data": result.get("final_data", {}),
            "anomalies": result.get("anomalies_detected", []),
            "agent_thinking_process": result.get("reasoning_log", []),
            "citations": result.get("citations", [])
        }
    except Exception as e:
        print(f"[Facility Router Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Facility analysis failed: {str(e)}")
