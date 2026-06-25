import os
import json
import requests
import time
import threading
import PyPDF2
import io
import jwt
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from functools import wraps
from dotenv import load_dotenv
from datetime import datetime, timezone
from data_structures.linear.sorter import AppointmentSorter
from supabase import create_client, Client
from flask import Response # We will need this later for downloading
from groq import Groq


from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.llms.groq import Groq as LlamaGroq

from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()


app = Flask(__name__)
# This lets your React app on port 5173 talk to Flask on port 5000
CORS(app) 


def check_token(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No key provided'}), 401

        try:
            # 1. Extract the token sent by React
            token = auth_header.split(" ")[1]
            header = jwt.get_unverified_header(token)
            print(header)
            
            # 2. Grab the secret locally (0ms network delay!)
            secret = os.environ.get('SUPABASE_JWT_SECRET')
            
            if not secret:
                print("🛑 CRITICAL: SUPABASE_JWT_SECRET is missing from your .env file!")
                return jsonify({'error': 'Server Configuration Error'}), 500

            # 3. Decode securely using the default HS256 algorithm
            decoded_token = jwt.decode(
                token,
                secret,
                algorithms=["HS256","ES256","RS256"],
                # This option prevents edge-case crashes if Supabase tweaks its default audience
                options={
                    "verify_aud": False,
                    "verify_signature": True
                    } 
            )
            
            # 4. Success! Save the user ID for the route to use
            request.user_id = decoded_token.get('sub')
            
        except Exception as e:
            # If it fails, print the exact reason to your terminal for easy debugging
            print(f"🔥 SECURITY ALERT: {type(e).__name__} - {e}")
            return jsonify({'error': 'Invalid key or unauthorized'}), 401

        return f(*args, **kwargs)
    return wrap


# --- NETWORK TOOLS ---
@app.route('/api/ping', methods=['GET'])
def ping_server():
    return jsonify({"reply": "pong"}), 200



# 1. Define the State (The memory passed between the agent's nodes)
class AgentState(TypedDict):
    """State for the LangGraph Reasoning Engine"""
    medical_text: str
    user_id: str          # NEW: To link the data to the correct patient/user
    file_name: str        # NEW: For our source citations
    reasoning_log: List[str]
    final_data: dict
    anomalies_detected: List[str]
    citations: List[str]



# Initialize Groq for LangChain
llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant", groq_api_key=os.environ.get("GROQ_API_KEY"))
json_parser = JsonOutputParser()




# --- OFFICIAL HACKATHON UNIFIED SCHEMA ---
class FacilityData(BaseModel):
    # From organization_extraction.py
    ngos: Optional[List[str]] = Field(default_factory=list, description="NGO names present in the text. An NGO is any non-profit organization that delivers tangible, on-the-ground healthcare services.")
    facilities: Optional[List[str]] = Field(default_factory=list, description="Healthcare facility names present in the text. Must be a physical site currently operating.")
    
    # From facility_and_ngo_fields.py
    facilityTypeId: Optional[Literal["hospital", "pharmacy", "doctor", "clinic", "dentist"]] = Field(None, description="type of facility (only one of these values)")
    operatorTypeId: Optional[Literal["public", "private"]] = Field(None, description="Indicates if the facility is privately or publicly operated")
    capacity: Optional[int] = Field(None, description="Overall inpatient bed capacity of the facility")

    # From free_form.py
    procedure: Optional[List[str]] = Field(default_factory=list, description="Specific clinical services performed at the facility—medical/surgical interventions and diagnostic procedures stated in plain language.")
    equipment: Optional[List[str]] = Field(default_factory=list, description="Physical medical devices and infrastructure (MRI/CT/X-ray). Include specific models. Do NOT list bed counts here.")
    capability: Optional[List[str]] = Field(default_factory=list, description="Medical capabilities defining what level and types of clinical care the facility can deliver (e.g., Level II trauma center, ICU).")

    # From medical_specialties.py
    specialties: Optional[List[str]] = Field(default_factory=list, description="Exact case-sensitive matches from the specialty hierarchy (e.g., internalMedicine, pediatrics, cardiology, generalSurgery).")


# Hook up LlamaIndex to your existing Groq model
Settings.llm = LlamaGroq(model="llama-3.1-8b-instant", api_key=os.environ.get("GROQ_API_KEY"))

# --- ADD THIS LINE TO FIX THE ERROR ---
# This tells LlamaIndex to process embeddings locally for free instead of asking OpenAI
Settings.embed_model = "local:BAAI/bge-small-en-v1.5"

my_sorter = AppointmentSorter()
# This tells Python to open your .env file and load the keys!

# --- SUPABASE CLOUD CONNECTION ---
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("WARNING: Supabase keys are missing from your .env file!")

supabase: Client = create_client(supabase_url, supabase_key)



# 1. Set up the WebSocket tool
# cors_allowed_origins="*" makes sure React is allowed to connect
socketio = SocketIO(app, cors_allowed_origins="*")

# This is the route your React app calls when you upload a file
# --- FOLDER SETUP ---
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER



# Initialize Groq Client (Ensure GROQ_API_KEY is in your environment variables)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))





# 3. Node 2: The Verifier (Self-Correction)
def verify_data(state: AgentState):
    state["reasoning_log"].append("Step 2: Verifying data against strict hackathon rules.")
    data = state["final_data"]
    
    # Rule 1: Equipment should not contain bed counts
    if data.get("equipment"):
        clean_equipment = [item for item in data["equipment"] if "bed" not in item.lower()]
        if len(clean_equipment) != len(data["equipment"]):
             state["reasoning_log"].append("Correction: Removed bed counts from equipment list.")
        data["equipment"] = clean_equipment
        
    # Rule 2: Ensure capacity is an integer
    if data.get("capacity"):
        try:
            data["capacity"] = int(data["capacity"])
        except ValueError:
            state["reasoning_log"].append("Correction: Invalid capacity format removed.")
            data["capacity"] = None
            
    state["final_data"] = data
    return state






# 2. NODE 1: The Intelligent Document Parser (IDP)
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
        state["final_data"] = {"facilityName": "Unknown", "procedures": [], "equipment": [], "specialties": []}
        
    return state




# 3. NODE 2: Medical Reasoning & Anomaly Detection
def medical_reasoning_check(state: AgentState):
    state["reasoning_log"].append("Step 2: Running Medical Reasoning & Anomaly Detection.")
    data = state.get("final_data", {})
    anomalies = []
    
    procedures = data.get("procedure", [])
    equipment = data.get("equipment", [])
    
    # Logic 1: High procedure breadth but no equipment (Hackathon Q 4.8)
    if len(procedures) > 0 and len(equipment) == 0:
        anomalies.append(
            f"CRITICAL ANOMALY: Facility claims {len(procedures)} procedures "
            f"(including '{procedures[0]}') but lists 0 supporting equipment. "
            "High risk of misrepresentation or itinerant outreach."
        )
    
    # Logic 2: Specific equipment checks (e.g., Surgery requires OR / Anesthesia)
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
    """Node 3: Push the verified, structured data into Supabase."""
    state["reasoning_log"].append("Step 3: Saving verified hospital capabilities to database.")
    
    try:
        # Prepare the payload to match the SQL table we just created
        payload = {
            "user_id": state["user_id"],
            "facility_name": state["final_data"].get("facilityName", "Unknown Facility"),
            "procedures": state["final_data"].get("procedures", []),
            "equipment": state["final_data"].get("equipment", []),
            "specialties": state["final_data"].get("specialties", []),
            "anomalies_detected": state["anomalies_detected"],
            "source_document_name": state["file_name"]
        }
        
        # Execute the insert command
        supabase.table('verified_facilities').insert(payload).execute()
        state["reasoning_log"].append("Success: Data securely committed to the verified_facilities database.")
        
    except Exception as e:
        print(f"Supabase Error: {e}")
        state["reasoning_log"].append(f"Database Error: Could not save data.")
        
    return state


# 4. Compile the Smart Graph
workflow = StateGraph(AgentState)
workflow.add_node("extractor", extract_medical_data)
workflow.add_node("reasoning_engine", medical_reasoning_check)
workflow.add_node("database_saver", save_to_database)   # <--- ADD THIS LINE!

workflow.set_entry_point("extractor")
workflow.add_edge("extractor", "reasoning_engine")
workflow.add_edge("reasoning_engine", "database_saver") # Route to the saver
workflow.add_edge("database_saver", END)                # End the workflow

medical_agent_app = workflow.compile()



# 5. Update the Flask Route for the Frontend
@app.route('/api/hackathon-analyze', methods=['POST'])
@check_token # <--- ADD THIS LINE
def run_hackathon_agent():
    data = request.json
    medical_text = data.get('text', '')
    file_name = data.get('fileName', 'Manual Text Entry') # Grab filename from React

    if not medical_text:
        return jsonify({"error": "No text provided"}), 400

    # Initialize memory
    initial_state = {
        "medical_text": medical_text,
        "user_id": request.user_id,
        "file_name": file_name,
        "reasoning_log": ["Agent Initialized. Starting analysis..."],
        "final_data": {},
        "anomalies_detected": [],
        "citations": []
    }
    
    # Execute the LangGraph workflow
    result = medical_agent_app.invoke(initial_state)
    
    # Return the processed knowledge to the React frontend
    return jsonify({
        "status": "success",
        "facility_data": result["final_data"],
        "anomalies": result["anomalies_detected"],
        "agent_thinking_process": result["reasoning_log"],
        "citations": result["citations"]
    }), 200


@app.route('/api/ask-database', methods=['POST'])
@check_token
def ask_database():
    data = request.json
    user_question = data.get('question', '')
    
    if not user_question:
        return jsonify({"error": "No question provided"}), 400

    # 1. Translate English to SQL using Llama 3.1 via Groq
    sql_prompt = f"""
    You are an expert PostgreSQL data analyst for the Virtue Foundation.
    Convert the user's question into a PostgreSQL query.
    
    TABLE: ghana_facilities
    COLUMNS:
    - pk_unique_id (INTEGER): row number, use for citations
    - name (TEXT): facility name
    - specialties (JSONB): array e.g. '["cardiology", "internalMedicine"]'
    - procedure (JSONB): array of procedures
    - equipment (JSONB): array of equipment
    - capability (JSONB): array of capabilities
    - address_city (TEXT): city name
    - address_stateOrRegion (TEXT): Ghana region name
    - is_anomaly (BOOLEAN): TRUE if specialty claimed but no equipment or procedure evidence
    - anomaly_severity (TEXT): 'high', 'medium', or 'none'

    IMPORTANT SQL RULES:
    - To search the JSONB array columns (specialties, procedure, equipment, capability), you MUST use the Postgres JSONB containment operator `@>`.
    - Do NOT cast JSONB to text, and do NOT use ILIKE.
    - Always include pk_unique_id, name, address_city, address_stateOrRegion, capability, equipment, procedure, numberDoctors, is_anomaly, and anomaly_severity in your SELECT statement.
    - Limit to 30 rows maximum.
    
    The user asked: "{user_question}"
    
    ONLY output the raw SQL string. Do not include markdown formatting like ```sql. Do NOT explain.
    """
    generated_sql = ""
    try:
        # Ask Llama 3.1 to generate the SQL
        sql_response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": sql_prompt}],
            temperature=0.1
        )
        
        generated_sql = sql_response.choices[0].message.content.strip()
        generated_sql = generated_sql.replace("```sql", "").replace("```", "").strip()
        if generated_sql.startswith("```sql"):
         generated_sql = generated_sql[6:-3].strip()
        elif generated_sql.startswith("```"):
          generated_sql = generated_sql[3:-3].strip()
           # Strip trailing semicolon — breaks Supabase RPC EXECUTE wrapper
        generated_sql = generated_sql.rstrip(";").strip()


        # 2. Execute the SQL against our Supabase RPC
        db_response = supabase.rpc('run_sql_query', {'query_text': generated_sql}).execute()
        raw_data = db_response.data
        
        # 3. Translate the raw data into the strict JSON object for the frontend
        answer_prompt = f"""
        You are a healthcare intelligence analyst for the Virtue Foundation, an NGO working to eliminate medical deserts in Ghana.
        
        The user asked: "{user_question}"
        Database Results: {json.dumps(raw_data)[:2000]}
        
        Provide your response as a JSON object with EXACTLY these fields:
        {{
          "answer": "2-3 sentence plain English answer. Be specific: name regions, count facilities, cite names.",
          "stats": [
            {{"label": "Total found", "value": 12, "severity": "normal"}}
          ],
          "anomaly_warning": "A 1-sentence warning string if suspicious data patterns/anomalies are found, otherwise null.",
          "recommendation": "One specific action the Virtue Foundation should take based on this data.",
          "sql_explanation": "One sentence explaining the SQL query."
        }}
        
        Severity levels for stats: "normal", "success", "warning", "danger".
        Return ONLY valid JSON.
        """
        
        final_answer = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": answer_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"} # CRITICAL: Forces Groq to output JSON
        )
        
        structured_response = json.loads(final_answer.choices[0].message.content)
        
        # Phase 6 Enhancement: Return the flattened payload so the React frontend can use it!
        return jsonify({
            "status": "success",
            "answer": structured_response.get("answer"),
            "stats": structured_response.get("stats", []),
            "anomaly_warning": structured_response.get("anomaly_warning"),
            "recommendation": structured_response.get("recommendation"),
            "sql_explanation": structured_response.get("sql_explanation"),
            "executed_sql": generated_sql, 
            "raw_data": raw_data
        }), 200

    except Exception as e:
        print(f"Text-to-SQL Error: {e}")
        return jsonify({"error": "Failed to query the medical database.", "details": str(e)}), 500


