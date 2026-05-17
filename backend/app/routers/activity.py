from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.activity_service import log_event

router = APIRouter(prefix="/applications", tags=["activity"])


@router.get("/{app_id}/activity", response_model=list[schemas.ActivityLogOut])
def list_activity(app_id: int, db: Session = Depends(get_db)):
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return sorted(app.activity_logs, key=lambda x: x.created_at)


@router.post("/{app_id}/activity", response_model=schemas.ActivityLogOut)
def add_manual_activity(app_id: int, payload: schemas.ActivityLogCreate, db: Session = Depends(get_db)):
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    entry = log_event(db, app_id, "manual", payload.description, is_manual=True)
    db.commit()
    db.refresh(entry)
    return entry
