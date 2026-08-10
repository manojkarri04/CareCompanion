import sys
from pathlib import Path

# Add root backend directory to Python path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.fastapi_chatbot.routers import chat, report_analyzer, facility, websockets

app = FastAPI(
    title="CareCompanion FastAPI AI & Chatbot Microservice",
    description="Dedicated microservice for Conversational RAG, AI Assistant, Medical Report Analysis, and Real-time WebSockets.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router)
app.include_router(report_analyzer.router)
app.include_router(facility.router)
app.include_router(websockets.router)

@app.get("/")
async def root():
    return {
        "service": "CareCompanion FastAPI AI & Chatbot Microservice",
        "status": "online",
        "documentation": "http://localhost:8001/docs",
        "health_check": "http://localhost:8001/health"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "FastAPI AI Chatbot Microservice", "port": 8001}

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI AI Chatbot Microservice on port 8001...")
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
