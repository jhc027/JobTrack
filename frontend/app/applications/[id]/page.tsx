"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getApplication, updateApplication, updateJob,
  listCoverLetters, generateCoverLetter, deleteCoverLetter, coverLetterExportUrl,
  reevaluateFit,
  listActivity, addManualActivity,
  generateInterviewPrep, listInterviewPreps, deleteInterviewPrep,
  generateFollowUpEmail, listFollowUpEmails, deleteFollowUpEmail,
  generateCompanyResearch, listCompanyResearch, deleteCompanyResearch,
  type Application, type CoverLetter, type ActivityLog, type InterviewPrep,
  type FollowUpEmail, type CompanyResearch, type Job,
} from "@/lib/api";
import { getPassword } from "@/lib/auth";

const STATUS_OPTIONS = ["Planned", "Applied", "Interviewing", "Offered", "Rejected", "Withdrawn", "Ghosted"];

const EVENT_ICONS: Record<string, string> = {
  job_added: "✦",
  status_change: "→",
  fit_evaluated: "◎",
  cover_letter_generated: "✉",
  interview_prep_generated: "?",
  follow_up_email_generated: "↗",
  company_research_generated: "⊙",
  manual: "✎",
};

const SECTION_STYLES: Record<string, string> = {
  blue:   "border-l-4 border-l-blue-600 border border-slate-800",
  green:  "border-l-4 border-l-green-600 border border-slate-800",
  amber:  "border-l-4 border-l-amber-500 border border-slate-800",
  purple: "border-l-4 border-l-purple-500 border border-slate-800",
  slate:  "border-l-4 border-l-slate-600 border border-slate-800",
  none:   "border border-slate-800",
};

const HEADER_STYLES: Record<string, string> = {
  blue:   "text-blue-400",
  green:  "text-green-400",
  amber:  "text-amber-400",
  purple: "text-purple-400",
  slate:  "text-slate-400",
  none:   "text-slate-400",
};

