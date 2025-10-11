import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, CheckCircle2, User2, Users2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import type { Database } from "../../types/supabase";

import {
  Container,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip as BrandChip,
} from "@/components/ui/brand";

import { Box, Grid, Stack, Typography, Skeleton, Alert } from "@mui/material";

// Lazy-load x-charts to avoid crashing on version/prop issues
const LineChart = React.lazy(() => import("@mui/x-charts/LineChart").then(m => ({ default: m.LineChart })));
const BarChart  = React.lazy(() => import("@mui/x-charts/BarChart").then(m => ({ default: m.BarChart })));

type DailyEntryRow = Database["public"]["Tables"]["daily_entries"]["Row"];

interface ProjectOption {
  project_id: string;
  projects: { name: string | null; logo_url: string | null } | null;
}
interface DashboardMetrics {
  project_id: string;
  name: string | null;
  active_valuation: number | null;
  active_work_hours_until_completion: number | null;
  implied_hour_value: number | null;
}

/** Local error boundary to capture render errors in this page only */
class DashboardBoundary extends React.Component<React.PropsWithChildren, { err: any }> {
  state = { err: null as any };
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any, info: any) {
    // Minimal console detail so you can see the root cause quickly
    // eslint-disable-next-line no-console
    console.error("[Dashboard render error]", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <Container maxWidth="md" className="py-8">
          <Alert severity="error" sx={{ mb: 2 }}>
            Dashboard failed to render. Check console for details.
          </Alert>
          <Button tone="outline" onClick={() => this.setState({ err: null })}>Retry</Button>
        </Container>
      );
    }
    return this.props.children;
  }
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

  // --- Load user projects
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from("project_members")
        .select("project_id, projects(name, logo_url)")
        .eq("user_id", user.id);

      if (error) {
        console.error("[projects load error]", error);
        setProjects([]);
      } else {
        const list = (data ?? []) as ProjectOption[];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(prev => prev || list[0].project_id);
      }
      setLoadingProjects(false);
    })();
  }, [user]);

  // --- Load metrics for selected project (guard view existence)
  useEffect(() => {
    if (!selectedProjectId) return;
    (async () => {
      setLoadingMetrics(true);
      const { data, error } = await supabase
        .from("project_dashboard")
        .select("project_id, name, active_valuation, active_work_hours_until_completion, implied_hour_value")
        .eq("project_id", selectedProjectId)
        .maybeSingle();

      if (error) {
        // If the view/table doesn’t exist or RLS blocks, just log and continue.
        console.warn("[project_dashboard error]", error);
        setMetrics(null);
      } else {
        setMetrics((data as DashboardMetrics) || null);
      }
      setLoadingMetrics(false);
    })();
  }, [selectedProjectId]);

  // --- Load entries, build series
  const fetchEntries = useCallback(async () => {
    if (!user || !selectedProjectId) return;
    setLoadingEntries(true);

    let query = supabase
      .from("daily_entries")
      .select("id, entry_date, created_by, project_id, hours_worked, hours_wasted, completed, plan_to_complete, inserted_at")
      .eq("project_id", selectedProjectId)
      .order("entry_date", { ascending: false })
      .limit(60);

    if (view === "impact") query = query.eq("created_by", user.id);

    const { data, error } = await query;
    if (error) {
      console.error("[entries load error]", error);
      setEntries([]);
      setHoursSeries([]);
      setLoadingEntries(false);
      return;
    }

    const list = (data ?? []) as DailyEntryRow[];

    // reduce to the 5 most recent for the list view
    setEntries(list.slice(0, 5));

    // aggregate last 7 days for chart
    const agg = new Map<string, { my: number; team: number }>();
    list.forEach((row) => {
      const date = row.entry_date;
      if (!date) return;
      if (!agg.has(date)) agg.set(date, { my: 0, team: 0 });
      const bucket = agg.get(date)!;
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
  }, [user, selectedProjectId, view]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // --- Load equity + totals used in KPI cards
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
      if (!cancelled) setEquityPct(pct);

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
    return () => { cancelled = true; };
  }, [user, selectedProjectId]);

  // --- Derived stats (all guarded)
  const implied = Number(metrics?.implied_hour_value || 0);
  const equityFraction = Number((equityPct ?? 0) / 100);
  const sweatEquityEarnedValue = Number(totalUserHours || 0) * implied * equityFraction;
  const potentialEquityValue   = Number(metrics?.active_valuation || 0) * equityFraction;
  const myContributionPct = (totalTeamHours && totalTeamHours > 0)
    ? (100 * Number(totalUserHours || 0)) / Number(totalTeamHours || 0)
    : 0;

  const projectName = useMemo(() => {
    const p = projects.find((x) => x.project_id === selectedProjectId);
    return p?.projects?.name || "–";
  }, [projects, selectedProjectId]);

  const cards = useMemo(() => {
    return [
      {
        label: "Sweat Equity Earned",
        value:
          totalUserHours == null || equityPct == null
            ? "—"
            : "$" + Math.round(sweatEquityEarnedValue).toLocaleString(),
        helper:
          totalUserHours == null
            ? ""
            : `${(totalUserHours || 0)}h × $${implied.toLocaleString(undefined, { maximumFractionDigits: 2 })} × ${(equityPct || 0)}%`,
        loading: loadingPrimary || loadingMetrics,
      },
      {
        label: `Completed Project Equity (${equityPct ?? 0}%)`,
        value:
          equityPct == null || metrics?.active_valuation == null
            ? "—"
            : "$" + Math.round(potentialEquityValue).toLocaleString(),
        helper: metrics?.active_valuation == null ? "" : `$${(metrics.active_valuation || 0).toLocaleString()} × ${(equityPct || 0)}%`,
        loading: loadingPrimary || loadingMetrics,
      },
      {
        label: "Implied $/Hour",
        value:
          metrics?.implied_hour_value == null
            ? "—"
            : "$" + (metrics.implied_hour_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
        helper: "",
        loading: loadingMetrics,
      },
      {
        label: "My Total Hours",
        value:
          totalUserHours == null
            ? "—"
            : (totalUserHours || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "h",
        helper: "",
        loading: loadingPrimary,
      },
      {
        label: "My Contribution",
        value:
          totalTeamHours == null
            ? "—"
            : myContributionPct.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%",
        helper:
          totalTeamHours == null ? "" : `${(totalUserHours || 0)}h of ${(totalTeamHours || 0)}h`,
        loading: loadingPrimary,
      },
    ];
  }, [
    totalUserHours, totalTeamHours, sweatEquityEarnedValue, potentialEquityValue,
    metrics, equityPct, implied, myContributionPct, loadingPrimary, loadingMetrics
  ]);

  return (
    <DashboardBoundary>
      <Container maxWidth="lg">
        {/* Top controls */}
        <Card className="mb-5">
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Typography variant="h5" fontWeight={800} className="tracking-tight">
                  Dashboard
                </Typography>
                <Typography variant="body2" className="text-[color:var(--muted)] mt-0.5">
                  Track your time, reduce waste, and grow sweat equity.
                </Typography>
              </Grid>
              <Grid item xs={12} md="auto">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button tone="subtle" onClick={() => setView(v => v === "impact" ? "team" : "impact")}>
                    {view === "impact" ? "My Impact" : "Team Progress"}
                  </Button>

                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="proj-label">Project</InputLabel>
                    <Select
                      labelId="proj-label"
                      label="Project"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value as string)}
                      disabled={loadingProjects}
                    >
                      {loadingProjects ? (
                        <MenuItem value=""><span className="opacity-60">Loading…</span></MenuItem>
                      ) : (
                        projects.map((p) => (
                          <MenuItem key={p.project_id} value={p.project_id}>
                            {p.projects?.name ?? "(unnamed)"}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>

                  <Button tone="subtle" onClick={() => navigate("/settings")}>Settings</Button>
                  <Button tone="primary" onClick={() => navigate("/checkin")}>New Check-In</Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>


        {/* KPI cards (use integer column sizes only) */}
        <Grid container spacing={2} className="mb-2">
          {cards.map((c) => (
            <Grid key={c.label} item xs={12} sm={6} md={4} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="overline" className="text-[color:var(--muted)]">
                    {c.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} className="leading-tight">
                    {c.loading ? "—" : c.value}
                  </Typography>
                  {!!c.helper && !c.loading && (
                    <Typography variant="caption" className="text-[color:var(--muted)]">
                      {c.helper}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>


        {/* Charts — fully guarded & lazy-loaded */}
        <Grid container spacing={2} className="mb-2">
          <Grid item xs={12} lg={7}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {view === "impact" ? "My Hours (Last 7 Days)" : "Team Hours (Last 7 Days)"}
                </Typography>
                {loadingEntries ? (
                  <Skeleton variant="rounded" height={260} />
                ) : hoursSeries.length === 0 ? (
                  <Box className="h-[260px] grid place-items-center text-white/60">No data.</Box>
                ) : (
                  <Suspense fallback={<Skeleton variant="rounded" height={260} />}>
                    <LineChart
                      height={260}
                      series={[{
                        data: hoursSeries.map((d) => (view === "impact" ? d.my : d.team)),
                        label: "Hours",
                        area: true,
                        curve: "monotoneX",
                        // avoid slotProps differences causing crashes by keeping props minimal
                      }]}
                      xAxis={[{ scaleType: "point", data: hoursSeries.map((d) => d.date.slice(5)) }]}
                      margin={{ left: 50, right: 10, top: 30, bottom: 30 }}
                    />
                  </Suspense>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={5}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>Hours Distribution (Last 7 Days)</Typography>
                {loadingEntries ? (
                  <Skeleton variant="rounded" height={260} />
                ) : hoursSeries.length === 0 ? (
                  <Box className="h-[260px] grid place-items-center text-white/60">No data.</Box>
                ) : (
                  <Suspense fallback={<Skeleton variant="rounded" height={260} />}>
                    <BarChart
                      height={260}
                      series={[
                        { data: hoursSeries.map((d) => d.my), label: "My" },
                        { data: hoursSeries.map((d) => d.team - d.my), label: "Others", stack: "a" },
                      ]}
                      xAxis={[{ scaleType: "band", data: hoursSeries.map((d) => d.date.slice(5)) }]}
                      margin={{ left: 40, right: 10, top: 30, bottom: 30 }}
                    />
                  </Suspense>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent entries */}
        <Card className="mb-6">
          <CardContent>
            <Grid container alignItems="flex-end" justifyContent="space-between" spacing={2}>
              <Grid item>
                <Typography variant="h6">{view === "impact" ? "My Check-In History" : "Team Check-In History"}</Typography>
                <Typography variant="caption" color="text.secondary">Showing the five most recent daily entries.</Typography>
              </Grid>
              <Grid item>
                <Stack direction="row" spacing={1}>
                  <Button tone="outline" onClick={() => navigate("/checkin")}>New Check-In</Button>
                  <Button tone="primary" onClick={() => navigate("/checkins")}>View More</Button>
                </Stack>
              </Grid>
            </Grid>

            <Box mt={2}>
              {loadingEntries ? (
                <Stack spacing={1.5}>{[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rounded" height={56} />))}</Stack>
              ) : entries.length === 0 ? (
                <Box className="py-6 text-center text-white/70">No entries found.</Box>
              ) : (
                <Stack spacing={1.5}>
                  {entries.map((entry) => (
                    <Card variant="outlined" className="border-[rgb(var(--border))]">
                      <CardContent className="!py-3 !px-4">
                        <Stack direction="row" spacing={12} className="items-start">
                          <div className="grid h-9 w-9 place-items-center rounded-[12px] bg-white/10 text-sm font-semibold shrink-0">
                            {(entry.created_by || "U").slice(0,1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Typography className="truncate" fontWeight={600}>
                              {entry.created_by === user?.id ? "You" : entry.created_by}
                            </Typography>
                            <Typography variant="body2" className="mt-1.5 whitespace-pre-line text-[color:var(--text)]">
                              {entry.completed || "(no summary)"}
                            </Typography>
                          </div>
                        </Stack>
                      </CardContent>
                    </Card>

                  ))}
                </Stack>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </DashboardBoundary>
  );
};

export default Dashboard;
