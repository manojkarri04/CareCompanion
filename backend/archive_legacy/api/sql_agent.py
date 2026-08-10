import json
from flask import Blueprint, request, jsonify
from groq import Groq
from core.security import check_token
from core.config import Config
from db.client import supabase

sql_agent_bp = Blueprint('sql_agent', __name__)
groq_client = Groq(api_key=Config.GROQ_API_KEY)


@sql_agent_bp.route('/api/ask-database', methods=['POST'])
@check_token
def ask_database():
    """Text-to-SQL endpoint for converting natural language queries into SQL for Ghana facilities database."""
    data = request.json or {}
    user_question = data.get('question', '')

    if not user_question:
        return jsonify({"error": "No question provided"}), 400

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
    - To search the JSONB array columns, you MUST use the Postgres JSONB containment operator `@>`.
    - Do NOT cast JSONB to text, and do NOT use ILIKE.
    - Always include pk_unique_id, name, address_city, address_stateOrRegion, capability, equipment, procedure, numberDoctors, is_anomaly, and anomaly_severity in your SELECT statement.
    - Limit to 30 rows maximum.

    The user asked: "{user_question}"

    ONLY output the raw SQL string. Do not include markdown formatting like ```sql. Do NOT explain.
    """
    try:
        if not supabase:
            return jsonify({"error": "Supabase client not initialized"}), 500

        sql_response = groq_client.chat.completions.create(
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
        generated_sql = generated_sql.rstrip(";").strip()

        db_response = supabase.rpc('run_sql_query', {'query_text': generated_sql}).execute()
        raw_data = db_response.data

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

        final_answer = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": answer_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        structured_response = json.loads(final_answer.choices[0].message.content)

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
