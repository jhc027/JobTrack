# JobTrack

A personal, AI-powered job application tracker. Paste a job URL or description, and OpenAI extracts the details, scores your fit against your resume, and generates a tailored cover letter — all saved to a searchable dashboard.

## Stack

| Layer    | Tech                             |
| -------- | -------------------------------- |
| Frontend | Next.js 16, Tailwind CSS         |
| Backend  | FastAPI, SQLAlchemy              |
| Database | SQLite (dev) / PostgreSQL (prod) |
| LLM      | OpenAI GPT-4o-mini               |
| Auth     | Password-protected (single user) |

## Features

### Job Tracking

- **Job ingestion** — paste a URL, raw job description, or both
- **AI parsing** — extracts company, role, location, salary, skills, and responsibilities
- **Editable fields** — correct any AI misreads directly on the job detail page
- **Duplicate detection** — warns when a URL already exists in the tracker before submitting
- **Date tracking** — date added and date applied shown on every dashboard card

### AI Analysis

- **Fit scoring** — scores your match 0–10 with a summary and what to emphasize
- **Fit re-evaluation** — re-score any individual application after updating your profile
- **Bulk re-evaluate** — re-score any combination of statuses from the Profile page
- **Cover letter generation** — 3-paragraph letter tailored to the role and your profile
- **Interview prep** — generates 10 role-specific interview questions with candidate-tailored tips; saved per application
- **Export** — download cover letters as `.docx` or `.pdf`

### Dashboard & Navigation

- **Search** — filter by company, role, location, skills, or notes
- **Status filters** — filter by Planned, Applied, Interviewing, Offered, Rejected, Withdrawn, or Ghosted
- **Sort** — by date added, company name, or fit score
- **Aging badges** — Applied cards are flagged after 14 days (yellow), 28 days (orange), and 42 days (red / possibly ghosted)
- **Ghosted status** — distinct from Rejected; marks applications that went silent

### Activity & Stats

- **Activity log** — per-application timeline of status changes, AI actions, and manual notes
- **Stats dashboard** — application counts by status and fit level, average fit score, weekly activity chart

### Profile

- **Candidate profile editor** — update resume details at `/profile`; all LLM calls use the latest version
- **LLM cost tracking** — token usage and estimated cost logged per run

## Running Locally

### Prerequisites

- Python 3.12+ with a virtual environment
- Node.js 18+
- An OpenAI API key

### Backend

```bash
cd backend
source /path/to/.venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./jobtrack.db
OPENAI_API_KEY=sk-...
APP_PASSWORD=your-password-here
ALLOWED_ORIGINS=http://localhost:3000
```

Start the server:

```bash
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`. Docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Project Structure

```text
JobTrack/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, middleware
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── database.py          # Engine and session setup
│   │   ├── config.py            # Environment settings
│   │   ├── middleware/
│   │   │   └── auth.py          # Bearer token auth middleware
│   │   ├── routers/
│   │   │   ├── jobs.py          # Ingest, list, update, delete
│   │   │   ├── applications.py  # List, update status, re-evaluate fit
│   │   │   ├── cover_letters.py # Generate, export (.docx/.pdf), delete
│   │   │   └── profile.py       # Candidate profile CRUD
│   │   └── services/
│   │       ├── openai_service.py    # Job parsing, fit analysis, cover letter
│   │       ├── export_service.py    # DOCX and PDF generation
│   │       └── profile_service.py  # Build profile text for LLM prompts
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx             # Dashboard
    │   ├── add/page.tsx         # Add job form
    │   ├── applications/[id]/   # Job detail, fit score, cover letters
    │   ├── profile/page.tsx     # Candidate profile editor
    │   └── login/page.tsx       # Password login
    ├── components/
    │   ├── Navbar.tsx
    │   ├── NavbarWrapper.tsx
    │   └── AuthGuard.tsx
    └── lib/
        ├── api.ts               # Axios client and API functions
        └── auth.ts              # Password storage and auth helpers
```

## Switching to PostgreSQL

Change one line in `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/jobtrack
```

No code changes needed. SQLAlchemy handles both databases identically.

## Deployment

- **Frontend** — Vercel (auto-deploys from GitHub on push to `master`)
- **Backend + Database** — Railway (FastAPI service + PostgreSQL)
- Set `ALLOWED_ORIGINS` on Railway to include your Vercel domain
- Set `NEXT_PUBLIC_API_URL` on Vercel to your Railway backend URL

## Planned

- Multi-user support with per-user data isolation
- Chrome extension for grabbing job text from the browser
- Company career page auto-fetch
- Resume version tracking
