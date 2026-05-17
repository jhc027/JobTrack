from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import openai_service
from app.services.profile_service import build_profile_text
from app.services.activity_service import log_event

router = APIRouter(prefix="/interview-prep", tags=["interview-prep"])


@router.post("/{app_id}", response_model=schemas.InterviewPrepOut)
def generate_interview_prep(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = db.get(models.Job, application.job_id)
    profile = db.query(models.CandidateProfile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No candidate profile found.")

    job_data = {
        "company": job.company,
        "role_title": job.role_title,
        "required_skills": job.required_skills,
        "preferred_skills": job.preferred_skills,
        "responsibilities": job.responsibilities,
    }

    result = openai_service.generate_interview_prep(job_data, build_profile_text(profile))
    usage = result.pop("_usage")

    prep = models.InterviewPrep(application_id=app_id, questions_text=result["questions_text"])
    db.add(prep)

    db.add(models.LlmRun(
        application_id=app_id,
        model=usage["model"],
        task_type="interview_prep",
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        estimated_cost=usage["estimated_cost"],
    ))

    log_event(db, app_id, "interview_prep_generated",
              f"Interview prep generated for {job.role_title or 'role'} at {job.company or 'company'}")

    db.commit()
    db.refresh(prep)
    return prep


@router.get("/{app_id}", response_model=list[schemas.InterviewPrepOut])
def list_interview_preps(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    return sorted(application.interview_preps, key=lambda x: x.created_at, reverse=True)


@router.delete("/{prep_id}/delete", status_code=204)
def delete_interview_prep(prep_id: int, db: Session = Depends(get_db)):
    prep = db.get(models.InterviewPrep, prep_id)
    if not prep:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(prep)
    db.commit()
