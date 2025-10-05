import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Divider,
  Paper,
  IconButton,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Select,
  MenuItem,
  Chip,
  Grid,
  useMediaQuery,
  Button,
  Tooltip,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import type { Database } from '../../types/supabase';

// Install (if not yet): npm i @mui/x-charts
import { LineChart, BarChart } from '@mui/x-charts';

type DailyEntryRow = Database['public']['Tables']['daily_entries']['Row'];

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [view, setView] = useState<'impact' | 'team'>('impact');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
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
        .from('project_members')
        .select('project_id, projects(name, logo_url)')
        .eq('user_id', user.id);
      if (!error) {
        setProjects(data ?? []);
        if (data && data.length > 0) setSelectedProjectId(prev => prev || data[0].project_id);
      }
      setLoadingProjects(false);
    })();
  }, [user]);

  // Fetch metrics from project_dashboard (single row per project)
  useEffect(() => {
    if (!selectedProjectId) return;
    (async () => {
      setLoadingMetrics(true);
      const { data, error } = await supabase
        .from('project_dashboard')
        .select('project_id, name, active_valuation, active_work_hours_until_completion, implied_hour_value')
        .eq('project_id', selectedProjectId)
        .single();
      if (!error) setMetrics(data as DashboardMetrics);
      setLoadingMetrics(false);
    })();
  }, [selectedProjectId]);

  // Fetch daily entries (source: daily_entries table)
  const fetchEntries = useCallback(async () => {
    if (!user || !selectedProjectId) return;
    setLoadingEntries(true);
    let query = supabase
      .from('daily_entries')
      .select(
        'id, entry_date, created_by, project_id, hours_worked, hours_wasted, completed, plan_to_complete, inserted_at'
      )
      .eq('project_id', selectedProjectId)
      .order('entry_date', { ascending: false })
      .limit(50);
    if (view === 'impact') query = query.eq('created_by', user.id);
    const { data, error } = await query;
    if (!error) {
      const list = (data ?? []) as DailyEntryRow[];
      setEntries(list.slice(0, 5));
      const agg = new Map<string, { my: number; team: number }>();
      list.forEach(row => {
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
    }
    setLoadingEntries(false);
  }, [user, selectedProjectId, view, supabase]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Fetch member equity % and hours aggregates
  useEffect(() => {
    if (!user || !selectedProjectId) return;
    let cancelled = false;
    (async () => {
      setLoadingPrimary(true);

      // Fetch user's equity percentage
      const { data: memberRow } = await supabase
        .from('project_members')
        .select('equity')
        .eq('project_id', selectedProjectId)
        .eq('user_id', user.id)
        .maybeSingle();
      const pct = memberRow?.equity ?? null;
      if (!cancelled) setEquityPct(pct);

      // Fetch all hours for project (user + team)
      const { data: hoursRows } = await supabase
        .from('daily_entries')
        .select('created_by, hours_worked')
        .eq('project_id', selectedProjectId);

      let userHours = 0;
      let teamHours = 0;
      (hoursRows ?? []).forEach(r => {
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

  const valuationFmt = (v?: number | null) =>
    v == null ? '—' : '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const hoursFmt = (v?: number | null) =>
    v == null ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Helper calculations
  const implied = metrics?.implied_hour_value ?? 0;
  const equityFraction = (equityPct ?? 0) / 100;

  const sweatEquityEarnedValue = (totalUserHours ?? 0) * implied * equityFraction;
  const potentialEquityValue = (metrics?.active_valuation ?? 0) * equityFraction;
  const myContributionPct =
    totalTeamHours && totalTeamHours > 0
      ? (100 * (totalUserHours ?? 0)) / totalTeamHours
      : 0;

  const cards = useMemo(
    () => [
      {
        label: 'Sweat Equity Earned',
        value:
          totalUserHours == null || equityPct == null
            ? '—'
            : '$' +
              sweatEquityEarnedValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }),
        loading: loadingPrimary || loadingMetrics,
        helper: totalUserHours == null ? '' : `${totalUserHours}h × $${implied.toLocaleString(undefined,{maximumFractionDigits:2})} × ${(equityPct||0)}%`,
      },
      {
        label: `Completed Project Equity (${equityPct ?? 0}%)`,
        value:
          equityPct == null || metrics?.active_valuation == null
            ? '—'
            : '$' +
              potentialEquityValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }),
        loading: loadingPrimary || loadingMetrics,
        helper: metrics?.active_valuation == null ? '' : `$${(metrics.active_valuation).toLocaleString()} × ${(equityPct||0)}%`,
      },
      {
        label: 'Implied $/Hour',
        value:
          metrics?.implied_hour_value == null
            ? '—'
            : '$' +
              metrics.implied_hour_value.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
        loading: loadingMetrics,
        helper: '',
      },
      {
        label: 'My Total Hours',
        value:
          totalUserHours == null
            ? '—'
            : totalUserHours.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              }) + 'h',
        loading: loadingPrimary,
        helper: '',
      },
      {
        label: 'My Contribution',
        value:
          totalTeamHours == null
            ? '—'
            : myContributionPct.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              }) + '%',
        loading: loadingPrimary,
        helper:
          totalTeamHours == null
            ? ''
            : `${(totalUserHours ?? 0)}h of ${totalTeamHours}h`,
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
    setView(v => (v === 'impact' ? 'team' : 'impact'));
  }, []);

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
      <Paper
        elevation={3}
        sx={{
          p: isMobile ? 2 : 3,
          mb: 3,
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
              Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip
                title={view === 'impact' ? 'Showing My Impact – click to view Team Progress' : 'Showing Team Progress – click to view My Impact'}
                arrow
              >
                <IconButton
                  onClick={toggleView}
                  size="small"
                  aria-label={view === 'impact' ? 'Switch to Team Progress' : 'Switch to My Impact'}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.selected' },
                    ...(view === 'team' && {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }),
                  }}
                >
                  {view === 'impact' ? <PersonIcon fontSize="small" /> : <GroupIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            {loadingProjects ? (
              <Skeleton variant="rectangular" width={140} height={20} sx={{ borderRadius: 2 }} />
            ) : (
              <Select
                size={isMobile ? 'small' : 'medium'}
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value as string)}
                displayEmpty
                sx={{ minWidth: isMobile ? 140 : 200, height: 40 }}
                IconComponent={ArrowDropDownIcon}
              >
                {projects.map(p => (
                  <MenuItem key={p.project_id} value={p.project_id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={p.projects.logo_url || undefined}
                        sx={{ width: 24, height: 24 }}
                      >
                        {p.projects.name?.[0] ?? '?'}
                      </Avatar>
                      <span>{p.projects.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            )}
            <Tooltip
                title={'Configure Settings'}
                arrow
              >
                <IconButton
                color="primary"
                onClick={() => navigate('/settings')}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
                aria-label="Settings"
              >
                <SettingsIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
            <Tooltip
                title={'Log a new Daily Check-In'}
                arrow
              >
              <IconButton
                onClick={() => navigate('/checkin')}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  color:'rgb(0 0 0 / 87%)',
                  '&:hover': { bgcolor: 'action.selected', },
                }}
                aria-label="New Check-In"
              >
                <CheckCircleIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map(c => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={c.label}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: 'text.secondary',
                  letterSpacing: 0.5,
                  mb: 0.5,
                }}
              >
                {c.label}
              </Typography>
              {c.loading ? (
                <Skeleton variant="text" width="70%" />
              ) : (
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, lineHeight: 1.2 }}
                >
                  {c.value}
                </Typography>
              )}
              {!c.loading && c.helper && (
                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, color: 'text.disabled', lineHeight: 1.2 }}
                >
                  {c.helper}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Hours Trend */}
        <Grid item xs={12} md={7}>
            <Paper elevation={3} sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {view === 'impact' ? 'My Hours (Last 7 Days)' : 'Team Hours (Last 7 Days)'}
              </Typography>
              {loadingEntries ? (
                <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
              ) : hoursSeries.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 8 }} align="center">
                  No data.
                </Typography>
              ) : (
                <LineChart
                  height={260}
                  series={[
                    {
                      data: hoursSeries.map(d => (view === 'impact' ? d.my : d.team)),
                      label: 'Hours',
                      area: true,
                      curve: 'monotoneX',
                      color: view === 'impact' ? '#1976d2' : '#9c27b0',
                    },
                  ]}
                  xAxis={[
                    {
                      scaleType: 'point',
                      data: hoursSeries.map(d => d.date.slice(5)),
                    },
                  ]}
                  margin={{ left: 50, right: 10, top: 30, bottom: 30 }}
                />
              )}
            </Paper>
        </Grid>

        {/* Distribution */}
        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Hours Distribution (Last 7 Days)
            </Typography>
            {loadingEntries ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : hoursSeries.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 8 }} align="center">
                No data.
              </Typography>
            ) : (
              <BarChart
                height={260}
                series={[
                  { data: hoursSeries.map(d => d.my), label: 'My', color: '#1976d2' },
                  { data: hoursSeries.map(d => d.team - d.my), label: 'Others', color: '#ff9800', stack: 'a' },
                ]}
                xAxis={[
                  {
                    scaleType: 'band',
                    data: hoursSeries.map(d => d.date.slice(5)),
                  },
                ]}
                margin={{ left: 40, right: 10, top: 30, bottom: 30 }}
                slotProps={{ legend: { hidden: isMobile } }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 6 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {view === 'impact' ? 'My Checkin History' : 'Team Checkin History'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
            >
              Showing the five most recent daily entries.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/checkin')}
            >
              New Check-In
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => navigate('/checkins')}
            >
              View More
            </Button>
          </Box>
        </Box>

        {loadingEntries ? (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
            ))}
          </Box>
        ) : entries.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No entries found.
          </Typography>
        ) : (
          <List>
            {entries.map(entry => (
              <Paper key={entry.id} elevation={1} sx={{ mb: 1.5, borderRadius: 2 }}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>
                      {(entry.created_by || 'U').slice(0, 1).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {entry.created_by === user?.id ? 'You' : entry.created_by}
                        </Typography>
                        <Chip
                          label={`${entry.hours_worked ?? 0}h`}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 600 }}
                        />
                        {entry.hours_wasted ? (
                          <Chip
                            label={`Lost ${entry.hours_wasted}h`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ) : null}
                        <Typography variant="caption" color="text.secondary">
                          {entry.entry_date}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>
                        {entry.completed || '(no summary)'}
                      </Typography>
                    }
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;