function Section({ title, children, action, color = "none" }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  color?: keyof typeof SECTION_STYLES;
}) {
  return (
    <div className={`bg-[#1a1d27] rounded-xl p-5 ${SECTION_STYLES[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${HEADER_STYLES[color]}`}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const appId = parseInt(id);

  const [app, setApp] = useState<Application | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [interviewPreps, setInterviewPreps] = useState<InterviewPrep[]>([]);
  const [followUpEmails, setFollowUpEmails] = useState<FollowUpEmail[]>([]);
  const [companyResearch, setCompanyResearch] = useState<CompanyResearch[]>([]);
  const [loadingApp, setLoadingApp] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Job>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Actions
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);
  const [generatingPrep, setGeneratingPrep] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatingResearch, setGeneratingResearch] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [tags, setTags] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [manualEntry, setManualEntry] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);

  useEffect(() => {
    Promise.all([
      getApplication(appId),
      listCoverLetters(appId),
      listActivity(appId),
      listInterviewPreps(appId),
      listFollowUpEmails(appId),
      listCompanyResearch(appId),
    ])
      .then(([a, cl, al, ip, fe, cr]) => {
        setApp(a);
        setNotes(a.notes ?? "");
        setTags(a.tags ?? "");
        setCoverLetters(cl);
        setActivityLog(al);
        setInterviewPreps(ip);
        setFollowUpEmails(fe);
        setCompanyResearch(cr);
      })
      .catch(() => setError("Failed to load application."))
      .finally(() => setLoadingApp(false));
  }, [appId]);

  // ── Status ────────────────────────────────────────────────────────────────
  async function handleStatusChange(status: string) {
    if (!app) return;
    const updated = await updateApplication(app.id, { status });
    setApp({ ...app, status: updated.status });
    const al = await listActivity(appId);
    setActivityLog(al);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  async function handleSaveNotes() {
    if (!app) return;
    setSavingNotes(true);
    await updateApplication(app.id, { notes });
    setSavingNotes(false);
  }

  // ── Edit job fields ───────────────────────────────────────────────────────
  function startEdit() {
    if (!app?.job) return;
    setEditFields({
      company: app.job.company ?? "",
      role_title: app.job.role_title ?? "",
      location: app.job.location ?? "",
      remote_type: app.job.remote_type ?? "",
      salary: app.job.salary ?? "",
      source_platform: app.job.source_platform ?? "",
      required_skills: app.job.required_skills ?? "",
      preferred_skills: app.job.preferred_skills ?? "",
      responsibilities: app.job.responsibilities ?? "",
    });
    setEditMode(true);
  }

  async function handleSaveEdit() {
    if (!app?.job) return;
    setSavingEdit(true);
    try {
      const updated = await updateJob(app.job.id, editFields);
      setApp({ ...app, job: updated });
      setEditMode(false);
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Re-evaluate ───────────────────────────────────────────────────────────
  async function handleReevaluate() {
    setReevaluating(true);
    try {
      const updated = await reevaluateFit(appId);
      setApp((prev) => prev ? { ...prev, ...updated } : prev);
      const al = await listActivity(appId);
      setActivityLog(al);
    } catch {
      alert("Re-evaluation failed.");
    } finally {
      setReevaluating(false);
    }
  }

  // ── Cover letters ─────────────────────────────────────────────────────────
  async function handleGenerateLetter() {
    setGeneratingLetter(true);
    try {
      const letter = await generateCoverLetter(appId);
      setCoverLetters((prev) => [letter, ...prev]);
      const al = await listActivity(appId);
      setActivityLog(al);
    } catch {
      alert("Failed to generate cover letter.");
    } finally {
      setGeneratingLetter(false);
    }
  }

  async function handleDeleteLetter(letterId: number) {
    if (!confirm("Delete this cover letter?")) return;
    await deleteCoverLetter(letterId);
    setCoverLetters((prev) => prev.filter((l) => l.id !== letterId));
  }

  async function handleCopy(letter: CoverLetter) {
    await navigator.clipboard.writeText(letter.body_text);
    setCopiedId(letter.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleExport(letterId: number, format: "docx" | "pdf") {
    const res = await fetch(coverLetterExportUrl(letterId, format), {
      headers: { Authorization: `Bearer ${getPassword()}` },
    });
    if (!res.ok) return alert("Export failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const company = (app?.job?.company ?? "Company").replace(/\s+/g, "_");
    const role = (app?.job?.role_title ?? "Role").replace(/\s+/g, "_");
    a.download = `${company}-${role}-Cover_Letter.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Activity log ──────────────────────────────────────────────────────────
  async function handleAddManualEntry() {
    if (!manualEntry.trim()) return;
    setAddingEntry(true);
    try {
      const entry = await addManualActivity(appId, manualEntry.trim());
      setActivityLog((prev) => [...prev, entry]);
      setManualEntry("");
    } catch {
      alert("Failed to add entry.");
    } finally {
      setAddingEntry(false);
    }
  }

  // ── Tags ─────────────────────────────────────────────────────────────────
  async function handleSaveTags() {
    if (!app) return;
    setSavingTags(true);
    await updateApplication(app.id, { tags });
    setSavingTags(false);
  }

  // ── Follow-up email ───────────────────────────────────────────────────────
  async function handleGenerateEmail() {
    setGeneratingEmail(true);
    try {
      const email = await generateFollowUpEmail(appId);
      setFollowUpEmails((prev) => [email, ...prev]);
      const al = await listActivity(appId);
      setActivityLog(al);
    } catch {
      alert("Failed to generate follow-up email.");
    } finally {
      setGeneratingEmail(false);
    }
  }

  async function handleDeleteEmail(emailId: number) {
    if (!confirm("Delete this follow-up email?")) return;
    await deleteFollowUpEmail(emailId);
    setFollowUpEmails((prev) => prev.filter((e) => e.id !== emailId));
  }

  async function handleCopyEmail(email: FollowUpEmail) {
    await navigator.clipboard.writeText(email.email_text);
    setCopiedEmailId(email.id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  }

  // ── Company research ──────────────────────────────────────────────────────
  async function handleGenerateResearch() {
    setGeneratingResearch(true);
    try {
      const research = await generateCompanyResearch(appId);
      setCompanyResearch((prev) => [research, ...prev]);
      const al = await listActivity(appId);
      setActivityLog(al);
    } catch {
      alert("Failed to generate company research.");
    } finally {
      setGeneratingResearch(false);
    }
  }

  async function handleDeleteResearch(researchId: number) {
    if (!confirm("Delete this company research?")) return;
    await deleteCompanyResearch(researchId);
    setCompanyResearch((prev) => prev.filter((r) => r.id !== researchId));
  }

  // ── Interview prep ────────────────────────────────────────────────────────
  async function handleGeneratePrep() {
    setGeneratingPrep(true);
    try {
      const prep = await generateInterviewPrep(appId);
      setInterviewPreps((prev) => [prep, ...prev]);
      const al = await listActivity(appId);
      setActivityLog(al);
    } catch {
      alert("Failed to generate interview prep.");
    } finally {
      setGeneratingPrep(false);
    }
  }

  async function handleDeletePrep(prepId: number) {
    if (!confirm("Delete this set of interview questions?")) return;
    await deleteInterviewPrep(prepId);
    setInterviewPreps((prev) => prev.filter((p) => p.id !== prepId));
  }

  if (loadingApp) return <p className="text-slate-400">Loading...</p>;
  if (error || !app) return <p className="text-red-400">{error ?? "Not found."}</p>;

  const job = app.job;
  const inputCls = "w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-y";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push("/")} className="text-slate-500 hover:text-slate-300 text-sm mb-2 transition-colors">
            ← Dashboard
          </button>
          {editMode ? (
            <div className="flex flex-col gap-2">
              <input value={editFields.role_title ?? ""} onChange={(e) => setEditFields({ ...editFields, role_title: e.target.value })}
                className={inputCls} placeholder="Role title" />
              <div className="flex gap-2 flex-wrap">
                <input value={editFields.company ?? ""} onChange={(e) => setEditFields({ ...editFields, company: e.target.value })}
                  className={`${inputCls} flex-1`} placeholder="Company" />
                <input value={editFields.location ?? ""} onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                  className={`${inputCls} flex-1`} placeholder="Location" />
                <select value={editFields.remote_type ?? ""} onChange={(e) => setEditFields({ ...editFields, remote_type: e.target.value })}
                  className="bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                  {["", "Remote", "Hybrid", "On-site", "Unknown"].map((v) => <option key={v} value={v}>{v || "Work type"}</option>)}
                </select>
                <input value={editFields.salary ?? ""} onChange={(e) => setEditFields({ ...editFields, salary: e.target.value })}
                  className={`${inputCls} flex-1`} placeholder="Salary" />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">{job?.role_title ?? "Untitled Role"}</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {job?.company ?? "Unknown Company"}
                {job?.location ? ` · ${job.location}` : ""}
                {job?.remote_type && job.remote_type !== "Unknown" ? ` · ${job.remote_type}` : ""}
                {job?.salary ? ` · ${job.salary}` : ""}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={savingEdit}
                className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button onClick={startEdit} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors">Edit</button>
          )}
          <select value={app.status} onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-slate-800 text-slate-200 text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Fit + Job Details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Section title="Fit Analysis" color="blue">
          {app.fit_score != null && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl font-bold text-white">{app.fit_score.toFixed(1)}</span>
              <span className="text-slate-400 text-sm">/10 · {app.fit_level}</span>
            </div>
          )}
          {app.match_summary && <p className="text-sm text-slate-300 mb-2">{app.match_summary}</p>}
          {app.recommended_emphasis && (
            <p className="text-xs text-slate-400 border-t border-slate-700 pt-2 mt-2">
              <span className="font-medium text-slate-300">Emphasis: </span>{app.recommended_emphasis}
            </p>
          )}
          <button onClick={handleReevaluate} disabled={reevaluating}
            className="mt-3 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            {reevaluating ? "Re-evaluating…" : "Re-evaluate Fit"}
          </button>
        </Section>

        <Section title="Job Details" color="blue" action={
          !editMode ? <button onClick={startEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Edit fields</button> : null
        }>
          {editMode ? (
            <div className="flex flex-col gap-2">
              <input value={editFields.source_platform ?? ""} onChange={(e) => setEditFields({ ...editFields, source_platform: e.target.value })}
                className={inputCls} placeholder="Platform (e.g. LinkedIn)" />
              <textarea value={editFields.required_skills ?? ""} onChange={(e) => setEditFields({ ...editFields, required_skills: e.target.value })}
                rows={3} className={inputCls} placeholder="Required skills (comma-separated)" />
              <textarea value={editFields.preferred_skills ?? ""} onChange={(e) => setEditFields({ ...editFields, preferred_skills: e.target.value })}
                rows={3} className={inputCls} placeholder="Preferred skills (comma-separated)" />
              <textarea value={editFields.responsibilities ?? ""} onChange={(e) => setEditFields({ ...editFields, responsibilities: e.target.value })}
                rows={4} className={inputCls} placeholder="Responsibilities summary" />
            </div>
          ) : (
            <>
              {job?.source_platform && <div className="mb-2"><span className="text-xs text-slate-500">Platform: </span><span className="text-sm text-slate-200">{job.source_platform}</span></div>}
              {job?.job_url && (
                <div className="mb-2">
                  <span className="text-xs text-slate-500">Link: </span>
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline break-all">{job.job_url}</a>
                </div>
              )}
              {job?.required_skills && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Required Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {job.required_skills.split(",").map((s) => <span key={s} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{s.trim()}</span>)}
                  </div>
                </div>
              )}
              {job?.preferred_skills && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Preferred Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {job.preferred_skills.split(",").map((s) => <span key={s} className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{s.trim()}</span>)}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>
      </div>

      {/* Responsibilities */}
      {!editMode && job?.responsibilities && (
        <Section title="Responsibilities" color="blue">
          <p className="text-sm text-slate-300 whitespace-pre-line">{job.responsibilities}</p>
        </Section>
      )}

      {/* Cover Letters — first action */}
      <Section title="Cover Letters" color="green">
        <button onClick={handleGenerateLetter} disabled={generatingLetter}
          className="mb-4 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {generatingLetter ? "Generating…" : "Generate Cover Letter"}
        </button>
        {coverLetters.length === 0 && !generatingLetter && <p className="text-slate-500 text-sm">No cover letters yet.</p>}
        <div className="flex flex-col gap-4">
          {coverLetters.map((letter, i) => (
            <div key={letter.id} className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Version {coverLetters.length - i} · {new Date(letter.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleCopy(letter)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors">
                    {copiedId === letter.id ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={() => handleExport(letter.id, "docx")} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors">.docx</button>
                  <button onClick={() => handleExport(letter.id, "pdf")} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors">.pdf</button>
                  <button onClick={() => handleDeleteLetter(letter.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{letter.body_text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Activity Log — frequent reference */}
      <Section title="Activity Log" color="green">
        <div className="flex flex-col gap-2 mb-4">
          {activityLog.length === 0 && <p className="text-slate-500 text-sm">No activity yet.</p>}
          {activityLog.map((entry) => (
            <div key={entry.id} className="flex gap-3 items-start">
              <span className="text-slate-500 text-sm mt-0.5 w-4 shrink-0">{EVENT_ICONS[entry.event_type] ?? "·"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300">{entry.description}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" "}·{" "}
                  {new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {entry.is_manual && <span className="ml-1 text-slate-600">· manual</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-slate-800 pt-3">
          <input value={manualEntry} onChange={(e) => setManualEntry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddManualEntry()}
            placeholder="Add a note (e.g. Spoke with recruiter…)"
            className="flex-1 bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
          <button onClick={handleAddManualEntry} disabled={addingEntry || !manualEntry.trim()}
            className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            Add
          </button>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes" color="slate">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Add notes about this application..."
          className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-y" />
        <button onClick={handleSaveNotes} disabled={savingNotes}
          className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
          {savingNotes ? "Saving..." : "Save Notes"}
        </button>
      </Section>

      {/* Tags */}
      <Section title="Tags" color="slate">
        <p className="text-xs text-slate-500 mb-2">Comma-separated labels for your own organization (e.g. dream company, referral, stretch role)</p>
        <input value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="dream company, referral, remote only…"
          className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
        {tags && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
              <span key={t} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">{t}</span>
            ))}
          </div>
        )}
        <button onClick={handleSaveTags} disabled={savingTags}
          className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
          {savingTags ? "Saving..." : "Save Tags"}
        </button>
      </Section>

      {/* Company Research */}
      <Section title="Company Research" color="amber">
        <button onClick={handleGenerateResearch} disabled={generatingResearch}
          className="mb-4 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {generatingResearch ? "Researching…" : "Research Company"}
        </button>
        {companyResearch.length === 0 && !generatingResearch && <p className="text-slate-500 text-sm">No research generated yet.</p>}
        <div className="flex flex-col gap-4">
          {companyResearch.map((r) => (
            <div key={r.id} className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <button onClick={() => handleDeleteResearch(r.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{r.summary_text}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Interview Prep */}
      <Section title="Interview Prep" color="amber">
        <button onClick={handleGeneratePrep} disabled={generatingPrep}
          className="mb-4 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {generatingPrep ? "Generating…" : "Generate Interview Questions"}
        </button>
        {interviewPreps.length === 0 && !generatingPrep && <p className="text-slate-500 text-sm">No interview prep generated yet.</p>}
        <div className="flex flex-col gap-4">
          {interviewPreps.map((prep, i) => (
            <div key={prep.id} className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Set {interviewPreps.length - i} · {new Date(prep.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <button onClick={() => handleDeletePrep(prep.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{prep.questions_text}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Follow-up Emails */}
      <Section title="Follow-up Emails" color="purple">
        <button onClick={handleGenerateEmail} disabled={generatingEmail}
          className="mb-4 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {generatingEmail ? "Drafting…" : "Draft Follow-up Email"}
        </button>
        {followUpEmails.length === 0 && !generatingEmail && <p className="text-slate-500 text-sm">No follow-up emails drafted yet.</p>}
        <div className="flex flex-col gap-4">
          {followUpEmails.map((email) => (
            <div key={email.id} className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">{new Date(email.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleCopyEmail(email)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors">
                    {copiedEmailId === email.id ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={() => handleDeleteEmail(email.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{email.email_text}</pre>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
