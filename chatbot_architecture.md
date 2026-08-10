# CareCompanion AI Chatbot Architecture

The CareCompanion AI Chatbot is designed using a **Microservice Architecture** powered by FastAPI, combined with an advanced **RAG (Retrieval-Augmented Generation)** pipeline using LangGraph and Supabase `pgvector`. 

The system is logically divided into three distinct layers:
1. **The API Layer** (`fastapi_chatbot/`): Handles HTTP requests, WebSockets, and Authentication.
2. **The Core AI Layer** (`chatbot/`): Handles the LangGraph state machine, LLM prompt building, and vector searches.
3. **The Utility/Database Layer** (`services/` & `shared/`): Handles document parsing, summarization, and Supabase database interactions.

---

## 1. The API Layer (FastAPI Microservice)
Location: [`backend/services/fastapi_chatbot/`](file:///d:/CareCompanion/backend/services/fastapi_chatbot/)

This is the front door of the chatbot. It receives requests from your Next.js frontend, validates security tokens, and delegates tasks to the AI layer.

### Core Files
- **[`main.py`](file:///d:/CareCompanion/backend/services/fastapi_chatbot/main.py)**: 
  The entry point of the microservice. It initializes the FastAPI application, sets up CORS (so your Next.js frontend can talk to it), and registers all the routers.
- **[`dependencies.py`](file:///d:/CareCompanion/backend/services/fastapi_chatbot/dependencies.py)**: 
  Handles Security. The `get_current_user` function decodes incoming Supabase JWT tokens to extract the user's ID. The `get_raw_token` function extracts the raw token string so it can be passed to the database for Row-Level Security (RLS) enforcement.

### Routers (Endpoints)
- **[`routers/chat.py`](file:///d:/CareCompanion/backend/services/fastapi_chatbot/routers/chat.py)**: 
  Exposes the `/api/chat` endpoints. When a user sends a message, this file receives it, extracts their JWT token, and passes the message down to the `ChatService` for processing.
- **[`routers/report_analyzer.py`](file:///d:/CareCompanion/backend/services/fastapi_chatbot/routers/report_analyzer.py)**: 
  Exposes the `/api/analyze` endpoint. When a user uploads a medical PDF/image, this endpoint accepts the file, extracts the raw text, and spawns a **background thread** to analyze the document without blocking the API response.
- **[`routers/websockets.py`](file:///d:/CareCompanion/backend/services/fastapi_chatbot/routers/websockets.py)**: 
  Manages real-time WebSockets. Since the `report_analyzer` runs in the background, this WebSocket connection allows the server to instantly push a notification to the Next.js frontend the moment the AI finishes summarizing a document.

---

## 2. The Core AI Layer (LangGraph & RAG)
Location: [`backend/chatbot/`](file:///d:/CareCompanion/backend/chatbot/)

This layer is where the "intelligence" lives. It uses LangGraph to define a structured workflow (a graph of nodes) that the AI must follow to answer a question.

- **[`service.py`](file:///d:/CareCompanion/backend/chatbot/service.py)**: 
  The Orchestrator. It acts as the bridge between the API routers and the LangGraph agent. It takes the user's message, builds the initial `RAGState` dictionary, and triggers `rag_agent_app.invoke()`.
- **[`rag_agent.py`](file:///d:/CareCompanion/backend/chatbot/rag_agent.py)**: 
  **The Brain of the Chatbot.** It defines the 5-step LangGraph workflow:
  1. **Node 1 (Fetch Context)**: Connects to Supabase to grab the user's profile, appointments, medication alerts, and recent chat history.
  2. **Node 2 (Vector Search)**: Triggers a similarity search in Supabase `pgvector` to find relevant excerpts from previously uploaded medical documents.
  3. **Node 3 (Prompt Builder)**: Takes all the data from Nodes 1 & 2 and compiles it into a massive, highly-contextual System Prompt.
  4. **Node 4 (LLM Generator)**: Sends the System Prompt to the Groq Llama-3.1 model to generate a helpful response.
  5. **Node 5 (History Saver)**: Saves both the user's question and the AI's answer into the `chat_history` table in Supabase.
- **[`vector_service.py`](file:///d:/CareCompanion/backend/chatbot/vector_service.py)**: 
  Handles all embeddings. When a document is uploaded, it uses `HuggingFaceEmbeddings` to convert the text into numerical vectors and stores them in Supabase. When a user asks a question, it converts the question into a vector and calls the `match_document_chunks` RPC function in Supabase to find similar text.
- **[`repository.py`](file:///d:/CareCompanion/backend/chatbot/repository.py)**: 
  A standard database operations layer for manually saving or retrieving chat history (though most history saving is now handled dynamically inside `rag_agent.py`).

---

## 3. Utilities & Database Connections
Location: [`backend/services/`](file:///d:/CareCompanion/backend/services/) and [`backend/shared/`](file:///d:/CareCompanion/backend/shared/)

- **[`services/text_extractor.py`](file:///d:/CareCompanion/backend/services/text_extractor.py)**: 
  Uses tools like `pdfplumber` (for PDFs) and `pytesseract` (for Images) to extract raw, readable string text from files uploaded by the user.
- **[`services/report_summarizer.py`](file:///d:/CareCompanion/backend/services/report_summarizer.py)**: 
  Contains the `background_ai_task` that runs after a document upload. It asks Llama-3.1 to generate a bulleted summary of the extracted text, saves the document to the vector database, and then broadcasts the summary to the user via WebSockets.
- **[`shared/db_client.py`](file:///d:/CareCompanion/backend/shared/db_client.py)**: 
  The Supabase Connection Manager. The `get_user_db(user_token)` function is critical: it takes the JWT token provided by FastAPI and injects it into the Supabase client (`postgrest.auth(user_token)`). This guarantees that every single database query the AI makes is strictly limited to the data owned by the logged-in user (Row-Level Security).

---

## The Workflow in Action

To help you visualize how these files interact, here is the lifecycle of a Chat Message:

1. **Frontend**: Next.js sends a POST request with the message to `fastapi_chatbot/routers/chat.py`.
2. **API**: `dependencies.py` verifies the JWT token.
3. **Service**: `chat.py` passes the message and token to `chatbot/service.py`.
4. **Agent State**: `service.py` injects the data into the LangGraph `RAGState` and starts `rag_agent.py`.
5. **Node 1-2 (Retrieval)**: `rag_agent.py` uses `shared/db_client.py` and `vector_service.py` to securely pull the user's data from Supabase.
6. **Node 3-4 (Generation)**: The prompt is built and sent to the LLM.
7. **Node 5 (Persistence)**: The final answer is saved to Supabase.
8. **Response**: The answer travels back up through `service.py` to `chat.py` and is returned to the user!
