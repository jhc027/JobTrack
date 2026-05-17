from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import openai_service
from app.services.activity_service import log_event
from app.services.profile_service import build_profile_text

router = APIRouter(prefix="/follow-up-emails", tags=["follow-up-emails"])


@router.post("/{app_id}", response_model=schemas.FollowUpEmailOut)
def generate_follow_up_email(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = db.get(models.Job, application.job_id)
    profile = db.query(models.CandidateProfile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No candidate profile found.")

    since = application.date_applied or application.date_added
    days = max(0, (datetime.now(timezone.utc).replace(tzinfo=None) - since).days)

    job_data = {"company": job.company, "role_title": job.role_title}
    result = openai_service.generate_followup_email(job_data, build_profile_text(profile), days)
    usage = result.pop("_usage")

    email = models.FollowUpEmail(application_id=app_id, email_text=result["email_text"])
    db.add(email)

    db.add(models.LlmRun(
        application_id=app_id,
        model=usage["model"],
        task_type="follow_up_email",
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        estimated_cost=usage["estimated_cost"],
    ))

    log_event(db, app_id, "follow_up_email_generated",
              f"Follow-up email drafted for {job.role_title or 'role'} at {job.company or 'company'}")

    db.commit()
    db.refresh(email)
    return email


@router.get("/{app_id}", response_model=list[schemas.FollowUpEmailOut])
def list_follow_up_emails(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    return sorted(application.follow_up_emails, key=lambda x: x.created_at, reverse=True)


@router.delete("/{email_id}/delete", status_code=204)
def delete_follow_up_email(email_id: int, db: Session = Depends(get_db)):
    email = db.get(models.FollowUpEmail, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(email)
    db.commit()
