from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/profile", tags=["profile"])

DEFAULT_PROFILE = {
    "name": "Jack Crawford",
    "education": "Bachelor of Science in Computer Science, University of North Texas, 2023-2026",
    "skills": (
        "Programming Languages: C, C++, Python, JavaScript, HTML, CSS\n"
        "Tools & Technologies: GitHub, Trello, React, Firebase, Azure\n"
        "Coursework: Data Structures, Algorithms, Operating Systems, Machine Learning, Natural Language Processing"
    ),
    "projects": (
        "Academic Project - Text Adventure Game (team, JavaScript/HTML/CSS): "
        "Worked on a team that developed an interactive story game with branching narrative paths and game functions.\n\n"
        "Academic Project - Capstone Task App (4-person team, full-stack): "
        "Collaborated to design a task-management application for users with autism and ADHD, focusing on accessible UI, cohesive design, and team-based development.\n\n"
        "Personal Project - Neuroevolution Simulator (Python): "
        "Developed a simulation using genetic algorithms and neural networks to evolve creature body structures for locomotion in a 2D physics environment.\n\n"
        "Personal Project - Fighting Game Moveset Query System (Python/JavaScript): "
        "Built a database query system and machine learning model for retrieving fighting game moves based on names or descriptive traits."
    ),
    "certifications": (
        "Artificial Intelligence Undergraduate Academic Certificate, "
        "Security Undergraduate Academic Certificate, "
        "Azure Cloud Fundamentals, Azure AI Fundamentals. "
        "Mention certifications only if directly relevant to the role."
    ),
    "experience_summary": (
        "Professional Summary: Recent Computer Science graduate with a foundation in software engineering, "
        "database management, cloud technologies, collaborative coding environments, and agile workflows.\n\n"
        "Core Pitch: Entry-level software developer with hands-on academic and personal project experience, "
        "strong debugging/problem-solving skills, and experience working in team-based development environments.\n\n"
        "Strengths: Problem-solving, adaptability, debugging, teamwork, customer communication, "
        "learning new tools quickly, attention to detail, user-focused design."
    ),
    "work_experience": (
        "Front End Associate at TJX Companies since October 2022; assisted 60+ customers daily, "
        "supported upselling goals, and helped mentor/train new employees during onboarding."
    ),
    "preferred_tone": (
        "Tone: Professional, concise, confident, entry-level, specific, and not exaggerated.\n\n"
        "Skill Language: Use 'experience with' instead of 'proficient in' unless the skill is central to the job.\n\n"
        "Cover Letter Strategy: Do not mention every skill, certification, project, or course. "
        "Select only the most relevant details for the specific role and write naturally rather than listing resume bullets.\n\n"
        "Avoid Mentioning: Do not claim internships, full-time software engineering employment, "
        "professional enterprise development experience, or technologies not listed in this profile."
    ),
}


@router.get("/", response_model=schemas.CandidateProfileOut)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(models.CandidateProfile).first()
    if not profile:
        profile = models.CandidateProfile(**DEFAULT_PROFILE)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.patch("/", response_model=schemas.CandidateProfileOut)
def update_profile(payload: schemas.CandidateProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(models.CandidateProfile).first()
    if not profile:
        profile = models.CandidateProfile(**DEFAULT_PROFILE)
        db.add(profile)
        db.flush()
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
