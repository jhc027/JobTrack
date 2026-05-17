"use client";

import { useEffect, useState } from "react";
import { getStats, type Stats } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  Planned: "bg-slate-600",
  Applied: "bg-blue-600",
  Interviewing: "bg-purple-600",
  Offered: "bg-green-600",
  Rejected: "bg-red-600",
  Withdrawn: "bg-slate-700",
};

const FIT_COLORS: Record<string, string> = {
  Strong: "bg-green-500",
  Good: "bg-blue-500",
  Moderate: "bg-yellow-500",
  Weak: "bg-red-500",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setError("Failed to load stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error || !stats) return <p className="text-red-400">{error ?? "Error"}</p>;

  const maxWeekly = Math.max(...stats.weekly_activity.map((w) => w.count), 1);
  const totalStatusCount = Object.values(stats.by_status).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Stats</h1>

      {/* Top cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Applications" value={stats.total} />
        <StatCard
          label="Average Fit Score"
          value={stats.average_fit_score != null ? `${stats.average_fit_score}/10` : "—"}
        />
        <StatCard
          label="Active Pipeline"
          value={(stats.by_status["Planned"] ?? 0) + (stats.by_status["Applied"] ?? 0) + (stats.by_status["Interviewing"] ?? 0)}
          sub="Planned + Applied + Interviewing"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* By status */}
        <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">By Status</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(stats.by_status)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-24 shrink-0">{status}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${STATUS_COLORS[status] ?? "bg-slate-600"}`}
                      style={{ width: `${(count / totalStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400 w-6 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By fit level */}
        <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">By Fit Level</h2>
          {Object.keys(stats.by_fit_level).length === 0 ? (
            <p className="text-slate-500 text-sm">No scored applications yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {["Strong", "Good", "Moderate", "Weak"].map((level) => {
                const count = stats.by_fit_level[level] ?? 0;
                const total = Object.values(stats.by_fit_level).reduce((a, b) => a + b, 0);
                return count > 0 ? (
                  <div key={level} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-20 shrink-0">{level}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${FIT_COLORS[level]}`} style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="text-sm text-slate-400 w-6 text-right">{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Weekly activity */}
      <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Weekly Activity (last 8 weeks)</h2>
        <div className="flex items-end gap-2 h-28">
          {stats.weekly_activity.map((w) => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">{w.count > 0 ? w.count : ""}</span>
              <div
                className="w-full bg-blue-600 rounded-t"
                style={{ height: `${(w.count / maxWeekly) * 80}px`, minHeight: w.count > 0 ? "4px" : "0" }}
              />
              <span className="text-xs text-slate-600">{w.week}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
