import os
import requests
import json
import time
import threading
import PyPDF2
import jwt
import io
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime, timezone
from flask_socketio import SocketIO
from dotenv import load_dotenv
from functools import wraps
from data_structures.linear.sorter import AppointmentSorter
from supabase import create_client, Client
from flask import Response # We will need this later for downloading
from functools import wraps
from groq import Groq


from pydantic import BaseModel, Field
from typing import List, Optional
from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.llms.groq import Groq as LlamaGroq

# Virtue Foundation Hackathon Schema
class FacilityData(BaseModel):
    ngos: List[str] = Field(description="NGO names present in the text")
    facilities: List[str] = Field(description="Healthcare facility names present in the text")
    facilityTypeId: Optional[str] = Field(description="hospital, pharmacy, doctor, clinic, dentist")
    operatorTypeId: Optional[str] = Field(description="public or private")
    specialties: List[str] = Field(description="Exact matches only: internalMedicine, pediatrics, cardiology, generalSurgery, etc.")
    procedure: List[str] = Field(description="Specific clinical services performed")
    equipment: List[str] = Field(description="Physical medical devices, imaging machines, infrastructure")
    capacity: Optional[int] = Field(description="Overall inpatient bed capacity")

# Hook up LlamaIndex to your existing Groq model
Settings.llm = LlamaGroq(model="llama-3.1-8b-instant", api_key=os.environ.get("GROQ_API_KEY"))



my_sorter = AppointmentSorter() 


# This tells Python to open your .env file and load the keys!
load_dotenv()
# --- SUPABASE CLOUD CONNECTION ---
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("WARNING: Supabase keys are missing from your .env file!")

supabase: Client = create_client(supabase_url, supabase_key)


app = Flask(__name__)
# This lets your React app on port 5173 talk to Flask on port 5000
CORS(app) 

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












# --- NEW SUPABASE SECURITY GUARD ---
def check_token(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        # 1. Look for the key sent by React
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No key provided'}), 401
        
        try:
            # 2. Extract the key string
            token = auth_header.split(" ")[1]
            # 3. Read the key using your Supabase secret password
            secret = os.environ.get('SUPABASE_JWT_SECRET')
            decoded_token = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
            
            # 4. Save the user's ID number so your routes can use it
            # Supabase calls the user ID 'sub'
            request.user_id = decoded_token['sub'] 
            
        except Exception as e:
            return jsonify({'error': 'Invalid key'}), 401
            
        return f(*args, **kwargs)
    return wrap


# --- NETWORK TOOLS ---
@app.route('/api/ping', methods=['GET'])
def ping_server():
    return jsonify({"reply": "pong"}), 200

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
            'content': data.get("content"),
            'created_at': current_time,
            'updated_at': current_time
        }).execute()

    # ACTION 2: The user wants to READ all notes

    if request.method == 'GET':
        response = supabase.table('notes').select('*').eq('user_id', request.user_id).order('id', desc=True).execute()
        return jsonify(response.data)
    

# --- ROUTES: APPOINTMENTS ---
@app.route('/api/appointments', methods=['GET', 'POST'])
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
# @check_token # Security Check: Only logged-in users can upload!
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

    # 1. Load data and create Vector Store for RAG
    doc = Document(text=medical_text)
    index = VectorStoreIndex.from_documents([doc])
    
    # 2. Query the data enforcing our schema
    query_engine = index.as_query_engine(output_cls=FacilityData)
    prompt = "Read the facility report and extract the medical data. Leave empty if not mentioned."
    response = query_engine.query(prompt)
    
    # 3. Format as standard JSON
    extracted_json = json.loads(response.response.model_dump_json())
    
    return jsonify({
        "status": "success", 
        "data": extracted_json
    }), 200










if __name__ == '__main__':
    print("Starting CareCompanion server with WebSockets...")
    # 5. IMPORTANT: Use socketio.run instead of app.run!
    socketio.run(app, debug=True, port=5000)

