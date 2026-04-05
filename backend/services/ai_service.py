# backend/services/ai_service.py

import os
from dotenv import load_dotenv
import google.generativeai as genai
import json

# =========================
# 🔐 Load ENV
# =========================
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("❌ GEMINI_API_KEY not found in .env")

genai.configure(api_key=api_key)


# =========================
# 🤖 GET WORKING MODEL (UPDATED)
# =========================
def get_model():
    try:
        return genai.GenerativeModel("models/gemini-2.5-flash")  # ✅ BEST
    except:
        try:
            return genai.GenerativeModel("models/gemini-2.0-flash")
        except:
            return genai.GenerativeModel("models/gemini-pro-latest")


model = get_model()


# =========================
# 🚀 AI ANALYSIS FUNCTION
# =========================
def analyze_with_ai(code):
    try:
        if not code.strip():
            return {
                "error": "No code provided",
                "issues": [],
                "suggestions": [],
                "refactoring": []
            }

        prompt = f"""
You are a senior software engineer.

Analyze the following Python code and return STRICT JSON only:

{{
  "issues": ["..."],
  "suggestions": ["..."],
  "refactoring": ["..."]
}}

Rules:
- ONLY return JSON
- No explanation outside JSON
- Keep points short and clear

Code:
{code}
"""

        response = model.generate_content(prompt)

        text = response.text.strip()

        # 🔥 Remove markdown formatting if exists
        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        # 🔥 Ensure valid JSON
        try:
            parsed = json.loads(text)
            return parsed
        except:
            return {
                "error": "Invalid AI response format",
                "issues": [],
                "suggestions": [],
                "refactoring": []
            }

    except Exception as e:
        return {
            "error": f"AI Error: {str(e)}",
            "issues": [],
            "suggestions": [],
            "refactoring": []
        }