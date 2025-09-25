import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Box, Button, TextField, Typography, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAuth } from '../../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

const DailyCheckInPage: React.FC = () => {
  const [projects, setProjects] = useState<{ id: string; name: string; implied_hour_value?: number }[]>([]);
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

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user's projects and implied_hour_value for calculation
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, planned_hours_per_week, target_valuation, weeks_to_goal, implied_hour_value');
      if (data) setProjects(data);
      if (data && data.length > 0) setSelectedProjectId(data[0].id);
    };
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    if (!selectedProjectId) {
      alert('Please select a project.');
      setLoading(false);
      return;
    }

    const entryDate = new Date().toISOString().slice(0, 10);

    // Find implied_hour_value for selected project
    const project = projects.find(p => p.id === selectedProjectId);
    // Fallback calculation if implied_hour_value is not present
    let impliedHourValue = project?.implied_hour_value;
    if (impliedHourValue === undefined && project) {
      const totalPlannedHours = (project.weeks_to_goal ?? 1) * (project.planned_hours_per_week ?? 1);
      impliedHourValue = totalPlannedHours > 0 ? (project.target_valuation ?? 0) / totalPlannedHours : 0;
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

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>Daily Check-In</Typography>
      <Select
        value={selectedProjectId}
        onChange={e => setSelectedProjectId(e.target.value as string)}
        fullWidth
        sx={{ mb: 2 }}
      >
        {projects.map(project => (
          <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
        ))}
      </Select>
      <TextField
        label="How many hours did you work yesterday?"
        type="number"
        value={hoursWorked}
        onChange={e => setHoursWorked(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
      />
      <TextField
        label="What did you achieve during that time?"
        value={completed}
        onChange={e => setCompleted(e.target.value)}
        fullWidth
        multiline
        required
        sx={{ mb: 2 }}
      />
      <TextField
        label="How many hours did you waste yesterday?"
        type="number"
        value={hoursWasted}
        onChange={e => setHoursWasted(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
      />
      <TextField
        label="What are you going to do today?"
        value={planToComplete}
        onChange={e => setPlanToComplete(e.target.value)}
        fullWidth
        multiline
        required
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" fullWidth disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
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
            Based on your check-in, this is your sweat equity breakdown for today.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleContinue} variant="contained">Continue to Dashboard</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyCheckInPage;