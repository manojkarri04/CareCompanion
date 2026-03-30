import os
import sqlite3
import requests
import json
import time
import threading
import PyPDF2
import jwt
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone
from flask_socketio import SocketIO
from dotenv import load_dotenv
from functools import wraps


# This tells Python to open your .env file and load the keys!
load_dotenv()
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


def get_db_connection():
    conn = sqlite3.connect('carecompanion.db')
    conn.row_factory = sqlite3.Row 
    return conn

# --- 1. SETUP DATABASE ---
def setup_database():
    conn = get_db_connection()
    
    conn.execute('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)')
    conn.execute('CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, doctor TEXT NOT NULL, specialty TEXT NOT NULL, location TEXT, status TEXT NOT NULL)')
    conn.execute('CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, medicationName TEXT NOT NULL, time TEXT NOT NULL, date TEXT NOT NULL)')
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL)')
    conn.execute('CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, fileName TEXT NOT NULL, uploadDate TEXT NOT NULL, fileType TEXT NOT NULL, fileSize TEXT NOT NULL)')
    
    # Create test user if none exists
    cursor = conn.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        conn.execute('INSERT INTO users (email, password) VALUES (?, ?)', ('manoj@test.com', 'password123'))
        
    conn.commit()
    conn.close()

setup_database()

# --- NETWORK TOOLS ---
@app.route('/api/ping', methods=['GET'])
def ping_server():
    # We do not do any AI work here. 
    # We just send a reply back as fast as humanly possible!
    return jsonify({"reply": "pong"}), 200

# --- HELPER FUNCTIONS ---
def extract_text_from_pdf(file_path):
    text = ""
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
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

# --- ROUTE: LOGIN ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?', (data.get("email"), data.get("password"))).fetchone()
    conn.close()
    if user:
        return jsonify({"message": "Login successful!"})
    return jsonify({"error": "Wrong email or password"}), 401

# --- ROUTE: REGISTER ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db_connection()
    try:
        # Try to save the new user to the database
        conn.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, password))
        conn.commit()
        return jsonify({"message": "Registration successful!"}), 201
    except sqlite3.IntegrityError:
        # The database will throw an error if the email is already in the 'users' table
        return jsonify({"error": "This email is already registered."}), 409
    finally:
        conn.close()

# --- ROUTES: NOTES ---
@app.route('/api/notes', methods=['GET', 'POST'])
def manage_notes():
    # Step 1: Open the connection to the database
    db_connection = get_db_connection()
    # ACTION 1: The user wants to SAVE a new note
    if request.method == 'POST':
        # 1. Open the package React sent us and grab the text
        incoming_data = request.json
        note_text = incoming_data.get("content")
        # 2. Check the clock to see what time it is right now
        current_time = datetime.now(timezone.utc).isoformat()
        # 3. Put the new note into the database table
        cursor = db_connection.execute(
            'INSERT INTO notes (content, created_at, updated_at) VALUES (?, ?, ?)', 
            (note_text, current_time, current_time)
        )
        # 4. Save the changes permanently
        db_connection.commit()
        # 5. Find the ID number of the note we just created (e.g., Note #5)
        new_note_id = cursor.lastrowid
        # 6. Grab that exact note back out of the database
        new_note = db_connection.execute(
            'SELECT * FROM notes WHERE id = ?', 
            (new_note_id,)
        ).fetchone()
        # 7. Close the database door
        db_connection.close()
        # 8. Send the finished note back to the React screen
        return jsonify(dict(new_note))

    # ACTION 2: The user wants to READ all notes

    if request.method == 'GET':
        # 1. Grab all the notes, sorting them so the newest ones are at the top (DESC)
        all_notes = db_connection.execute('SELECT * FROM notes ORDER BY id DESC').fetchall()
        # 2. Close the database door
        db_connection.close()
        # 3. Turn the database list into a normal list and send it to React
        return jsonify([dict(note) for note in all_notes])

