import json

from openai import OpenAI

from app.config import settings

client = OpenAI(api_key=settings.openai_api_key)

MODEL = "gpt-4o-mini"
# Cost per 1M tokens (input, output) in USD
COST_PER_1M = {"gpt-4o-mini": (0.15, 0.60), "gpt-4o": (2.50, 10.00)}


def _cost(model: str, input_tokens: int, output_tokens: int) -> float:
    rates = COST_PER_1M.get(model, (0, 0))
    return (input_tokens * rates[0] + output_tokens * rates[1]) / 1_000_000


def parse_job(url: str | None, text: str | None) -> dict:
    source = f"URL: {url}" if url else ""
    body = f"Job description:\n{text}" if text else ""

    prompt = f"""Extract job application tracking data from the following source.

{source}
{body}

Return only a single valid JSON object with exactly these keys:
{{
  "company": "",
  "role_title": "",
  "location": "",
  "remote_type": "",
  "salary": "",
  "source_platform": "",
  "required_skills": "",
  "preferred_skills": "",
  "responsibilities": "",
  "source_quality": "",
  "notes": ""
}}

Rules:
- Use empty string for unknown fields.
- remote_type must be one of: Remote, Hybrid, On-site, Unknown.
- source_platform: identify the ATS or site (Greenhouse, Lever, Workday, LinkedIn, company site, etc.).
- required_skills and preferred_skills: comma-separated lists.
- responsibilities: brief summary (2-4 sentences max).
- source_quality: "good" if all key fields are present, "needs_check" if the page is behind a login, expired, vague, or missing important fields, otherwise "unknown".
- Return only JSON. No markdown, no explanation."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0,
    )

    usage = response.usage
    result = json.loads(response.choices[0].message.content)
    result["_usage"] = {
        "model": MODEL,
        "input_tokens": usage.prompt_tokens,
        "output_tokens": usage.completion_tokens,
        "estimated_cost": _cost(MODEL, usage.prompt_tokens, usage.completion_tokens),
    }
    return result


def analyze_fit(job_data: dict, profile: str) -> dict:
    prompt = f"""You are a career advisor. Analyze how well this candidate fits the job.

Candidate profile:
{profile}

Job details:
Company: {job_data.get('company', '')}
Role: {job_data.get('role_title', '')}
Required skills: {job_data.get('required_skills', '')}
Preferred skills: {job_data.get('preferred_skills', '')}
Responsibilities: {job_data.get('responsibilities', '')}

Return only a single valid JSON object:
{{
  "fit_score": 0.0,
  "fit_level": "",
  "match_summary": "",
  "recommended_emphasis": ""
}}

Rules:
- fit_score: 0.0–10.0.
- fit_level: one of Strong (8-10), Good (6-7.9), Moderate (4-5.9), Weak (0-3.9).
- match_summary: 2-3 sentences on how well the candidate matches.
- recommended_emphasis: 1-2 sentences on what to highlight in application materials.
- Return only JSON."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0,
    )

    usage = response.usage
    result = json.loads(response.choices[0].message.content)
    result["_usage"] = {
        "model": MODEL,
        "input_tokens": usage.prompt_tokens,
        "output_tokens": usage.completion_tokens,
        "estimated_cost": _cost(MODEL, usage.prompt_tokens, usage.completion_tokens),
    }
    return result


def generate_cover_letter(job_data: dict, profile: str) -> dict:
    prompt = f"""Write only the body paragraphs of a cover letter.

Candidate profile:
{profile}

Job application information:
Company: {job_data.get('company', '')}
Position: {job_data.get('role_title', '')}
Location: {job_data.get('location', '')}
Remote/Hybrid: {job_data.get('remote_type', '')}
Salary: {job_data.get('salary', '')}
Required skills: {job_data.get('required_skills', '')}
Responsibilities: {job_data.get('responsibilities', '')}

Requirements:
- Write only the body paragraphs of the cover letter.
- Do not include the contact header, date, salutation, or closing signature.
- Write exactly 3 complete paragraphs.
- Around 230 to 300 words total.
- Treat the Candidate Profile as reference material, not a checklist.
- Choose only the 2 to 4 candidate details that best match this specific job.
- Use at most 1 project example, 1 work/customer-service example, and 3 technical skills/tools.
- Do not invent experience, employment history, internships, certifications, or technologies not listed.
- End the final paragraph with a complete closing sentence expressing interest in contributing.
- Return only the cover letter body text.

Role matching rules:
- Classify the job internally as: Software Engineering, IT Support/Desktop Support, Data/Admin, Cloud/Security, or General Technical. Do not mention the category.
- Use only candidate details that clearly fit the role category.
- If software-focused: prioritize programming projects, debugging, teamwork, coursework, software development.
- If IT Support/Help Desk: prioritize troubleshooting, operating systems, customer communication, reliability, documentation.
- If data/admin: prioritize accuracy, databases, spreadsheets, reliability, organization.

Writing style:
- Sound natural, practical, confident, and entry-level appropriate.
- Do not begin with "My recent Bachelor of Science," "My academic journey," or "My background as."
- Do not use phrases like "robust foundation," "cutting-edge technologies," or "dynamic environment."
- Use "experience with" or "hands-on experience with" instead of overstating proficiency."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.6,
        max_tokens=800,
    )

    usage = response.usage
    text = response.choices[0].message.content.strip()
    return {
        "body_text": text,
        "_usage": {
            "model": MODEL,
            "input_tokens": usage.prompt_tokens,
            "output_tokens": usage.completion_tokens,
            "estimated_cost": _cost(MODEL, usage.prompt_tokens, usage.completion_tokens),
        },
    }


def generate_followup_email(job_data: dict, profile: str, days_since_applied: int) -> dict:
    prompt = f"""Write a brief, professional follow-up email for a job application.

