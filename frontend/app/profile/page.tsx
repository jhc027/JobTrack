"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile, reevaluateBulk, type CandidateProfile } from "@/lib/api";

type FormState = Omit<CandidateProfile, "id" | "updated_at">;

const FIELDS: { key: keyof FormState; label: string; hint: string; rows: number }[] = [
  {
    key: "name",
    label: "Name",
    hint: "Your full name.",
    rows: 1,
  },
  {
    key: "education",
    label: "Education",
    hint: "Degree, school, and years.",
    rows: 2,
  },
  {
    key: "skills",
    label: "Skills & Technologies",
    hint: "Programming languages, tools, frameworks, and relevant coursework.",
    rows: 4,
  },
  {
    key: "projects",
    label: "Projects",
    hint: "Each project on its own paragraph. Include context, tech used, and what you built.",
    rows: 8,
  },
  {
    key: "certifications",
    label: "Certifications",
    hint: "List certifications. Add any notes about when to mention them.",
    rows: 3,
  },
  {
    key: "work_experience",
    label: "Work Experience",
    hint: "Roles, responsibilities, and notable contributions.",
    rows: 4,
  },
  {
    key: "experience_summary",
    label: "Professional Summary & Core Pitch",
    hint: "How you'd describe yourself. Includes strengths and what makes you a strong candidate.",
    rows: 5,
  },
  {
    key: "preferred_tone",
    label: "Tone & Writing Strategy",
    hint: "How cover letters should sound, what to avoid, skill language preferences.",
    rows: 6,
  },
];

export default function ProfilePage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reevaluating, setReevaluating] = useState(false);
  const [reevalResult, setReevalResult] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Planned"]);

  useEffect(() => {
    getProfile()
      .then((p) => {
        const { id, updated_at, ...rest } = p;
        setForm(rest);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(key: keyof FormState, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  async function handleReevaluateBulk() {
    if (selectedStatuses.length === 0) return;
    setReevaluating(true);
    setReevalResult(null);
    try {
      const result = await reevaluateBulk(selectedStatuses);
      setReevalResult(result.message);
    } catch {
      setReevalResult("Re-evaluation failed. Try again.");
    } finally {
      setReevaluating(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error && !form) return <p className="text-red-400">{error}</p>;
  if (!form) return null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidate Profile</h1>
          <p className="text-slate-400 text-sm mt-1">
            This is what OpenAI reads when parsing jobs and generating cover letters. Keep it current.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {FIELDS.map(({ key, label, hint, rows }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {label}
            </label>
            <p className="text-xs text-slate-500 mb-1.5">{hint}</p>
            {rows === 1 ? (
              <input
                type="text"
                value={form[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full bg-[#1a1d27] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            ) : (
              <textarea
                value={form[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={rows}
                className="w-full bg-[#1a1d27] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-y"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
        {saved && <span className="text-green-400 text-sm">Profile updated.</span>}
      </div>

      <div className="mt-8 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-1">Bulk Re-evaluate Fit Scores</h2>
        <p className="text-xs text-slate-500 mb-3">
          Re-runs fit scoring on applications using your current profile. Select which statuses to include.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {["Planned", "Applied", "Interviewing", "Offered", "Rejected", "Withdrawn"].map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                selectedStatuses.includes(status)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleReevaluateBulk}
            disabled={reevaluating || selectedStatuses.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {reevaluating ? "Re-evaluating…" : `Re-evaluate (${selectedStatuses.length} selected)`}
          </button>
          {reevalResult && (
            <span className={`text-sm ${reevalResult.includes("failed") ? "text-red-400" : "text-green-400"}`}>
              {reevalResult}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