# --- ROUTES: APPOINTMENTS ---
@app.route('/api/appointments', methods=['GET', 'POST'])
def manage_appointments():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cursor = conn.execute('INSERT INTO appointments (date, time, doctor, specialty, location, status) VALUES (?, ?, ?, ?, ?, ?)', 
                              (data.get("date"), data.get("time"), data.get("doctor"), data.get("specialty"), data.get("location", "TBD"), data.get("status", "Confirmed")))
        conn.commit()
        new_apt = conn.execute('SELECT * FROM appointments WHERE id = ?', (cursor.lastrowid,)).fetchone()
        conn.close()
        return jsonify(dict(new_apt))

    all_apts = conn.execute('SELECT * FROM appointments ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(apt) for apt in all_apts])

@app.route('/api/appointments/<int:apt_id>/cancel', methods=['PUT'])
def cancel_appointment(apt_id):
    conn = get_db_connection()
    conn.execute("UPDATE appointments SET status = 'Cancelled' WHERE id = ?", (apt_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Cancelled"})

@app.route('/api/appointments/<int:apt_id>', methods=['PUT'])
def update_appointment(apt_id):
    data = request.json
    conn = get_db_connection()
    conn.execute('UPDATE appointments SET date = ?, time = ?, doctor = ?, specialty = ?, location = ? WHERE id = ?', 
                 (data.get("date"), data.get("time"), data.get("doctor"), data.get("specialty"), data.get("location", "TBD"), apt_id))
    conn.commit()
    updated_apt = conn.execute('SELECT * FROM appointments WHERE id = ?', (apt_id,)).fetchone()
    conn.close()
    return jsonify(dict(updated_apt))

# --- ROUTES: ALERTS ---
@app.route('/api/alerts', methods=['GET', 'POST'])
def manage_alerts():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cursor = conn.execute('INSERT INTO alerts (medicationName, time, date) VALUES (?, ?, ?)', (data.get("medicationName"), data.get("time"), data.get("date")))
        conn.commit()
        new_alert = conn.execute('SELECT * FROM alerts WHERE id = ?', (cursor.lastrowid,)).fetchone()
        conn.close()
        return jsonify(dict(new_alert))

    all_alerts = conn.execute('SELECT * FROM alerts ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(a) for a in all_alerts])

@app.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM alerts WHERE id = ?', (alert_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted successfully"})

# This function does all the heavy, slow AI work in the background.
def background_ai_task(filename, extracted_text):
    print(f"Assistant Doctor started reading {filename}...")
    
    # 1. Have Llama 3.1 read the text (Simulated by our 5-second pause)
    import time
    time.sleep(5) 
    summary_text = analyze_with_llama(extracted_text)

    # 2. Network Magic: Alert the specific user that their report is done!
    # We include the actual summary in the socket message now.
    socketio.emit('report_ready', {
        'message': f'Your summary for {filename} is ready!',
        'analysis': summary_text
    })
    print(f"Assistant Doctor finished {filename}!")


# --- THE MAIN DOCTOR (Main Server Route) ---
@app.route('/api/analyze', methods=['POST'])
def analyze_report():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    try:
        # 1. FAST WORK: Save the file and database details immediately
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(file_path)
        file_size_bytes = os.path.getsize(file_path)
        formatted_size = format_size(file_size_bytes)
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'document'
        file_type = 'pdf' if file_extension == 'pdf' else 'image' if file_extension in ['jpg', 'png', 'jpeg'] else 'document'
        current_date = datetime.now(timezone.utc).isoformat()

        conn = get_db_connection()
        conn.execute('INSERT INTO documents (fileName, uploadDate, fileType, fileSize) VALUES (?, ?, ?, ?)', (file.filename, current_date, file_type, formatted_size))
        conn.commit()
        conn.close()

        if file_type == 'pdf':
            extracted_text = extract_text_from_pdf(file_path)
        else:
            extracted_text = "Image or standard text document uploaded."

        # 2. HIRE THE ASSISTANT: Spawn a new thread for the heavy AI work
        # We pass the text to the background function so the Main Doctor can walk away.
        ai_thread = threading.Thread(
            target=background_ai_task, 
            args=(file.filename, extracted_text)
        )
        ai_thread.start() # Start the background worker!

        # 3. IMMEDIATELY REPLY: The Main Doctor tells the user "We are working on it!"
        # We do not wait 5 seconds anymore. This returns instantly.
        return jsonify({
            "status": "processing",
            "message": "File uploaded! The AI is reading it in the background."
        }), 202 # 202 means "Accepted for processing"
        
    except Exception as e:
        print("Upload Error:", e)
        return jsonify({"error": "Could not process the file."}), 500
    
    
@app.route('/api/documents', methods=['GET'])
def get_documents():
    conn = get_db_connection()
    all_docs = conn.execute('SELECT * FROM documents ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(doc) for doc in all_docs])

@app.route('/api/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Document deleted"})


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

if __name__ == '__main__':
    print("Starting CareCompanion server with WebSockets...")
    # 5. IMPORTANT: Use socketio.run instead of app.run!
    socketio.run(app, debug=True, port=5000)
