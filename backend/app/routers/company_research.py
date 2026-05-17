from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import openai_service
from app.services.activity_service import log_event

router = APIRouter(prefix="/company-research", tags=["company-research"])


@router.post("/{app_id}", response_model=schemas.CompanyResearchOut)
def generate_company_research(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = db.get(models.Job, application.job_id)
    if not job or not job.company:
        raise HTTPException(status_code=400, detail="Job has no company name to research.")

    result = openai_service.generate_company_research(job.company, job.role_title or "")
    usage = result.pop("_usage")

    research = models.CompanyResearch(application_id=app_id, summary_text=result["summary_text"])
    db.add(research)

    db.add(models.LlmRun(
        application_id=app_id,
        model=usage["model"],
        task_type="company_research",
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        estimated_cost=usage["estimated_cost"],
    ))

    log_event(db, app_id, "company_research_generated",
              f"Company research generated for {job.company}")

    db.commit()
    db.refresh(research)
    return research


@router.get("/{app_id}", response_model=list[schemas.CompanyResearchOut])
def list_company_research(app_id: int, db: Session = Depends(get_db)):
    application = db.get(models.Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    return sorted(application.company_research, key=lambda x: x.created_at, reverse=True)


@router.delete("/{research_id}/delete", status_code=204)
def delete_company_research(research_id: int, db: Session = Depends(get_db)):
    research = db.get(models.CompanyResearch, research_id)
    if not research:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(research)
    db.commit()
