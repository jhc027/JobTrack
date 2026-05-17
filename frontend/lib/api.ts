import axios from "axios";
import { getPassword, clearPassword } from "@/lib/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const pw = getPassword();
  if (pw) config.headers.Authorization = `Bearer ${pw}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearPassword();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export interface Job {
  id: number;
  company: string | null;
  role_title: string | null;
  location: string | null;
  remote_type: string | null;
  salary: string | null;
  job_url: string | null;
  source_platform: string | null;
  manual_job_text: string | null;
  source_quality: string | null;
  required_skills: string | null;
  preferred_skills: string | null;
  responsibilities: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: number;
  job_id: number;
  status: string;
  fit_score: number | null;
  fit_level: string | null;
  match_summary: string | null;
  recommended_emphasis: string | null;
  date_added: string;
  date_applied: string | null;
  follow_up_date: string | null;
  result: string | null;
  notes: string | null;
  tags: string | null;
  job?: Job;
}

export interface CoverLetter {
  id: number;
  application_id: number;
  body_text: string;
  template_name: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestResponse {
  job: Job;
  application: Application;
  message: string;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  existing_job_id: number | null;
  existing_application_id: number | null;
  company: string | null;
  role_title: string | null;
}

export const checkDuplicate = (url: string) =>
  api.get<DuplicateCheckResult>("/jobs/check-duplicate", { params: { url } }).then((r) => r.data);

export const ingestJob = (data: { job_url?: string; manual_job_text?: string }) =>
  api.post<IngestResponse>("/jobs/ingest", data).then((r) => r.data);

export const listApplications = () =>
  api.get<Application[]>("/applications/").then((r) => r.data);

export const getApplication = (id: number) =>
  api.get<Application>(`/applications/${id}`).then((r) => r.data);

export const updateApplication = (id: number, data: Partial<Application>) =>
  api.patch<Application>(`/applications/${id}`, data).then((r) => r.data);

export const deleteJob = (id: number) => api.delete(`/jobs/${id}`);

export const listCoverLetters = (appId: number) =>
  api.get<CoverLetter[]>(`/applications/${appId}/cover-letters`).then((r) => r.data);

export const generateCoverLetter = (appId: number) =>
  api.post<CoverLetter>(`/cover-letters/generate/${appId}`).then((r) => r.data);

export const deleteCoverLetter = (id: number) => api.delete(`/cover-letters/${id}`);

export interface CandidateProfile {
  id: number;
  name: string;
  education: string | null;
  skills: string | null;
  projects: string | null;
  certifications: string | null;
  experience_summary: string | null;
  work_experience: string | null;
  preferred_tone: string | null;
  updated_at: string;
}

export const getProfile = () =>
  api.get<CandidateProfile>("/profile/").then((r) => r.data);

export const updateProfile = (data: Partial<Omit<CandidateProfile, "id" | "updated_at">>) =>
  api.patch<CandidateProfile>("/profile/", data).then((r) => r.data);

export const reevaluateFit = (appId: number) =>
  api.post<Application>(`/applications/${appId}/reevaluate`).then((r) => r.data);

export interface BulkReevaluateResult {
  updated: number;
  errors: number;
  message: string;
}

export const reevaluateBulk = (statuses: string[] | null) =>
  api.post<BulkReevaluateResult>("/applications/reevaluate-bulk", { statuses }).then((r) => r.data);

export interface ActivityLog {
  id: number;
  application_id: number;
  event_type: string;
  description: string;
  is_manual: boolean;
  created_at: string;
}

export const listActivity = (appId: number) =>
  api.get<ActivityLog[]>(`/applications/${appId}/activity`).then((r) => r.data);

export const addManualActivity = (appId: number, description: string) =>
  api.post<ActivityLog>(`/applications/${appId}/activity`, { description }).then((r) => r.data);

export interface InterviewPrep {
  id: number;
  application_id: number;
  questions_text: string;
  created_at: string;
}

export const generateInterviewPrep = (appId: number) =>
  api.post<InterviewPrep>(`/interview-prep/${appId}`).then((r) => r.data);

export const listInterviewPreps = (appId: number) =>
  api.get<InterviewPrep[]>(`/interview-prep/${appId}`).then((r) => r.data);

export const deleteInterviewPrep = (prepId: number) =>
  api.delete(`/interview-prep/${prepId}/delete`);

export const updateJob = (jobId: number, data: Partial<Job>) =>
  api.patch<Job>(`/jobs/${jobId}`, data).then((r) => r.data);

export interface Stats {
  total: number;
  by_status: Record<string, number>;
  average_fit_score: number | null;
  by_fit_level: Record<string, number>;
  weekly_activity: { week: string; count: number }[];
}

export const getStats = () => api.get<Stats>("/stats/").then((r) => r.data);

export interface SkillGap {
  skill: string;
  count: number;
}
export const getSkillGaps = () =>
  api.get<{ gaps: SkillGap[]; total_jobs_analyzed: number }>("/stats/skill-gaps").then((r) => r.data);

export interface FollowUpEmail {
  id: number;
  application_id: number;
  email_text: string;
  created_at: string;
}
export const generateFollowUpEmail = (appId: number) =>
  api.post<FollowUpEmail>(`/follow-up-emails/${appId}`).then((r) => r.data);
export const listFollowUpEmails = (appId: number) =>
  api.get<FollowUpEmail[]>(`/follow-up-emails/${appId}`).then((r) => r.data);
export const deleteFollowUpEmail = (emailId: number) =>
  api.delete(`/follow-up-emails/${emailId}/delete`);

export interface CompanyResearch {
  id: number;
  application_id: number;
  summary_text: string;
  created_at: string;
}
export const generateCompanyResearch = (appId: number) =>
  api.post<CompanyResearch>(`/company-research/${appId}`).then((r) => r.data);
export const listCompanyResearch = (appId: number) =>
  api.get<CompanyResearch[]>(`/company-research/${appId}`).then((r) => r.data);
export const deleteCompanyResearch = (researchId: number) =>
  api.delete(`/company-research/${researchId}/delete`);

export const importResumePdf = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ extracted: Partial<CandidateProfile>; raw_text_length: number }>(
    "/profile/import-pdf", form,
    { headers: { "Content-Type": "multipart/form-data" } }
  ).then((r) => r.data);
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const coverLetterExportUrl = (id: number, format: "docx" | "pdf") =>
  `${BASE_URL}/cover-letters/${id}/export/${format}`;
