import json
from flask import Blueprint, request, jsonify
from groq import Groq
from core.security import check_token
from core.config import Config

storyboard_bp = Blueprint('storyboard', __name__)
groq_client = Groq(api_key=Config.GROQ_API_KEY)


@storyboard_bp.route('/api/generate-script', methods=['POST'])
@check_token
def handle_script_generation():
    """Generates an educational video storyboard script from medical report text."""
    data = request.json or {}
    report_text = data.get('report_text')

    if not report_text:
        return jsonify({"error": "No report text provided"}), 400

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
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the medical report:\n{report_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )

        storyboard = json.loads(response.choices[0].message.content)
        return jsonify({"status": "success", "storyboard": storyboard}), 200

    except Exception as e:
        print(f"Error generating script: {e}")
        return jsonify({"status": "error", "message": "Failed to generate script"}), 500
