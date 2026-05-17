from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.services import openai_service
from app.services.activity_service import log_event
from app.services.profile_service import build_profile_text

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/check-duplicate", response_model=schemas.DuplicateCheckResult)
def check_duplicate(url: str, db: Session = Depends(get_db)):
    existing = db.query(models.Job).filter(models.Job.job_url == url).first()
    if not existing:
        return schemas.DuplicateCheckResult(is_duplicate=False)
    app = db.query(models.Application).filter(models.Application.job_id == existing.id).first()
    return schemas.DuplicateCheckResult(
        is_duplicate=True,
        existing_job_id=existing.id,
        existing_application_id=app.id if app else None,
        company=existing.company,
        role_title=existing.role_title,
    )


@router.post("/ingest", response_model=schemas.IngestResponse)
def ingest_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    if not payload.job_url and not payload.manual_job_text:
        raise HTTPException(status_code=422, detail="Provide job_url or manual_job_text.")

    profile = db.query(models.CandidateProfile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No candidate profile found. Create one first.")

    # Parse job details via OpenAI
    parsed = openai_service.parse_job(payload.job_url, payload.manual_job_text)
    usage_parse = parsed.pop("_usage")

    # Analyze fit
    profile_text = build_profile_text(profile)
    fit = openai_service.analyze_fit(parsed, profile_text)
    usage_fit = fit.pop("_usage")

    job = models.Job(
        company=parsed.get("company") or None,
        role_title=parsed.get("role_title") or None,
        location=parsed.get("location") or None,
        remote_type=parsed.get("remote_type") or None,
        salary=parsed.get("salary") or None,
        job_url=payload.job_url,
        source_platform=parsed.get("source_platform") or None,
        manual_job_text=payload.manual_job_text,
        source_quality=parsed.get("source_quality") or "unknown",
        required_skills=parsed.get("required_skills") or None,
        preferred_skills=parsed.get("preferred_skills") or None,
        responsibilities=parsed.get("responsibilities") or None,
    )
    db.add(job)
    db.flush()

    application = models.Application(
        job_id=job.id,
        status="Planned",
        fit_score=fit.get("fit_score"),
        fit_level=fit.get("fit_level"),
        match_summary=fit.get("match_summary"),
        recommended_emphasis=fit.get("recommended_emphasis"),
        notes=parsed.get("notes") or None,
    )
    db.add(application)
    db.flush()

    for u, task in [(usage_parse, "job_parse"), (usage_fit, "fit_analysis")]:
        db.add(models.LlmRun(
            application_id=application.id,
            model=u["model"],
            task_type=task,
            input_tokens=u["input_tokens"],
            output_tokens=u["output_tokens"],
            estimated_cost=u["estimated_cost"],
        ))

    company = parsed.get("company") or "Unknown company"
    role = parsed.get("role_title") or "Unknown role"
    fit_level = fit.get("fit_level") or "?"
    fit_score = fit.get("fit_score")
    score_str = f"{fit_score:.1f}" if fit_score is not None else "?"
    log_event(db, application.id, "job_added",
              f"Job added: {role} at {company} — Fit {score_str}/10 ({fit_level})")

    db.commit()
    db.refresh(job)
    db.refresh(application)

    return schemas.IngestResponse(
        job=schemas.JobOut.model_validate(job),
        application=schemas.ApplicationOut.model_validate(application),
        message="Job parsed and saved.",
    )


@router.get("/", response_model=list[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).order_by(models.Job.created_at.desc()).all()


@router.get("/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.patch("/{job_id}", response_model=schemas.JobOut)
def update_job(job_id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    db.delete(job)
    db.commit()
