from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.services import openai_service
from app.services.profile_service import build_profile_text

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/", response_model=list[schemas.ApplicationWithJobOut])
def list_applications(db: Session = Depends(get_db)):
    return (
        db.query(models.Application)
        .options(joinedload(models.Application.job))
        .order_by(models.Application.date_added.desc())
        .all()
    )


@router.get("/{app_id}", response_model=schemas.ApplicationWithJobOut)
def get_application(app_id: int, db: Session = Depends(get_db)):
    app = (
        db.query(models.Application)
        .options(joinedload(models.Application.job))
        .filter(models.Application.id == app_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return app


@router.patch("/{app_id}", response_model=schemas.ApplicationOut)
def update_application(app_id: int, payload: schemas.ApplicationUpdate, db: Session = Depends(get_db)):
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@router.post("/{app_id}/reevaluate", response_model=schemas.ApplicationOut)
def reevaluate_fit(app_id: int, db: Session = Depends(get_db)):
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

    fit = openai_service.analyze_fit(job_data, build_profile_text(profile))
    usage = fit.pop("_usage")

    application.fit_score = fit.get("fit_score")
    application.fit_level = fit.get("fit_level")
    application.match_summary = fit.get("match_summary")
    application.recommended_emphasis = fit.get("recommended_emphasis")

    db.add(models.LlmRun(
        application_id=app_id,
        model=usage["model"],
        task_type="fit_analysis",
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        estimated_cost=usage["estimated_cost"],
    ))

    db.commit()
    db.refresh(application)
    return application


@router.get("/{app_id}/cover-letters", response_model=list[schemas.CoverLetterOut])
def list_cover_letters(app_id: int, db: Session = Depends(get_db)):
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return app.cover_letters


@router.get("/{app_id}/llm-runs", response_model=list[schemas.LlmRunOut])
def list_llm_runs(app_id: int, db: Session = Depends(get_db)):
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return app.llm_runs
