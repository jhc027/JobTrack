import io
import json

import pdfplumber
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.services.openai_service import client, MODEL

router = APIRouter(prefix="/profile", tags=["profile"])


def _extract_pdf_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages).strip()


@router.post("/import-pdf")
async def import_resume_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="File must be a PDF.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF too large (max 5 MB).")

    raw_text = _extract_pdf_text(content)
    if not raw_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    prompt = f"""Extract candidate profile information from this resume text.

Resume:
{raw_text[:6000]}

Return a single valid JSON object with exactly these keys (use empty string if not found):
{{
  "name": "",
  "education": "",
  "skills": "",
  "projects": "",
  "certifications": "",
  "experience_summary": "",
  "work_experience": "",
  "preferred_tone": ""
}}

Rules:
- skills: combine programming languages, tools, frameworks as a comma-separated list
- projects: each project on its own paragraph with name and brief description
- work_experience: each role on its own line with company, title, dates, and key responsibilities
- experience_summary: a 2-3 sentence professional summary derived from the resume
- preferred_tone: leave empty (this is set manually)
- Return only JSON, no markdown or explanation."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0,
    )

    parsed = json.loads(response.choices[0].message.content)

    # Return the parsed fields for the frontend to preview — don't auto-save
    return {"extracted": parsed, "raw_text_length": len(raw_text)}
