import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, CheckCircle2, User2, Users2, ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import type { Database } from "../../types/supabase";
import DashboardReminder from "./DashboardReminder";
// Keep charts (rendered inside Tailwind cards)
import { LineChart, BarChart } from "@mui/x-charts";

type DailyEntryRow = Database["public"]["Tables"]["daily_entries"]["Row"];

interface ProjectOption {
  project_id: string;
  projects: { name: string | null; logo_url: string | null };
}
interface DashboardMetrics {
  project_id: string;
  name: string | null;
  active_valuation: number | null;
  active_work_hours_until_completion: number | null;
  implied_hour_value: number | null;
  team_hours_7?: number | null;
  my_hours_7?: number | null;
  updated_at?: string | null;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<"impact" | "team">("impact");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [entries, setEntries] = useState<DailyEntryRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [hoursSeries, setHoursSeries] = useState<{ date: string; my: number; team: number }[]>([]);
  const [equityPct, setEquityPct] = useState<number | null>(null);
  const [totalUserHours, setTotalUserHours] = useState<number | null>(null);
  const [totalTeamHours, setTotalTeamHours] = useState<number | null>(null);
  const [loadingPrimary, setLoadingPrimary] = useState(false);

  // Fetch user projects
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from("project_members")
        .select("project_id, projects(name, logo_url)")
        .eq("user_id", user.id);
      if (!error) {
        setProjects(data ?? []);
        if (data && data.length > 0) setSelectedProjectId((prev) => prev || data[0].project_id);
      }
      setLoadingProjects(false);
    })();
  }, [user]);

  // Fetch metrics
  useEffect(() => {
    if (!selectedProjectId) return;
    (async () => {
      setLoadingMetrics(true);
      const { data, error } = await supabase
        .from("project_dashboard")
        .select(
          "project_id, name, active_valuation, active_work_hours_until_completion, implied_hour_value"
        )
        .eq("project_id", selectedProjectId)
        .single();
      if (!error) setMetrics(data as DashboardMetrics);
      setLoadingMetrics(false);
    })();
  }, [selectedProjectId]);

  // Fetch daily entries (+ series)
  const fetchEntries = useCallback(async () => {
    if (!user || !selectedProjectId) return;
    setLoadingEntries(true);
    let query = supabase
      .from("daily_entries")
      .select(
        "id, entry_date, created_by, project_id, hours_worked, hours_wasted, completed, plan_to_complete, inserted_at"
      )
      .eq("project_id", selectedProjectId)
      .order("entry_date", { ascending: false })
      .limit(50);
    if (view === "impact") query = query.eq("created_by", user.id);
    const { data } = await query;
    const list = (data ?? []) as DailyEntryRow[];
    setEntries(list.slice(0, 5));

    const agg = new Map<string, { my: number; team: number }>();
    list.forEach((row) => {
      if (!row.entry_date) return;
      if (!agg.has(row.entry_date)) agg.set(row.entry_date, { my: 0, team: 0 });
      const bucket = agg.get(row.entry_date)!;
      const hrs = Number(row.hours_worked || 0);
      bucket.team += hrs;
      if (row.created_by === user.id) bucket.my += hrs;
    });
    const series = Array.from(agg.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, v]) => ({ date, my: v.my, team: v.team }));
    setHoursSeries(series);
    setLoadingEntries(false);
  }, [user, selectedProjectId, view, supabase]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Equity % and hours aggregates
  useEffect(() => {
    if (!user || !selectedProjectId) return;
    let cancelled = false;
    (async () => {
      setLoadingPrimary(true);
      const { data: memberRow } = await supabase
        .from("project_members")
        .select("equity")
        .eq("project_id", selectedProjectId)
        .eq("user_id", user.id)
        .maybeSingle();
      const pct = memberRow?.equity ?? null;
      if (!cancelled) {
        setEquityPct(pct);
      }

      const { data: hoursRows } = await supabase
        .from("daily_entries")
        .select("created_by, hours_worked")
        .eq("project_id", selectedProjectId);

      let userHours = 0;
      let teamHours = 0;
      (hoursRows ?? []).forEach((r) => {
        const h = Number(r.hours_worked) || 0;
        teamHours += h;
        if (r.created_by === user.id) userHours += h;
      });

      if (!cancelled) {
        setTotalUserHours(userHours);
        setTotalTeamHours(teamHours);
        setLoadingPrimary(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedProjectId]);

  // Helpers
  const implied = metrics?.implied_hour_value ?? 0;
  const equityFraction = (equityPct ?? 0) / 100;
  const sweatEquityEarnedValue = (totalUserHours ?? 0) * implied * equityFraction;
  const potentialEquityValue = (metrics?.active_valuation ?? 0) * equityFraction;
  const myContributionPct =
    totalTeamHours && totalTeamHours > 0 ? (100 * (totalUserHours ?? 0)) / totalTeamHours : 0;

  const cards = useMemo(
    () => [
      {
        label: "Sweat Equity Earned",
        value:
          totalUserHours == null || equityPct == null
            ? "—"
            : "$" +
              sweatEquityEarnedValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }),
        loading: loadingPrimary || loadingMetrics,
        helper:
          totalUserHours == null
            ? ""
            : `${totalUserHours}h × $${implied.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })} × ${equityPct || 0}%`,
      },
      {
        label: `Completed Project Equity (${equityPct ?? 0}%)`,
        value:
          equityPct == null || metrics?.active_valuation == null
            ? "—"
            : "$" +
              potentialEquityValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }),
        loading: loadingPrimary || loadingMetrics,
        helper:
          metrics?.active_valuation == null ? "" : `$${metrics.active_valuation.toLocaleString()} × ${equityPct || 0}%`,
      },
      {
        label: "Implied $/Hour",
        value:
          metrics?.implied_hour_value == null
            ? "—"
            : "$" +
              metrics.implied_hour_value.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
        loading: loadingMetrics,
        helper: "",
      },
      {
        label: "My Total Hours",
        value:
          totalUserHours == null
            ? "—"
            : totalUserHours.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              }) + "h",
        loading: loadingPrimary,
        helper: "",
      },
      {
        label: "My Contribution",
        value:
          totalTeamHours == null
            ? "—"
            : myContributionPct.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              }) + "%",
        loading: loadingPrimary,
        helper: totalTeamHours == null ? "" : `${totalUserHours ?? 0}h of ${totalTeamHours}h`,
      },
    ],
    [
      totalUserHours,
      totalTeamHours,
      sweatEquityEarnedValue,
      potentialEquityValue,
      metrics,
      equityPct,
      implied,
      myContributionPct,
      loadingPrimary,
      loadingMetrics,
    ]
  );

  const toggleView = useCallback(() => {
    setView((v) => (v === "impact" ? "team" : "impact"));
  }, []);

  return (
    <div className="px-4 mx-auto max-w-7xl sm:px-6">
      <DashboardReminder />

      {/* Header Card */}
      <div className="relative mb-6 overflow-hidden card">
        <div className="absolute inset-x-0 h-px -top-px bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Live Data */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live dashboard
            </div>
          </div>

          {/* Actions + Project select */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Project select */}
            <div className="relative group">
              {loadingProjects ? (
                <div className="h-10 w-44 rounded-xl bg-white/10 animate-pulse" />
              ) : (
                <select
                  className="
                    input appearance-none !h-10 !py-2.5 pr-12 min-w-[14rem] p-2 rounded-md
                    bg-white/10 text-white placeholder-white/60
                    border-white/25 hover:border-white/35
                    focus:border-white/50 focus:ring-2 focus:ring-fuchsia-400/30
                    transition
                  "
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  title="Choose project"
                >
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.projects.name}
                    </option>
                  ))}
                </select>
              )}
              {/* Divider before caret */}
              <span className="absolute w-px h-6 -translate-y-1/2 pointer-events-none right-9 top-1/2 bg-white/12 group-focus-within:bg-white/20" />
              {/* Caret */}
              <ChevronDown
                className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none right-3 top-1/2 text-white/80 group-hover:text-white"
              />
            </div>

            {/* View toggle */}
            <button
              title={
                view === "impact"
                  ? "Showing My Impact – switch to Team Progress"
                  : "Showing Team Progress – switch to My Impact"
              }
              onClick={toggleView}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-2xl ring-1 ring-inset ring-white/15 bg-white/5 hover:bg-white/10"
            >
              {view === "impact" ? (
                <>
                  <User2 className="w-4 h-4" /> My Impact
                </>
              ) : (
                <>
                  <Users2 className="w-4 h-4" /> Team Progress
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-5 sm:gap-4">
        {cards.map((c) => (
          <div key={c.label} className="relative p-4 overflow-hidden card sm:p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500/70 via-rose-400/70 to-cyan-400/70" />
            <div className="text-[10px] tracking-wider uppercase font-semibold text-white/60 mb-1">
              {c.label}
            </div>
            {c.loading ? (
              <div className="w-2/3 rounded h-7 bg-white/10 animate-pulse" />
            ) : (
              <div className="text-xl font-bold">{c.value}</div>
            )}
            {!c.loading && c.helper && (
              <div className="text-xs text-white/60 mt-1.5">{c.helper}</div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-12">
        <div className="p-4 lg:col-span-7 card sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">
              {view === "impact" ? "My Hours (Last 7 Days)" : "Team Hours (Last 7 Days)"}
            </h3>
          </div>
          {loadingEntries ? (
            <div className="h-[260px] rounded bg-white/10 animate-pulse" />
          ) : hoursSeries.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-white/60">No data.</div>
          ) : (
            <LineChart
              height={260}
              series={[
                {
                  data: hoursSeries.map((d) => (view === "impact" ? d.my : d.team)),
                  label: "Hours",
                  area: true,
                  curve: "monotoneX",
                  color: view === "impact" ? "#22d3ee" : "#ec4899",
                },
              ]}
              xAxis={[
                {
                  scaleType: "point",
                  data: hoursSeries.map((d) => d.date.slice(5)),
                },
              ]}
              margin={{ left: 50, right: 10, top: 30, bottom: 30 }}
            />
          )}
        </div>

        <div className="p-4 lg:col-span-5 card sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Hours Distribution (Last 7 Days)</h3>
          </div>
          {loadingEntries ? (
            <div className="h-[260px] rounded bg-white/10 animate-pulse" />
          ) : hoursSeries.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-white/60">No data.</div>
          ) : (
            <BarChart
              height={260}
              series={[
                { data: hoursSeries.map((d) => d.my), label: "My", color: "#22d3ee" },
                { data: hoursSeries.map((d) => d.team - d.my), label: "Others", color: "#f59e0b", stack: "a" },
              ]}
              xAxis={[
                {
                  scaleType: "band",
                  data: hoursSeries.map((d) => d.date.slice(5)),
                },
              ]}
              margin={{ left: 40, right: 10, top: 30, bottom: 30 }}
              slotProps={{ legend: { hidden: true } }}
            />
          )}
        </div>
      </div>

      {/* Recent Entries */}
      <div className="p-5 mb-8 card sm:p-6">
        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {view === "impact" ? "My Check-In History" : "Team Check-In History"}
            </h3>
            <div className="text-xs text-white/60 mt-0.5">
              Showing the five most recent daily entries.
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => navigate("/checkin")}>
              New Check-In
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/checkins")}>
              View More
            </button>
          </div>
        </div>

        {loadingEntries ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/10 animate-pulse mb-2.5" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-6 text-center text-white/70">No entries found.</div>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="grid text-sm font-semibold rounded-full h-9 w-9 bg-white/10 place-items-center">
                    {(entry.created_by || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">
                        {entry.created_by === user?.id ? "You" : entry.created_by}
                      </div>
                      <span className="inline-flex items-center rounded-full bg-cyan-400/15 text-cyan-200 border border-cyan-300/20 px-2 py-0.5 text-[11px] font-semibold">
                        {(entry.hours_worked ?? 0)}h
                      </span>
                      {entry.hours_wasted ? (
                        <span className="inline-flex items-center rounded-full bg-amber-400/15 text-amber-200 border border-amber-300/20 px-2 py-0.5 text-[11px] font-semibold">
                          Lost {entry.hours_wasted}h
                        </span>
                      ) : null}
                      <span className="text-xs text-white/60">{entry.entry_date}</span>
                    </div>
                    <div className="text-sm mt-1.5 whitespace-pre-line text-white/85">
                      {entry.completed || "(no summary)"}
                    </div>
                  </div>
                 </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;