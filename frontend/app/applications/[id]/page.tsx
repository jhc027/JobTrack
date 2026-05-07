"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getApplication,
  updateApplication,
  listCoverLetters,
  generateCoverLetter,
  deleteCoverLetter,
  coverLetterExportUrl,
  reevaluateFit,
  type Application,
  type CoverLetter,
} from "@/lib/api";
import { getPassword } from "@/lib/auth";

const STATUS_OPTIONS = ["Planned", "Applied", "Interviewing", "Offered", "Rejected", "Withdrawn"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="mb-2">
      <span className="text-xs text-slate-500">{label}: </span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const appId = parseInt(id);

  const [app, setApp] = useState<Application | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loadingApp, setLoadingApp] = useState(true);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getApplication(appId), listCoverLetters(appId)])
      .then(([a, cl]) => {
        setApp(a);
        setNotes(a.notes ?? "");
        setCoverLetters(cl);
      })
      .catch(() => setError("Failed to load application."))
      .finally(() => setLoadingApp(false));
  }, [appId]);

  async function handleStatusChange(status: string) {
    if (!app) return;
    const updated = await updateApplication(app.id, { status });
    setApp({ ...app, status: updated.status });
  }

  async function handleSaveNotes() {
    if (!app) return;
    setSavingNotes(true);
    await updateApplication(app.id, { notes });
    setSavingNotes(false);
  }

  async function handleReevaluate() {
    setReevaluating(true);
    try {
      const updated = await reevaluateFit(appId);
      setApp((prev) => prev ? { ...prev, ...updated } : prev);
    } catch {
      alert("Re-evaluation failed.");
    } finally {
      setReevaluating(false);
    }
  }

  async function handleGenerateLetter() {
    setGeneratingLetter(true);
    try {
      const letter = await generateCoverLetter(appId);
      setCoverLetters((prev) => [letter, ...prev]);
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

  if (loadingApp) return <p className="text-slate-400">Loading...</p>;
  if (error || !app) return <p className="text-red-400">{error ?? "Not found."}</p>;

  const job = app.job;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push("/")} className="text-slate-500 hover:text-slate-300 text-sm mb-2 transition-colors">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">{job?.role_title ?? "Untitled Role"}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {job?.company ?? "Unknown Company"}
            {job?.location ? ` · ${job.location}` : ""}
            {job?.remote_type && job.remote_type !== "Unknown" ? ` · ${job.remote_type}` : ""}
            {job?.salary ? ` · ${job.salary}` : ""}
          </p>
        </div>
        <select
          value={app.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-slate-800 text-slate-200 text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Section title="Fit Analysis">
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
          <button
            onClick={handleReevaluate}
            disabled={reevaluating}
            className="mt-3 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {reevaluating ? "Re-evaluating…" : "Re-evaluate Fit"}
          </button>
        </Section>

        <Section title="Job Details">
          <Field label="Platform" value={job?.source_platform} />
          <Field label="Quality" value={job?.source_quality} />
          {job?.job_url && (
            <div className="mb-2">
              <span className="text-xs text-slate-500">Link: </span>
              <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline break-all">
                {job.job_url}
              </a>
            </div>
          )}
          {job?.required_skills && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">Required Skills</p>
              <div className="flex flex-wrap gap-1">
                {job.required_skills.split(",").map((s) => (
                  <span key={s} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{s.trim()}</span>
                ))}
              </div>
            </div>
          )}
          {job?.preferred_skills && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">Preferred Skills</p>
              <div className="flex flex-wrap gap-1">
                {job.preferred_skills.split(",").map((s) => (
                  <span key={s} className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{s.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {job?.responsibilities && (
        <Section title="Responsibilities">
          <p className="text-sm text-slate-300 whitespace-pre-line">{job.responsibilities}</p>
        </Section>
      )}

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this application..."
          className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-y"
        />
        <button
          onClick={handleSaveNotes}
          disabled={savingNotes}
          className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {savingNotes ? "Saving..." : "Save Notes"}
        </button>
      </Section>

      <Section title="Cover Letters">
        <button
          onClick={handleGenerateLetter}
          disabled={generatingLetter}
          className="mb-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {generatingLetter ? "Generating…" : "Generate Cover Letter"}
        </button>

        {coverLetters.length === 0 && !generatingLetter && (
          <p className="text-slate-500 text-sm">No cover letters yet.</p>
        )}

        <div className="flex flex-col gap-4">
          {coverLetters.map((letter, i) => (
            <div key={letter.id} className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">
                  Version {coverLetters.length - i} · {new Date(letter.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopy(letter)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {copiedId === letter.id ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => handleExport(letter.id, "docx")}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    .docx
                  </button>
                  <button
                    onClick={() => handleExport(letter.id, "pdf")}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    .pdf
                  </button>
                  <button
                    onClick={() => handleDeleteLetter(letter.id)}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{letter.body_text}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
