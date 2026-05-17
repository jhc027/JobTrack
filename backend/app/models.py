from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    education: Mapped[str | None] = mapped_column(Text)
    skills: Mapped[str | None] = mapped_column(Text)
    projects: Mapped[str | None] = mapped_column(Text)
    certifications: Mapped[str | None] = mapped_column(Text)
    experience_summary: Mapped[str | None] = mapped_column(Text)
    work_experience: Mapped[str | None] = mapped_column(Text)
    preferred_tone: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company: Mapped[str | None] = mapped_column(String(255))
    role_title: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(Text)
    remote_type: Mapped[str | None] = mapped_column(String(50))  # Remote, Hybrid, On-site, Unknown
    salary: Mapped[str | None] = mapped_column(String(255))
    job_url: Mapped[str | None] = mapped_column(Text)
    source_platform: Mapped[str | None] = mapped_column(String(255))
    manual_job_text: Mapped[str | None] = mapped_column(Text)
    source_quality: Mapped[str | None] = mapped_column(String(50))  # good, needs_check, unknown
    required_skills: Mapped[str | None] = mapped_column(Text)
    preferred_skills: Mapped[str | None] = mapped_column(Text)
    responsibilities: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    applications: Mapped[list["Application"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    status: Mapped[str] = mapped_column(String(50), default="Planned")  # Planned, Applied, Interviewing, Offered, Rejected, Withdrawn
    fit_score: Mapped[float | None] = mapped_column(Float)
    fit_level: Mapped[str | None] = mapped_column(String(50))  # Strong, Good, Moderate, Weak
    match_summary: Mapped[str | None] = mapped_column(Text)
    recommended_emphasis: Mapped[str | None] = mapped_column(Text)
    date_added: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    date_applied: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[str | None] = mapped_column(Text)  # comma-separated

    job: Mapped["Job"] = relationship(back_populates="applications")
    cover_letters: Mapped[list["CoverLetter"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    llm_runs: Mapped[list["LlmRun"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    activity_logs: Mapped[list["ActivityLog"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    interview_preps: Mapped[list["InterviewPrep"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    follow_up_emails: Mapped[list["FollowUpEmail"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    company_research: Mapped[list["CompanyResearch"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    body_text: Mapped[str] = mapped_column(Text)
    template_name: Mapped[str | None] = mapped_column(String(255))
    document_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    application: Mapped["Application"] = relationship(back_populates="cover_letters")


class LlmRun(Base):
    __tablename__ = "llm_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    model: Mapped[str] = mapped_column(String(100))
    task_type: Mapped[str] = mapped_column(String(100))  # job_parse, cover_letter, fit_analysis
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    estimated_cost: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application: Mapped["Application"] = relationship(back_populates="llm_runs")


class FollowUpEmail(Base):
    __tablename__ = "follow_up_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    email_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application: Mapped["Application"] = relationship(back_populates="follow_up_emails")


class CompanyResearch(Base):
    __tablename__ = "company_research"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    summary_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application: Mapped["Application"] = relationship(back_populates="company_research")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    event_type: Mapped[str] = mapped_column(String(100))  # job_added, status_change, fit_evaluated, cover_letter_generated, manual
    description: Mapped[str] = mapped_column(Text)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application: Mapped["Application"] = relationship(back_populates="activity_logs")


class InterviewPrep(Base):
    __tablename__ = "interview_prep"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    questions_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application: Mapped["Application"] = relationship(back_populates="interview_preps")
