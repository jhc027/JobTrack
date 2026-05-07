"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ingestJob } from "@/lib/api";

export default function AddJob() {
  const router = useRouter();
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobUrl.trim() && !jobText.trim()) {
      setError("Provide a job URL, job description, or both.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await ingestJob({
        job_url: jobUrl.trim() || undefined,
        manual_job_text: jobText.trim() || undefined,
      });
      router.push(`/applications/${result.application.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to process job. Check the backend is running.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Add Job</h1>
      <p className="text-slate-400 text-sm mb-6">
        Paste a job URL, the job description text, or both. The AI will extract details and score your fit.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Job URL <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://jobs.company.com/..."
            className="w-full bg-[#1a1d27] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Job Description <span className="text-slate-500 font-normal">(paste if behind login)</span>
          </label>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            rows={12}
            placeholder="Paste the full job description here..."
            className="w-full bg-[#1a1d27] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-y font-mono"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm self-start"
        >
          {loading ? "Analyzing…" : "Analyze & Save"}
        </button>
      </form>
    </div>
  );
}
