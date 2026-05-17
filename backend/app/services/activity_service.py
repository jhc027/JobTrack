from sqlalchemy.orm import Session

from app import models


def log_event(
    db: Session,
    application_id: int,
    event_type: str,
    description: str,
    is_manual: bool = False,
) -> models.ActivityLog:
    entry = models.ActivityLog(
        application_id=application_id,
        event_type=event_type,
        description=description,
        is_manual=is_manual,
    )
    db.add(entry)
    return entry
