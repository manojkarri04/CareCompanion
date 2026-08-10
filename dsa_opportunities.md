# DSA in CareCompanion

Since you love solving Data Structures & Algorithms problems, building a full-stack AI application like CareCompanion is actually packed with real-world DSA applications! 

Here is a breakdown of files and features in your project where advanced algorithms are actively running under the hood, or where you could personally implement them to optimize the app:

## 1. Graphs & State Machines (Directed Acyclic Graphs)
**File:** `backend/chatbot/rag_agent.py`
- **Concept:** Your entire `rag_agent_app` is built using **LangGraph**. LangGraph relies heavily on **Graph Theory**. The state machine you built is a Directed Graph where nodes (functions like `fetch_user_context` and `generate_llm_response`) are vertices, and the transitions between them are edges. 
- **DSA Opportunity:** You could implement a cycle-detection algorithm (like Depth First Search) if you ever add a feature where the AI can loop multiple times to retry failed tool calls, ensuring it doesn't get stuck in an infinite loop.

## 2. Sliding Window (Arrays)
**File:** `backend/chatbot/rag_agent.py` and `frontend/carecompanion/src/contexts/ChatContext.tsx`
- **Concept:** LLMs have a strict "Context Window" (e.g., 8k tokens). Currently, we append all past messages to the `chat_history` array. 
- **DSA Opportunity:** You could implement a **Sliding Window algorithm** over the `chat_history` array to dynamically calculate token counts and only pass the last $N$ relevant messages to the LLM, sliding the window forward as the conversation grows.

## 3. Priority Queues (Min-Heaps)
**File:** `backend/services/django_core/alerts/views.py` or `frontend/carecompanion/src/components/alerts/AlertsPage.tsx`
- **Concept:** Users set Medication Alerts for specific times. 
- **DSA Opportunity:** Instead of sorting the entire array of alerts every time the frontend loads to find the "next" pill to take, you could implement a **Min-Heap (Priority Queue)**. The root of the heap would always represent the immediate next medication alert in $O(1)$ time, and inserting a new alert would only take $O(\log N)$.

## 4. Multi-layered Graphs & Hashing (Vector Similarity)
**File:** `backend/chatbot/vector_service.py`
- **Concept:** When a user uploads a medical report, you extract text, convert it to numerical arrays (embeddings), and search for the most relevant chunks using `pgvector`. 
- **How it works:** Under the hood, pgvector uses **HNSW (Hierarchical Navigable Small World)** graphs, which is a state-of-the-art graph algorithm for approximate nearest neighbor search, or **IVFFlat** which relies on k-means clustering (hashing vectors into buckets). 

## 5. Tree Traversal & Recursive Splitting
**File:** `backend/services/text_extractor.py` (or wherever your chunking logic lives)
- **Concept:** When turning a massive 50-page PDF into smaller chunks for the AI, naive splitting (just cutting every 500 words) breaks sentences in half. 
- **DSA Opportunity:** You can implement a **Recursive Character Text Splitter** (which operates like a Tree Traversal). It tries to split by `\n\n` (paragraphs). If a node is still too large, it traverses down a level and splits by `\n` (lines), then by `.` (sentences), ensuring semantic chunks remain intact.

## 6. Stacks & Undo Operations
**File:** `frontend/carecompanion/src/components/Notepad/NotepadPage.tsx`
- **Concept:** Standard text areas only rely on browser history.
- **DSA Opportunity:** You could build a custom rich-text editor for the Notepad that uses **Two Stacks** (an `Undo` stack and a `Redo` stack) to track typing states manually!