def generate_video_script(medical_report_text):
    """
    Takes a patient's medical report and uses Llama 3.1 to generate a 
    3-5 scene storyboard formatted strictly as JSON.
    """
 
    system_prompt = """
    You are 'The Director', an expert medical communicator and video storyboard artist for the CareCompanion system. 
    Your job is to translate complex ophthalmic medical reports into an easy-to-understand, empathetic educational video script for a patient.
    
    CRITICAL RULES:
    1. You MUST extract exactly 3 to 5 key visual scenes from the provided report.
    2. For each scene, write a short, comforting 'narration' script for the AI voiceover.
    3. For each scene, write a highly detailed 'visual_prompt'. This prompt will be sent directly to the FLUX.2 image generation model. 
       - Visual prompts should describe static, clean, modern medical illustrations.
       - Use comma-separated descriptors (e.g., "A clean modern medical illustration of a human eye, cross-section, showing the retina, soft blue and white lighting, highly detailed, 8k resolution").
    4. You MUST return ONLY valid JSON. Do not include any markdown formatting, conversational filler, or introductory text.
    
    JSON SCHEMA:
    {
      "scenes": [
        {
          "scene_number": 1,
          "narration": "String (What the voiceover will say)",
          "visual_prompt": "String (The prompt for the FLUX.2 model)"
        }
      ]
    }
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant", # Or llama-3.1-70b-versatile for higher reasoning
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the medical report:\n{medical_report_text}"}
            ],
            response_format={"type": "json_object"}, # Forces strict JSON output
            temperature=0.5, # Keep it relatively deterministic 
        )
        
        # Parse the JSON string returned by Groq into a Python dictionary
        storyboard = json.loads(response.choices[0].message.content)
        return storyboard
        
    except Exception as e:
        print(f"Error generating script: {e}")
        return None

# Example Flask Route
@app.route('/api/generate-script', methods=['POST'])
def handle_script_generation():
    data = request.json
    report_text = data.get('report_text')
    
    if not report_text:
        return jsonify({"error": "No report text provided"}), 400
        
    storyboard = generate_video_script(report_text)
    
    if storyboard:
        return jsonify({"status": "success", "storyboard": storyboard}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to generate script"}), 500













# --- HELPER FUNCTIONS ---
def extract_text_from_bytes(file_bytes):
    text = ""
    # Instead of reading from the hard drive, we read directly from RAM
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text


def format_size(size_in_bytes):
    if size_in_bytes >= 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"
    return f"{size_in_bytes / 1024:.1f} KB"

def analyze_with_llama(text):
    # Safety check: If the PDF had no readable text
    if not text or not text.strip():
        return "Error: No Readable Text Found\n- The uploaded document contains no text.\n- It might be a scanned image of a paper.\n- Please upload a digital, text-based PDF."
        
    prompt = f"""You are a helpful medical assistant. Summarize the following medical report in plain, simple English. 
    Format your response exactly like this:
    Write a short title on the very first line.
    Write 3 to 5 bullet points on the following lines, starting each with a dash (-).
    Do NOT say "Here is the summary" or add any extra conversational text. Just output the title and the bullet points.
    
    Report:
    {text}"""
    
    # url = "http://localhost:11434/api/generate"
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
    "Authorization": f"Bearer {os.environ.get('GROQ_API_KEY')}",
    "Content-Type": "application/json"
    } 

    payload = {
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": prompt}]
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        print("Llama Error:", e)
        return "Error Processing Report\n- Could not reach the local Llama 3.1 model.\n- Make sure Ollama is running in the background."

# --- ROUTE: HOME ---
@app.route('/', methods=['GET'])
def home():
    return "CareCompanion Backend is running perfectly with all routes!"

# --- ROUTES: NOTES ---
@app.route('/api/notes', methods=['GET', 'POST'])
@check_token # <--- ADD THIS LINE
def manage_notes():
    # Step 1: Open the connection to the database
    # db_connection = get_db_connection()
    # ACTION 1: The user wants to SAVE a new note
    if request.method == 'POST':
        # 1. Open the package React sent us and grab the text
        incoming_data = request.json
        note_text = incoming_data.get("content")
        # 2. Check the clock to see what time it is right now
        current_time = datetime.now(timezone.utc).isoformat()
        # 3. Put the new note into the database table 

        response = supabase.table('notes').insert({
            'user_id': request.user_id,
            'content': incoming_data.get("content"),
            'created_at': current_time,
            'updated_at': current_time
        }).execute()
        return jsonify(response.data[0]), 201
    # ACTION 2: The user wants to READ all notes

    if request.method == 'GET':
        response = supabase.table('notes').select('*').eq('user_id', request.user_id).order('id', desc=True).execute()
        return jsonify(response.data)
    

# --- ROUTES: APPOINTMENTS ---
@app.route('/api/appointments', methods=['GET', 'POST'])
@check_token # <--- ADD THIS LINE
def manage_appointments():
    if request.method == 'POST':
        data = request.json
        response = supabase.table('appointments').insert({
            'user_id': request.user_id,
            'date': data.get("date"),
            'time': data.get("time"),
            'doctor': data.get("doctor"),
            'specialty': data.get("specialty"),
            'location': data.get("location", "TBD"),
            'status': data.get("status", "Confirmed")
        }).execute()
        return jsonify(response.data[0])

    # ACTION 2: The user wants to READ all appointments
    if request.method == 'GET':
        response = supabase.table('appointments').select('*').eq('user_id', request.user_id).execute()
        sorted_apts = my_sorter.merge_sort(response.data)
        return jsonify(sorted_apts)

@app.route('/api/appointments/<apt_id>/cancel', methods=['PUT'])
@check_token
def cancel_appointment(apt_id):
    supabase.table('appointments').update({'status': 'Cancelled'}).eq('id', apt_id).eq('user_id', request.user_id).execute()
    return jsonify({"message": "Cancelled"})

@app.route('/api/appointments/<apt_id>', methods=['PUT'])
@check_token
def update_appointment(apt_id):
    data = request.json
    response = supabase.table('appointments').update({
        'date': data.get("date"),
        'time': data.get("time"),
        'doctor': data.get("doctor"),
        'specialty': data.get("specialty"),
        'location': data.get("location", "TBD")
    }).eq('id', apt_id).eq('user_id', request.user_id).execute()
    return jsonify(response.data[0])

# --- ROUTES: ALERTS ---
@app.route('/api/alerts', methods=['GET', 'POST'])
@check_token
def manage_alerts():
    if request.method == 'POST':
        data = request.json
        response = supabase.table('alerts').insert({
            'user_id': request.user_id,
            'medicationName': data.get("medicationName"),
            'time': data.get("time"),
            'date': data.get("date")
        }).execute()
        return jsonify(response.data[0])

    if request.method == 'GET':
        response = supabase.table('alerts').select('*').eq('user_id', request.user_id).order('id', desc=True).execute()
        return jsonify(response.data)


@app.route('/api/alerts/<alert_id>', methods=['DELETE'])
@check_token
def delete_alert(alert_id):
    supabase.table('alerts').delete().eq('id', alert_id).eq('user_id', request.user_id).execute()
    return jsonify({"message": "Deleted successfully"})


# --- BACKGROUND DOCTOR TASK ---
def background_ai_task(filename, extracted_text):
    print(f"Assistant Doctor started reading {filename}...")
    import time
    time.sleep(5) 
    summary_text = analyze_with_llama(extracted_text)
    socketio.emit('report_ready', {
        'message': f'Your summary for {filename} is ready!',
        'analysis': summary_text
    })
    print(f"Assistant Doctor finished {filename}!")

# --- THE MAIN DOCTOR (Main Server Route) ---
@app.route('/api/analyze', methods=['POST'])
@check_token # Security Check: Only logged-in users can upload!
def analyze_report():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    try:
        # 1. READ INTO MEMORY (No saving to the UPLOAD_FOLDER!)
        file_bytes = file.read()
        file_size_bytes = len(file_bytes)
        formatted_size = format_size(file_size_bytes)
        
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'document'
        file_type = 'pdf' if file_extension == 'pdf' else 'image' if file_extension in ['jpg', 'png', 'jpeg'] else 'document'

        # 2. UPLOAD TO SUPABASE STORAGE BUCKET
        # We put the file inside a folder named after the user's ID for absolute security.
        storage_path = f"{request.user_id}/{file.filename}"
        
        # 'upsert' means if they upload a file with the same name twice, it just overwrites it safely.
        supabase.storage.from_("medical_documents").upload(
            file=file_bytes, 
            path=storage_path, 
            file_options={"content-type": file.content_type, "upsert": "true"}
        )

        # 3. SAVE RECORD TO SUPABASE DATABASE
        supabase.table('saved_documents').insert({
            'user_id': request.user_id,
            'file_name': file.filename,
            'file_type': file_type,
            'file_size': formatted_size
        }).execute()

        # 4. READ THE TEXT FOR THE AI
        if file_type == 'pdf':
            extracted_text = extract_text_from_bytes(file_bytes)
        else:
            extracted_text = "Image or standard text document uploaded."

        # 5. HIRE THE ASSISTANT (Background Thread)
        ai_thread = threading.Thread(
            target=background_ai_task, 
            args=(file.filename, extracted_text)
        )
        ai_thread.start() 

        # 6. IMMEDIATELY REPLY
        return jsonify({
            "status": "processing",
            "message": "File uploaded securely to the cloud! AI is reading it."
        }), 202 
        
    except Exception as e:
        print("Upload Error:", e)
        return jsonify({"error": "Could not process the file."}), 500
   

@app.route('/api/documents', methods=['GET'])
@check_token # We add our security guard here so only logged-in users can fetch!
def get_documents():
    try:
        response = supabase.table('saved_documents') \
            .select('*') \
            .eq('user_id', request.user_id) \
            .order('upload_date', desc=True) \
            .execute()
            
        # Supabase automatically formats the data as a clean list for us!
        return jsonify(response.data)
        
    except Exception as e:
        print("Database Error:", e)
        return jsonify({"error": "Could not fetch documents"}), 500



@app.route('/api/documents/<doc_id>', methods=['DELETE'])
@check_token
def delete_document(doc_id):
    try:
        # 1. Find the file name first so we can delete the physical PDF
        doc = supabase.table('saved_documents').select('file_name').eq('id', doc_id).eq('user_id', request.user_id).execute()
        if doc.data:
            filename = doc.data[0]['file_name']
            storage_path = f"{request.user_id}/{filename}"
            # 2. Delete from Bucket
            supabase.storage.from_('medical_documents').remove([storage_path])
        
        # 3. Delete from Database
        supabase.table('saved_documents').delete().eq('id', doc_id).eq('user_id', request.user_id).execute()
        return jsonify({"message": "Document deleted"})
    except Exception as e:
        return jsonify({"error": "Failed to delete"}), 500

@app.route('/api/documents/file/<filename>', methods=['GET'])
@check_token
def serve_document(filename):
    try:
        # Instead of local folder, we download it directly from Supabase to RAM!
        storage_path = f"{request.user_id}/{filename}"
        file_data = supabase.storage.from_("medical_documents").download(storage_path)
        
        # Send the file data back to the browser
        return Response(file_data, mimetype="application/pdf")
    except Exception as e:
        print("Serve Error:", e)
        return jsonify({"error": "File not found in cloud"}), 404


# --- ROUTE: AI CHAT (Conversations & Video Recommendations) ---
@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    data = request.json
    user_message = data.get("message", "")
    
    # THE FIX: Try to get the context from React. If it's missing, use a default backup sentence.
    medical_context = data.get("context", "No report uploaded yet.")

    # We give Llama strict new rules to act as a medical keyword extractor!
    prompt = f"""You are CareCompanion, a helpful medical AI assistant.
    
    Context from Patient's Medical Report: "{medical_context}"
    The user says: "{user_message}"
    
    Follow these STRICT rules based on what the user said:
    1. IF the user says "hi", "hello", or greets you: Simply reply, "Hello! I am CareCompanion, your personal health assistant. Please upload a medical report, or ask me a health question!" Do NOT suggest videos.
    
    2. IF the user says "yes" (or "YES", "yeah", "sure") AND there is context from a medical report: 
       - STEP A: Use your medical knowledge to identify the 1 or 2 most important clinical conditions in the report.
       - STEP B: Generate 3 highly relevant educational YouTube videos from reputable sources.
       - STEP C: You MUST build the YouTube search link using the exact clinical conditions you identified.
       
    3. Format EACH video exactly like this on a new line:
    VIDEO: [Clear Title] | [Channel Name] | https://www.youtube.com/results?search_query=[insert+your+clinical+terms+here]
    
    4. NEVER suggest videos unless the user specifically says "yes" or explicitly asks to watch a video.
    """
    
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.environ.get('GROQ_API_KEY')}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        groq_answer = response.json()['choices'][0]['message']['content']
        return jsonify({"reply": groq_answer})
    
    # THE OTHER FIX: Return a proper JSON error message if Groq fails
    except Exception as e:
        print("Groq Error:", e)
        return jsonify({"reply": "I'm having trouble connecting to Model. Please check the backend."}), 500

@app.route('/api/hackathon-extract', methods=['POST'])
def hackathon_extract():
    data = request.json
    medical_text = data.get('text', '')
    
    if not medical_text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # 1. Load data and create Vector Store for RAG
        doc = Document(text=medical_text)
        index = VectorStoreIndex.from_documents([doc])
        
        # 2. Query the data enforcing our schema
        query_engine = index.as_query_engine(output_cls=FacilityData)
        
        # 3. The Official Master Prompt
        prompt = """
        You are a specialized medical facility information extractor for the Virtue Foundation.
        Analyze the following text to extract structured facts about healthcare facilities and NGOs.
        
        CRITICAL RULES:
        1. ngos & facilities: ONLY extract organizations explicitly mentioned by NAME. Use unabbreviated forms.
        2. equipment: Do NOT list bed counts here; only list specific bed devices/models or infrastructure like "MRI".
        3. capability: Extract Trauma/emergency care levels, Specialized medical units (ICU, NICU), and Accreditations.
        4. specialties: Use exact camelCase terminology based on context (e.g., "Surgery" -> generalSurgery, "Pediatric" -> pediatrics, "Eye" -> ophthalmology, "Pathology/Laboratory" -> pathology).
        5. Use clear, declarative statements in plain English for procedures and equipment. Include specific quantities when available.
        6. If a value cannot be directly mapped or is not explicitly stated, omit it or leave the array empty.
        
        Extract the structured JSON from this report.
        """
        
        response = query_engine.query(prompt)
        
        
# 4. Format as standard JSON
        if hasattr(response, 'raw_output') and response.raw_output:
            extracted_json = response.raw_output.model_dump() # <-- Indented 4 spaces
        else:
            extracted_json = json.loads(response.response)    # <-- Indented 4 spaces

        return jsonify({
            "status": "success", 
            "data": extracted_json
        }), 200


    except Exception as e:
        print(f"Hackathon Agent Error: {e}")
        return jsonify({"error": "Agent failed to process document"}), 500



@app.route('/api/langgraph-extract', methods=['POST'])
def run_langgraph_agent():
    data = request.json
    medical_text = data.get('text', '')
    
    if not medical_text:
        return jsonify({"error": "No text provided"}), 400

    # Initialize the starting state
    initial_state = {
        "medical_text": medical_text,
        "reasoning_log": ["Agent Initialized. Starting analysis..."],
        "final_data": {},
        "anomalies_detected": [],
        "citations": []
    }
    
    # Run the graph!
    result = medical_agent_app.invoke(initial_state)
    
    return jsonify({
        "status": "success",
        "agent_log": result["reasoning_log"],
        "data": result["final_data"]
    }), 200











if __name__ == '__main__':
    print("Starting CareCompanion server with WebSockets...")
    # 5. IMPORTANT: Use socketio.run instead of app.run!
    socketio.run(app, debug=True, port=5000)

