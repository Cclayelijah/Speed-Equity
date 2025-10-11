import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, CheckCircle2, User2, Users2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import type { Database } from "../../types/supabase";
import DashboardReminder from "./DashboardReminder";
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
  IconButton,
} from "@mui/material";
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
      const { data } = await supabase
        .from("project_members")
        .select("project_id, projects(name, logo_url)")
        .eq("user_id", user.id);
      setProjects(data ?? []);
      if (data && data.length > 0) setSelectedProjectId((prev) => prev || data[0].project_id);
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
              sweatEquityEarnedValue.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        helper:
          totalUserHours == null
            ? ""
            : `${totalUserHours}h × $${implied.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })} × ${equityPct || 0}%`,
        loading: loadingPrimary || loadingMetrics,
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
        helper:
          metrics?.active_valuation == null ? "" : `$${metrics.active_valuation.toLocaleString()} × ${equityPct || 0}%`,
        loading: loadingPrimary || loadingMetrics,
      },
      {
        label: "Implied $/Hour",
        value:
          metrics?.implied_hour_value == null
            ? "—"
            : "$" +
              (metrics.implied_hour_value || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
        helper: "",
        loading: loadingMetrics,
      },
      {
        label: "My Total Hours",
        value:
          totalUserHours == null
            ? "—"
            : totalUserHours.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "h",
        helper: "",
        loading: loadingPrimary,
      },
      {
        label: "My Contribution",
        value:
          totalTeamHours == null
            ? "—"
            : myContributionPct.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%",
        helper: totalTeamHours == null ? "" : `${totalUserHours ?? 0}h of ${totalTeamHours}h`,
        loading: loadingPrimary,
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

  return (
    <Container maxWidth="lg" className="px-4 py-6">
      <DashboardReminder />

      <Card className="relative mb-4 overflow-hidden">
        <Box className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md="auto">
              <Chip
                label="Live dashboard"
                variant="outlined"
                className="text-white/80 border-white/20"
              />
            </Grid>
            <Grid item xs>
              <Typography variant="h4" fontWeight={900}>
                Dashboard
              </Typography>
            </Grid>
            <Grid item xs={12} md="auto">
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => setView((v) => (v === "impact" ? "team" : "impact"))}
                  startIcon={view === "impact" ? <User2 size={18} /> : <Users2 size={18} />}
                >
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
                      <MenuItem value="">
                        <Skeleton width={120} />
                      </MenuItem>
                    ) : (
                      projects.map((p) => (
                        <MenuItem key={p.project_id} value={p.project_id}>
                          {p.projects.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  onClick={() => navigate("/settings")}
                  startIcon={<Settings size={18} />}
                >
                  Settings
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate("/checkin")}
                  startIcon={<CheckCircle2 size={18} />}
                >
                  New Check-In
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} className="mb-1">
        {cards.map((c) => (
          <Grid key={c.label} item xs={12} sm={6} lg={2.4 as any}>
            <Card className="relative overflow-hidden">
              <Box className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500/70 via-rose-400/70 to-cyan-400/70" />
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {c.loading ? <Skeleton width={120} /> : c.value}
                </Typography>
                {!c.loading && c.helper && (
                  <Typography variant="caption" color="text.secondary">
                    {c.helper}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Hours Distribution (Last 7 Days)
              </Typography>
              {loadingEntries ? (
                <Skeleton variant="rounded" height={260} />
              ) : hoursSeries.length === 0 ? (
                <Box className="h-[260px] grid place-items-center text-white/60">No data.</Box>
              ) : (
                <BarChart
                  height={260}
                  series={[
                    { data: hoursSeries.map((d) => d.my), label: "My", color: "#22d3ee" },
                    {
                      data: hoursSeries.map((d) => d.team - d.my),
                      label: "Others",
                      color: "#f59e0b",
                      stack: "a",
                    },
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card className="mb-6">
        <CardContent>
          <Grid container alignItems="flex-end" justifyContent="space-between" spacing={2}>
            <Grid item>
              <Typography variant="h6">
                {view === "impact" ? "My Check-In History" : "Team Check-In History"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Showing the five most recent daily entries.
              </Typography>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => navigate("/checkin")}>
                  New Check-In
                </Button>
                <Button variant="contained" onClick={() => navigate("/checkins")}>
                  View More
                </Button>
              </Stack>
            </Grid>
          </Grid>

          <Box mt={2}>
            {loadingEntries ? (
              <Stack spacing={1.5}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={56} />
                ))}
              </Stack>
            ) : entries.length === 0 ? (
              <Box className="py-6 text-center text-white/70">No entries found.</Box>
            ) : (
              <Stack spacing={1.5}>
                {entries.map((entry) => (
                  <Card key={entry.id} variant="outlined">
                    <CardContent className="!py-3 !px-3">
                      <Stack direction="row" spacing={2}>
                        <Box className="grid text-sm font-semibold h-9 w-9 rounded-xl bg-white/10 place-items-center">
                          {(entry.created_by || "U").slice(0, 1).toUpperCase()}
                        </Box>
                        <Box flex={1} minWidth={0}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                            <Typography fontWeight={600}>
                              {entry.created_by === user?.id ? "You" : entry.created_by}
                            </Typography>
                            <Chip size="small" label={`${entry.hours_worked ?? 0}h`} color="info" variant="outlined" />
                            {entry.hours_wasted ? (
                              <Chip
                                size="small"
                                label={`Lost ${entry.hours_wasted}h`}
                                color="warning"
                                variant="outlined"
                              />
                            ) : null}
                            <Typography variant="caption" color="text.secondary">
                              {entry.entry_date}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" className="mt-1.5 whitespace-pre-line">
                            {entry.completed || "(no summary)"}
                          </Typography>
                        </Box>
                        <IconButton size="small" disabled>
                          {/* reserved for future actions */}
                        </IconButton>
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
  );
};

export default Dashboard;