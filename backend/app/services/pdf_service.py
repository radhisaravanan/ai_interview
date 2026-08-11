import os
import json
import PyPDF2
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Gemini Client initialize
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# 1. PDF-ல் இருந்து உரையை (Text) பிரித்தெடுக்கும் Function
def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    return text

# 2. Gemini AI மூலம் Resume 분석 செய்து JSON-ஆக மாற்றும் Function
async def parse_resume_with_ai(resume_text: str) -> dict:
    if not client:
        # API Key இல்லாத போது Fallback
        return {
            "skills": ["Python", "FastAPI"],
            "projects": ["Web App"],
            "certifications": ["Course Completion"],
            "short_summary": "Candidate profile summary."
        }

    prompt = f"""
    You are an AI Resume Analyzer. Extract the following details from this resume text:
    1. Skills (List of technical and soft skills)
    2. Projects (List of project titles/descriptions)
    3. Certifications (List of courses or certifications)
    4. Short Summary (A 2-3 sentence overview of the candidate's background)

    Resume Text:
    \"\"\"{resume_text}\"\"\"

    Respond STRICTLY in JSON format with keys: "skills", "projects", "certifications", "short_summary".
    Example output format:
    {{
      "skills": ["Python", "SQL"],
      "projects": ["Online Shopping System"],
      "certifications": ["AWS Certified"],
      "short_summary": "A computer science student with web development skills..."
    }}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    try:
        # AI தரும் JSONResponse-ஐ Dictionary-ஆக மாற்றுதல்
        clean_response = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        return json.loads(clean_response)
    except Exception as e:
        print("JSON Parsing Error:", e)
        return {
            "skills": [],
            "projects": [],
            "certifications": [],
            "short_summary": "Unable to generate summary."
        }