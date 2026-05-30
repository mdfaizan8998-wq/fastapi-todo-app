import os
import requests
from dotenv import load_dotenv
from datetime import datetime



load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

def call_llm(user_text: str):
    prompt = f"""
Convert the input into English and return ONLY valid JSON.

Rules:
- If only a task title is provided, generate a single line and useful description.
- Translate all Hindi text into English.
- Output must be only JSON.
- Do not add explanation.
- Do not add markdown.
- Do not add triple backticks.


Schema:
{{
  "title": "",
  "description": ""
  
}}

Text: {user_text}
"""

    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0
        },
        timeout=30
    )

    response.raise_for_status()
    result = response.json()
    return result["choices"][0]["message"]["content"]