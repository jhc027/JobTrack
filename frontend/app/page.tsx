"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listApplications, updateApplication, deleteJob, type Application } from "@/lib/api";

const STATUS_OPTIONS = ["Planned", "Applied", "Interviewing", "Offered", "Rejected", "Withdrawn"];
const FILTER_OPTIONS = ["All", ...STATUS_OPTIONS];

const FIT_COLORS: Record<string, string> = {
  Strong: "text-green-400",
  Good: "text-blue-400",
  Moderate: "text-yellow-400",
  Weak: "text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  Planned: "bg-slate-700 text-slate-300",
  Applied: "bg-blue-900 text-blue-300",
  Interviewing: "bg-purple-900 text-purple-300",
  Offered: "bg-green-900 text-green-300",
  Rejected: "bg-red-900 text-red-300",
  Withdrawn: "bg-slate-800 text-slate-400",
};

type SortKey = "date_desc" | "date_asc" | "company_asc" | "company_desc" | "fit_desc" | "fit_asc";

const SORT_LABELS: Record<SortKey, string> = {
  date_desc: "Date (newest)",
  date_asc: "Date (oldest)",
  company_asc: "Company (A–Z)",
  company_desc: "Company (Z–A)",
  fit_desc: "Fit (high–low)",
  fit_asc: "Fit (low–high)",
};

function sortApplications(apps: Application[], key: SortKey): Application[] {
  return [...apps].sort((a, b) => {
    switch (key) {
      case "date_desc": return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      case "date_asc":  return new Date(a.date_added).getTime() - new Date(b.date_added).getTime();
      case "company_asc": return (a.job?.company ?? "").localeCompare(b.job?.company ?? "");
      case "company_desc": return (b.job?.company ?? "").localeCompare(a.job?.company ?? "");
      case "fit_desc": return (b.fit_score ?? -1) - (a.fit_score ?? -1);
      case "fit_asc":  return (a.fit_score ?? 99) - (b.fit_score ?? 99);
      default: return 0;
    }
  });
}

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [query, setQuery] = useState("");

  useEffect(() => {
    listApplications()
      .then(setApplications)
      .catch(() => setError("Failed to load applications. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = applications.filter((a) => {
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (!q) return true;
      return (
        a.job?.company?.toLowerCase().includes(q) ||
        a.job?.role_title?.toLowerCase().includes(q) ||
        a.job?.location?.toLowerCase().includes(q) ||
        a.job?.required_skills?.toLowerCase().includes(q) ||
        a.job?.source_platform?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q)
      );
    });
    return sortApplications(filtered, sortKey);
  }, [applications, filterStatus, sortKey, query]);

  async function handleStatusChange(appId: number, status: string) {
    try {
      const updated = await updateApplication(appId, { status });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a)));
    } catch {
      alert("Failed to update status.");
    }
  }

  async function handleDelete(jobId: number) {
    if (!confirm("Delete this job and all associated data?")) return;
    try {
      await deleteJob(jobId);
      setApplications((prev) => prev.filter((a) => a.job_id !== jobId));
    } catch {
      alert("Failed to delete job.");
    }
  }

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {displayed.length} of {applications.length} application{applications.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/add"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Job
        </Link>
      </div>

      {applications.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company, role, location, skills…"
          className="w-full bg-[#1a1d27] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm mb-3"
        />
      )}

      {applications.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="ml-auto text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          {applications.length === 0 ? (
            <>
              <p className="text-lg">No applications yet.</p>
              <Link href="/add" className="text-blue-400 hover:underline mt-2 inline-block">
                Add your first job →
              </Link>
            </>
          ) : (
            <p>No applications match the current filter.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((app) => (
            <div
              key={app.id}
              className="bg-[#1a1d27] border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/applications/${app.id}`}
                    className="font-semibold text-white hover:text-blue-400 transition-colors truncate"
                  >
                    {app.job?.role_title ?? "Untitled Role"}
                  </Link>
                  {app.fit_level && (
                    <span className={`text-xs font-medium ${FIT_COLORS[app.fit_level] ?? "text-slate-400"}`}>
                      {app.fit_level} {app.fit_score != null ? `(${app.fit_score.toFixed(1)})` : ""}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm mt-0.5">
                  {app.job?.company ?? "Unknown Company"}
                  {app.job?.location ? ` · ${app.job.location}` : ""}
                  {app.job?.remote_type && app.job.remote_type !== "Unknown" ? ` · ${app.job.remote_type}` : ""}
                </p>
                {app.match_summary && (
                  <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{app.match_summary}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value)}
                  className={`text-xs font-medium px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[app.status] ?? "bg-slate-700 text-slate-300"}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(app.job_id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-sm"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
