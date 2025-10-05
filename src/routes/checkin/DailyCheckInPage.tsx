import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Box, Button, TextField, Typography, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Skeleton } from '@mui/material';
import { useAuth } from '../../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { fetchUserProjects } from '../../lib/projectHelpers'; // <-- import the helper


interface UserProjects {
  id: string;
  name: string;
}

const DailyCheckInPage: React.FC = () => {
  const [projects, setProjects] = useState<UserProjects[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [completed, setCompleted] = useState('');
  const [hoursWasted, setHoursWasted] = useState('');
  const [planToComplete, setPlanToComplete] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [moneyMade, setMoneyMade] = useState<number>(0);
  const [moneyLost, setMoneyLost] = useState<number>(0);
  const [recentCheckin, setRecentCheckin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectsAndCheckin = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const userProjects = await fetchUserProjects(user.id);
      setProjects(userProjects);

      if (userProjects && userProjects.length > 0) {
        const projectId = userProjects[0].id ?? '';
        setSelectedProjectId(projectId);
        const { data: recentEntries } = await supabase
          .from('daily_entries')
          .select('entry_date')
          .eq('created_by', user.id)
          .eq('project_id', projectId)
          .order('entry_date', { ascending: false })
          .limit(1);

        if (
          recentEntries &&
          recentEntries.length > 0 &&
          recentEntries[0].entry_date
        ) {
          const lastCheckin = new Date(recentEntries[0].entry_date).getTime();
          const now = Date.now();
          const hoursSince = (now - lastCheckin) / (1000 * 60 * 60);
          setRecentCheckin(hoursSince < 10);
        }
      }
      setInitialLoading(false); // <-- done loading
    };
    fetchProjectsAndCheckin();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    if (recentCheckin) {
      alert('You have already submitted a report within the last 10 hours.');
      setLoading(false);
      return;
    }

    if (!selectedProjectId) {
      alert('Please select a project.');
      setLoading(false);
      return;
    }

    const entryDate = new Date().toISOString().slice(0, 10);

    // Find implied_hour_value for selected project
    // Find implied_hour_value for selected project from project_dashboard view
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('project_dashboard')
      .select('implied_hour_value, active_work_hours_until_completion, active_valuation')
      .eq('project_id', selectedProjectId)
      .single();

    const project = dashboardData;
    let impliedHourValue = project?.implied_hour_value;

    // Fallback calculation if implied_hour_value is not present
    if (impliedHourValue === undefined && project) {
      const totalPlannedHours = project.active_work_hours_until_completion ?? 1;
      impliedHourValue = totalPlannedHours > 0 ? (project.active_valuation ?? 0) / totalPlannedHours : 0;
    }

    const worked = Number(hoursWorked) || 0;
    const wasted = Number(hoursWasted) || 0;
    const made = worked * (impliedHourValue ?? 0);
    const lost = wasted * (impliedHourValue ?? 0);

    const { error } = await supabase
      .from('daily_entries')
      .insert([{
        project_id: selectedProjectId,
        entry_date: entryDate,
        hours_worked: worked,
        completed,
        hours_wasted: wasted,
        plan_to_complete: planToComplete,
        created_by: user.id,
      }]);

    setLoading(false);
    if (!error) {
      setMoneyMade(made);
      setMoneyLost(lost);
      setShowModal(true);
      setSuccess(true);
    }
    if (error) {
      console.error('Supabase insert error:', error);
    }
  };

  const handleContinue = () => {
    setShowModal(false);
    navigate('/dashboard');
  };

  // Add a loading skeleton for the form
  if (initialLoading) {
    return (
      <Box sx={{ padding: 2, maxWidth: 700, mx: 'auto' }}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
          <Typography variant="h4">Daily Check In</Typography>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 2 }} />
          </Box>
        </Box>
        <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2, maxWidth: 700, mx: 'auto' }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
        <Typography variant="h4">Daily Check In</Typography>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outlined"
          >
            Dashboard
          </Button>
        </Box>
      </Box>
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
        <Select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value as string)}
          fullWidth
          sx={{ mb: 2 }}
          displayEmpty
          inputProps={{ 'aria-label': 'Project' }}
          renderValue={selected => {
            if (!selected) {
              return <span style={{ color: '#888' }}>Select a project</span>;
            }
            const project = projects.find(p => p.id === selected);
            return project ? project.name : '';
          }}
          disabled={recentCheckin}
        >
          {projects.map(project => (
            <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Project: Choose which project this check-in is for.
        </Typography>
        <TextField
          label="How many hours did you work yesterday?"
          type="number"
          value={hoursWorked}
          onChange={e => setHoursWorked(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          disabled={recentCheckin}
        />
        <TextField
          label="What did you achieve during that time?"
          value={completed}
          onChange={e => setCompleted(e.target.value)}
          fullWidth
          multiline
          required
          sx={{ mb: 2 }}
          disabled={recentCheckin}
        />
        <TextField
          label="How many hours did you waste yesterday?"
          type="number"
          value={hoursWasted}
          onChange={e => setHoursWasted(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          disabled={recentCheckin}
        />
        <TextField
          label="What are you going to do today?"
          value={planToComplete}
          onChange={e => setPlanToComplete(e.target.value)}
          fullWidth
          multiline
          required
          sx={{ mb: 2 }}
          disabled={recentCheckin}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || recentCheckin}
          sx={{ mb: 2 }}
        >
          {recentCheckin ? 'Already Submitted Recently' : loading ? 'Submitting...' : 'Submit'}
        </Button>
        {success && <Typography sx={{ mt: 2 }} color="success.main">Check-in saved!</Typography>}

        <Dialog open={showModal} onClose={handleContinue}>
          <DialogTitle>Daily Earnings Breakdown</DialogTitle>
          <DialogContent>
            <Typography>
              <strong>Money Made:</strong> ${moneyMade.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
            <Typography>
              <strong>Money Lost:</strong> ${moneyLost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
            <Typography sx={{ mt: 2 }}>
              Based on your check-in, this is your sweat equity breakdown for yesterday.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleContinue} variant="contained">Continue to Dashboard</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default DailyCheckInPage;