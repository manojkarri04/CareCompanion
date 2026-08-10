from shared.db_client import get_user_db
import json

def execute_schedule_appointment(user_token: str, user_id: str, doctor: str, specialty: str, date: str, time: str):
    db = get_user_db(user_token)
    if not db:
        return "Database connection failed."
    try:
        data = {
            "user_id": user_id,
            "doctor": doctor,
            "specialty": specialty,
            "date": date,
            "time": time,
            "status": "Scheduled"
        }
        db.table('appointments_appointment').insert(data).execute()
        return f"Successfully scheduled appointment with {doctor} on {date} at {time}."
    except Exception as e:
        return f"Failed to schedule appointment: {e}"

def execute_create_medication_alert(user_token: str, user_id: str, medication_name: str, date: str, time: str):
    db = get_user_db(user_token)
    if not db:
        return "Database connection failed."
    try:
        data = {
            "user_id": user_id,
            "medication_name": medication_name,
            "date": date,
            "time": time
        }
        db.table('alerts_alert').insert(data).execute()
        return f"Successfully created alert for {medication_name} at {time}."
    except Exception as e:
        return f"Failed to create alert: {e}"

def execute_add_saved_note(user_token: str, user_id: str, content: str):
    db = get_user_db(user_token)
    if not db:
        return "Database connection failed."
    try:
        data = {
            "user_id": user_id,
            "content": content
        }
        db.table('notes_note').insert(data).execute()
        return f"Successfully saved note: '{content}'"
    except Exception as e:
        return f"Failed to save note: {e}"

def execute_save_uploaded_document(user_token: str, user_id: str, filename: str):
    db = get_user_db(user_token)
    if not db:
        return "Database connection failed."
    try:
        data = {
            "user_id": user_id,
            "file_name": filename,
            "file_type": "Medical Report",
            "file_size": "Unknown"
        }
        db.table('documents_saveddocument').insert(data).execute()
        return f"Successfully saved {filename} to your Saved Documents."
    except Exception as e:
        return f"Failed to save document: {e}"

# Langchain Tool schemas (for binding to LLM)
tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "schedule_appointment",
            "description": "Schedule a new medical appointment for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor": {"type": "string", "description": "Name of the doctor (e.g. Dr. Smith)"},
                    "specialty": {"type": "string", "description": "Medical specialty (e.g. Cardiology)"},
                    "date": {"type": "string", "description": "Date of the appointment (YYYY-MM-DD)"},
                    "time": {"type": "string", "description": "Time of the appointment (HH:MM AM/PM)"}
                },
                "required": ["doctor", "date", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_medication_alert",
            "description": "Create a reminder/alert for taking medication.",
            "parameters": {
                "type": "object",
                "properties": {
                    "medication_name": {"type": "string", "description": "Name of the medication"},
                    "date": {"type": "string", "description": "Start date or specific date (YYYY-MM-DD)"},
                    "time": {"type": "string", "description": "Time to take the medication (HH:MM AM/PM)"}
                },
                "required": ["medication_name", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_saved_note",
            "description": "Save a personal health note or journal entry for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The full text content of the note"}
                },
                "required": ["content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_uploaded_document",
            "description": "Add a previously uploaded medical report to the user's permanent Saved Documents vault.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "The name of the file the user uploaded"}
                },
                "required": ["filename"]
            }
        }
    }
]

def execute_tool_call(tool_name: str, args: dict, user_token: str, user_id: str) -> str:
    if tool_name == "schedule_appointment":
        return execute_schedule_appointment(
            user_token, user_id,
            args.get("doctor"), args.get("specialty", "General"), args.get("date"), args.get("time")
        )
    elif tool_name == "create_medication_alert":
        return execute_create_medication_alert(
            user_token, user_id,
            args.get("medication_name"), args.get("date", ""), args.get("time")
        )
    elif tool_name == "add_saved_note":
        return execute_add_saved_note(
            user_token, user_id,
            args.get("content")
        )
    elif tool_name == "save_uploaded_document":
        return execute_save_uploaded_document(
            user_token, user_id,
            args.get("filename", "Medical_Report.pdf")
        )
    return f"Unknown tool: {tool_name}"
