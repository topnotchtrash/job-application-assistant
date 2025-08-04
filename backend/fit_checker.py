import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from jd_extractor_agent import safe_llm_call
import json


load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

llm = ChatGroq(
    model="llama3-8b-8192",
    api_key=GROQ_API_KEY,
    temperature=0.2,
    max_tokens=2048  # Keep short for efficiency
)
def summarize_resume_sections(resume_text: str) -> dict:
    prompt = f"""
You are an expert resume parser. Analyze the resume text below and extract key sections:
- Education (degree, university, year if available)
- Work Experience (role, company, duration, tech stack or skills used)
- Skills (tools, languages, platforms)
- Certifications (if any)
- Languages or technologies (if any not listed under skills)

Format your output as a JSON object with keys: education, experience, skills, certifications, technologies.

Resume:
\"\"\"
{resume_text}
\"\"\"
"""
    response = safe_llm_call(prompt)
    try:
        print(response)
        return json.loads(response)
    except Exception as e:
        print("Error parsing resume summary to JSON:", e)
        return {}


def check_fit(resume_text: str, job_description: str) -> str:

    resume_summary = summarize_resume_sections(resume_text)
    prompt = f"""
You are an expert career assistant. Compare the following job description with a candidate's resume.

Your goal is to list the **gaps** in the resume that may affect job fit.

Specifically:
- List missing or weak technical skills
- Mention if years of experience in key areas seem insufficient
- Highlight any missing required degrees or certifications
- Point out if work eligibility or visa requirements are not addressed

Only respond with a bullet list of missing or insufficient qualifications. Do not include general commentary.

--- JOB DESCRIPTION ---
{job_description}

--- CANDIDATE RESUME ---
{resume_summary}
"""
    
    response = safe_llm_call(prompt)
    print(response)
    return response
