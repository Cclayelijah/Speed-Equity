import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Divider,
  Paper,
  IconButton,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<'impact' | 'team'>('impact');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Fetch projects for dropdown
  useEffect(() => {
    console.log(user.id)
    async function fetchProjects() {
      setLoadingProjects(true);
      const { data } = await supabase
        .from('project_members')
        .select('project_id, projects(name, logo_url)')
        .eq('user_id', user.id);
      setProjects(data ?? []);
      if (data && data.length > 0) setSelectedProjectId(data[0].project_id);
      setLoadingProjects(false);
    }
    if (user) fetchProjects();
  }, [user]);

  // Fetch daily entries for selected project
  useEffect(() => {
    async function fetchEntries() {
      setLoadingEntries(true);
      if (!selectedProjectId) {
        setEntries([]);
        setLoadingEntries(false);
        return;
      }
      let query = supabase
        .from('daily_entries')
        .select('id, entry_date, user_id, users(full_name, avatar_url), hours, notes')
        .eq('project_id', selectedProjectId)
        .order('entry_date', { ascending: false })
        .limit(20); // get more, filter below

      if (view === 'impact') {
        query = query.eq('user_id', user.id);
      }
      const { data } = await query;
      // Only last 5 days
      const last5 = (data ?? []).slice(0, 5);
      setEntries(last5);
      setLoadingEntries(false);
    }
    if (user && selectedProjectId) fetchEntries();
  }, [user, selectedProjectId, view]);

  // Navigation section
  return (
    <Box sx={{ padding: 2, maxWidth: 1200, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: 'background.paper', boxShadow: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Left: Page name & toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mr: 2 }}>
              Dashboard
            </Typography>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, v) => v && setView(v)}
              sx={{ bgcolor: 'background.default', borderRadius: 2, boxShadow: 1 }}
            >
              <ToggleButton value="impact" sx={{ px: 3, fontWeight: 600 }}>
                My Impact
              </ToggleButton>
              <ToggleButton value="team" sx={{ px: 3, fontWeight: 600 }}>
                Team Progress
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {/* Right: Projects dropdown, links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {loadingProjects ? (
              <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 2 }} />
            ) : (
              <Select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value as string)}
                displayEmpty
                sx={{ minWidth: 120, bgcolor: 'background.default', borderRadius: 2, fontWeight: 600 }}
                IconComponent={ArrowDropDownIcon}
              >
                {projects.map(p => (
                  <MenuItem key={p.project_id} value={p.project_id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={p.projects.logo_url} sx={{ width: 24, height: 24 }}>{p.projects.name?.[0] ?? '?'}</Avatar>
                      <span>{p.projects.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            )}
            <IconButton color="primary" onClick={() => navigate('/settings')}>
              <SettingsIcon />
            </IconButton>
            <IconButton color="success" onClick={() => navigate('/checkin')}>
              <CheckCircleIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Entries Section */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', boxShadow: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          {view === 'impact' ? 'Your Last 5 Daily Entries' : "Team's Last 5 Daily Entries"}
        </Typography>
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
              <Paper key={entry.id} elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar src={entry.users?.avatar_url}>
                      {entry.users?.full_name?.[0] ?? '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {entry.users?.full_name ?? 'You'}
                        </Typography>
                        <Chip
                          label={`${entry.hours} hrs`}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                    secondary={entry.notes}
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