Candidate profile:
{profile}

Job details:
Company: {job_data.get('company', '')}
Role: {job_data.get('role_title', '')}
Days since applying: {days_since_applied}

Requirements:
- Subject line on the first line, prefixed with "Subject: "
- Blank line after subject
- Then the email body (3-4 sentences max)
- Professional but warm tone — not pushy or desperate
- Express continued interest and briefly reaffirm fit
- Do not fabricate interview steps or interactions that haven't happened
- Close with a clear but light call to action (happy to provide more info, available to chat, etc.)
- Sign off with just the candidate's first name
- Return only the subject line and email body — no extra commentary"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=400,
    )

    usage = response.usage
    text = response.choices[0].message.content.strip()
    return {
        "email_text": text,
        "_usage": {
            "model": MODEL,
            "input_tokens": usage.prompt_tokens,
            "output_tokens": usage.completion_tokens,
            "estimated_cost": _cost(MODEL, usage.prompt_tokens, usage.completion_tokens),
        },
    }


def generate_company_research(company: str, role_title: str) -> dict:
    prompt = f"""Provide a concise company overview to help a job candidate prepare for an application or interview.

Company: {company}
Role applied for: {role_title}

Cover these sections (use the exact headers):
**What They Do**
1-2 sentences on the company's core business and product/service.

**Size & Stage**
Approximate employee count, funding stage or public status, and founding year if known.

**Tech Stack & Tools**
Key technologies, languages, or platforms they are known to use (if relevant to this role).

**Culture & Work Style**
What the company is known for culturally — pace, values, remote/hybrid stance if known.

**Interview Process**
Typical interview stages for this type of role at this company, if known.

**Useful Context for This Role**
1-2 specific points that make this role or company relevant to the candidate given the role title.

If you have limited or no information about this specific company, say so clearly rather than guessing. Return only the formatted overview."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=700,
    )

    usage = response.usage
    text = response.choices[0].message.content.strip()
    return {
        "summary_text": text,
        "_usage": {
            "model": MODEL,
            "input_tokens": usage.prompt_tokens,
            "output_tokens": usage.completion_tokens,
            "estimated_cost": _cost(MODEL, usage.prompt_tokens, usage.completion_tokens),
        },
    }


def generate_interview_prep(job_data: dict, profile: str) -> dict:
    prompt = f"""You are a career coach preparing a candidate for a job interview.

Candidate profile:
{profile}

Job details:
Company: {job_data.get('company', '')}
Role: {job_data.get('role_title', '')}
Required skills: {job_data.get('required_skills', '')}
Preferred skills: {job_data.get('preferred_skills', '')}
Responsibilities: {job_data.get('responsibilities', '')}

Generate 10 likely interview questions for this specific role, along with a brief (1-2 sentence) tip on how the candidate should approach each one based on their profile.

Format your response exactly like this for each question:
**Q1: [Question]**
Tip: [How to approach it based on the candidate's background]

Cover a mix of: behavioral questions, technical/role-specific questions, and situational questions.
Do not include generic filler questions. Make them specific to this role and company.
Return only the questions and tips — no intro or outro text."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=1500,
    )

    usage = response.usage
    text = response.choices[0].message.content.strip()
    return {
        "questions_text": text,
        "_usage": {
            "model": MODEL,
            "input_tokens": usage.prompt_tokens,
            "output_tokens": usage.completion_tokens,
            "estimated_cost": _cost(MODEL, usage.prompt_tokens, usage.completion_tokens),
        },
    }
