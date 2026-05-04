from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import export_service, openai_service
from app.services.profile_service import build_profile_text

router = APIRouter(prefix="/cover-letters", tags=["cover-letters"])


@router.post("/generate/{app_id}", response_model=schemas.CoverLetterOut)
def generate_cover_letter(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = db.get(models.Job, application.job_id)
    profile = db.query(models.CandidateProfile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No candidate profile found.")

    profile_text = build_profile_text(profile)
    job_data = {
        "company": job.company,
        "role_title": job.role_title,
        "location": job.location,
        "remote_type": job.remote_type,
        "salary": job.salary,
        "required_skills": job.required_skills,
        "responsibilities": job.responsibilities,
    }

    result = openai_service.generate_cover_letter(job_data, profile_text)
    usage = result.pop("_usage")

    cover_letter = models.CoverLetter(
        application_id=app_id,
        body_text=result["body_text"],
        template_name="default",
    )
    db.add(cover_letter)

    db.add(models.LlmRun(
        application_id=app_id,
        model=usage["model"],
        task_type="cover_letter",
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        estimated_cost=usage["estimated_cost"],
    ))

    db.commit()
    db.refresh(cover_letter)
    return cover_letter


@router.get("/{letter_id}/export/docx")
def export_docx(letter_id: int, db: Session = Depends(get_db)):
    letter = db.get(models.CoverLetter, letter_id)
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")

    app = db.get(models.Application, letter.application_id)
    job = db.get(models.Job, app.job_id) if app else None

    content = export_service.generate_docx(
        letter.body_text,
        company=job.company if job else None,
        role=job.role_title if job else None,
    )
    filename = _safe_filename(job, "docx")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{letter_id}/export/pdf")
def export_pdf(letter_id: int, db: Session = Depends(get_db)):
    letter = db.get(models.CoverLetter, letter_id)
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")

    app = db.get(models.Application, letter.application_id)
    job = db.get(models.Job, app.job_id) if app else None

    content = export_service.generate_pdf(
        letter.body_text,
        company=job.company if job else None,
        role=job.role_title if job else None,
    )
    filename = _safe_filename(job, "pdf")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{letter_id}", response_model=schemas.CoverLetterOut)
def get_cover_letter(letter_id: int, db: Session = Depends(get_db)):
    letter = db.get(models.CoverLetter, letter_id)
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    return letter


def _safe_filename(job: models.Job | None, ext: str) -> str:
    company = (job.company or "Company").replace(" ", "_")
    role = (job.role_title or "Role").replace(" ", "_")
    return f"{company}-{role}-Cover_Letter.{ext}"


@router.delete("/{letter_id}", status_code=204)
def delete_cover_letter(letter_id: int, db: Session = Depends(get_db)):
    letter = db.get(models.CoverLetter, letter_id)
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    db.delete(letter)
    db.commit()
