from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.services.profile_service import build_profile_text

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
def get_stats(db: Session = Depends(get_db)):
    # Counts by status
    status_rows = (
        db.query(models.Application.status, func.count(models.Application.id))
        .group_by(models.Application.status)
        .all()
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # Average fit score (only scored applications)
    avg_fit = db.query(func.avg(models.Application.fit_score)).scalar()

    # Total applications
    total = db.query(func.count(models.Application.id)).scalar()

    # Applications added per week for the last 8 weeks
    weekly = []
    now = datetime.utcnow()
    for i in range(7, -1, -1):
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        count = (
            db.query(func.count(models.Application.id))
            .filter(
                models.Application.date_added >= week_start,
                models.Application.date_added < week_end,
            )
            .scalar()
        )
        weekly.append({
            "week": week_start.strftime("%-m/%-d"),
            "count": count or 0,
        })

    # Fit level distribution
    fit_rows = (
        db.query(models.Application.fit_level, func.count(models.Application.id))
        .filter(models.Application.fit_level.isnot(None))
        .group_by(models.Application.fit_level)
        .all()
    )
    by_fit_level = {row[0]: row[1] for row in fit_rows}

    return {
        "total": total or 0,
        "by_status": by_status,
        "average_fit_score": round(avg_fit, 2) if avg_fit else None,
        "by_fit_level": by_fit_level,
        "weekly_activity": weekly,
    }


@router.get("/skill-gaps")
def get_skill_gaps(db: Session = Depends(get_db)):
    profile = db.query(models.CandidateProfile).first()
    profile_skills = set()
    if profile:
        for field in [profile.skills, profile.experience_summary]:
            if field:
                # Extract individual words/phrases from profile text
                for word in field.lower().replace("\n", ",").split(","):
                    cleaned = word.strip().strip(".-:")
                    if len(cleaned) > 2:
                        profile_skills.add(cleaned)

    jobs = db.query(models.Job).all()
    skill_counter: Counter = Counter()

    for job in jobs:
        for field in [job.required_skills, job.preferred_skills]:
            if not field:
                continue
            for skill in field.split(","):
                skill = skill.strip()
                if len(skill) > 2:
                    skill_lower = skill.lower()
                    # Check if any profile skill contains this skill or vice versa
                    in_profile = any(
                        skill_lower in ps or ps in skill_lower
                        for ps in profile_skills
                    )
                    if not in_profile:
                        skill_counter[skill] += 1

    gaps = [
        {"skill": skill, "count": count}
        for skill, count in skill_counter.most_common(20)
        if count >= 2
    ]

    return {"gaps": gaps, "total_jobs_analyzed": len(jobs)}
