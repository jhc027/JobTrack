from datetime import datetime

from pydantic import BaseModel


# --- Job ---

class JobCreate(BaseModel):
    job_url: str | None = None
    manual_job_text: str | None = None


class JobUpdate(BaseModel):
    company: str | None = None
    role_title: str | None = None
    location: str | None = None
    remote_type: str | None = None
    salary: str | None = None
    job_url: str | None = None
    source_platform: str | None = None
    manual_job_text: str | None = None
    source_quality: str | None = None
    required_skills: str | None = None
    preferred_skills: str | None = None
    responsibilities: str | None = None


class JobOut(BaseModel):
    id: int
    company: str | None
    role_title: str | None
    location: str | None
    remote_type: str | None
    salary: str | None
    job_url: str | None
    source_platform: str | None
    manual_job_text: str | None
    source_quality: str | None
    required_skills: str | None
    preferred_skills: str | None
    responsibilities: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Application ---

class ApplicationUpdate(BaseModel):
    status: str | None = None
    date_applied: datetime | None = None
    follow_up_date: datetime | None = None
    result: str | None = None
    notes: str | None = None
    tags: str | None = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    status: str
    fit_score: float | None
    fit_level: str | None
    match_summary: str | None
    recommended_emphasis: str | None
    date_added: datetime
    date_applied: datetime | None
    follow_up_date: datetime | None
    result: str | None
    notes: str | None
    tags: str | None

    model_config = {"from_attributes": True}


class ApplicationWithJobOut(ApplicationOut):
    job: JobOut


class ActivityLogOut(BaseModel):
    id: int
    application_id: int
    event_type: str
    description: str
    is_manual: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogCreate(BaseModel):
    description: str


class InterviewPrepOut(BaseModel):
    id: int
    application_id: int
    questions_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowUpEmailOut(BaseModel):
    id: int
    application_id: int
    email_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyResearchOut(BaseModel):
    id: int
    application_id: int
    summary_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DuplicateCheckResult(BaseModel):
    is_duplicate: bool
    existing_job_id: int | None = None
    existing_application_id: int | None = None
    company: str | None = None
    role_title: str | None = None


class BulkReevaluateRequest(BaseModel):
    statuses: list[str] | None = None  # None = all statuses


class BulkReevaluateResult(BaseModel):
    updated: int
    errors: int
    message: str


# --- Cover Letter ---

class CoverLetterOut(BaseModel):
    id: int
    application_id: int
    body_text: str
    template_name: str | None
    document_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- LLM Run ---

class LlmRunOut(BaseModel):
    id: int
    application_id: int
    model: str
    task_type: str
    input_tokens: int | None
    output_tokens: int | None
    estimated_cost: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Candidate Profile ---

class CandidateProfileUpdate(BaseModel):
    name: str | None = None
    education: str | None = None
    skills: str | None = None
    projects: str | None = None
    certifications: str | None = None
    experience_summary: str | None = None
    work_experience: str | None = None
    preferred_tone: str | None = None


class CandidateProfileOut(BaseModel):
    id: int
    name: str
    education: str | None
    skills: str | None
    projects: str | None
    certifications: str | None
    experience_summary: str | None
    work_experience: str | None
    preferred_tone: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Ingest response ---

class IngestResponse(BaseModel):
    job: JobOut
    application: ApplicationOut
    message: str
