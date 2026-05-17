from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.middleware.auth import AuthMiddleware
from app.models import CandidateProfile
from app.routers import applications, cover_letters, jobs, profile
from app.routers import activity, interview_prep, stats
from app.routers import follow_up_emails, company_research, profile_import
from app.routers.profile import DEFAULT_PROFILE


def _seed_profile():
    db = SessionLocal()
    try:
        if not db.query(CandidateProfile).first():
            db.add(CandidateProfile(**DEFAULT_PROFILE))
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_profile()
    yield


app = FastAPI(title="JobTrack API", version="0.1.0", lifespan=lifespan)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(cover_letters.router)
app.include_router(profile.router)
app.include_router(activity.router)
app.include_router(interview_prep.router)
app.include_router(stats.router)
app.include_router(follow_up_emails.router)
app.include_router(company_research.router)
app.include_router(profile_import.router)


@app.get("/health")
def health():
    return {"status": "ok"}
