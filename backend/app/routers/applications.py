from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.services import openai_service
from app.services.activity_service import log_event
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
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] != app.status:
        log_event(db, app_id, "status_change",
                  f"Status changed: {app.status} → {data['status']}")
    for field, value in data.items():
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

    score_str = f"{fit.get('fit_score'):.1f}" if fit.get("fit_score") is not None else "?"
    log_event(db, app_id, "fit_evaluated",
              f"Fit re-evaluated: {score_str}/10 ({fit.get('fit_level', '?')})")

    db.commit()
    db.refresh(application)
    return application


@router.post("/reevaluate-bulk", response_model=schemas.BulkReevaluateResult)
def reevaluate_bulk(payload: schemas.BulkReevaluateRequest, db: Session = Depends(get_db)):
    profile = db.query(models.CandidateProfile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No candidate profile found.")

    query = db.query(models.Application)
    if payload.statuses:
        query = query.filter(models.Application.status.in_(payload.statuses))
    planned = query.all()

    if not planned:
        label = ", ".join(payload.statuses) if payload.statuses else "any"
        return schemas.BulkReevaluateResult(updated=0, errors=0, message=f"No applications with status {label} found.")

    profile_text = build_profile_text(profile)
    updated = 0
    errors = 0

    for application in planned:
        try:
            job = db.get(models.Job, application.job_id)
            job_data = {
                "company": job.company,
                "role_title": job.role_title,
                "required_skills": job.required_skills,
                "preferred_skills": job.preferred_skills,
                "responsibilities": job.responsibilities,
            }
            fit = openai_service.analyze_fit(job_data, profile_text)
            usage = fit.pop("_usage")

            application.fit_score = fit.get("fit_score")
            application.fit_level = fit.get("fit_level")
            application.match_summary = fit.get("match_summary")
            application.recommended_emphasis = fit.get("recommended_emphasis")

            db.add(models.LlmRun(
                application_id=application.id,
                model=usage["model"],
                task_type="fit_analysis",
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
                estimated_cost=usage["estimated_cost"],
            ))
            updated += 1
        except Exception:
            errors += 1

    db.commit()
    return schemas.BulkReevaluateResult(
        updated=updated,
        errors=errors,
        message=f"Re-evaluated {updated} application{'s' if updated != 1 else ''}." + (f" {errors} failed." if errors else ""),
    )


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
