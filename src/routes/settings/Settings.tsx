import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem } from '@mui/material';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { fetchOwnedProjects } from '../../lib/projectHelpers';
import { useNavigate } from 'react-router-dom';

type ProjectDetails = {
  id: string;
  name: string;
  target_valuation?: number;
  weeks_to_goal?: number;
  logo_url?: string;
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProjectDetails | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const getProjects = async () => {
      if (!user) return;
      const projects = await fetchOwnedProjects(user.id);
      setProjects(projects);
      if (projects.length > 0) setSelectedProjectId(projects[0].id);
    };
    getProjects();
  }, [user]);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      // Only fetch if selectedProjectId is valid and exists in projects
      if (!selectedProjectId || !projects.find(p => p.id === selectedProjectId)) {
        setProjectDetails(null);
        return;
      }
      const { data } = await supabase
        .from('projects')
        .select('id, name, logo_url, planned_hours_per_week, target_valuation, weeks_to_goal')
        .eq('id', selectedProjectId)
        .single();
      setProjectDetails({...data} as ProjectDetails);
      setForm(data ?? null);
    };
    fetchProjectDetails();
  }, [selectedProjectId, editMode, projects]);

  const handleEdit = () => {
    setEditMode(true);
    setForm(projectDetails);
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm(projectDetails);
  };

  const handleChange = (field: keyof ProjectDetails, value: any) => {
    setForm(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({
        name: form.name,
        planned_hours_per_week: form.planned_hours_per_week,
        target_valuation: form.target_valuation,
        weeks_to_goal: form.weeks_to_goal,
      })
      .eq('id', form.id);
    setSaving(false);
    setEditMode(false);
    // Refresh details
    setProjectDetails(form);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
        <Typography variant="h4">Project Settings</Typography>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outlined"
          >
            Dashboard
          </Button>
        </Box>
      </Box>
      <Select
        value={selectedProjectId}
        onChange={e => setSelectedProjectId(e.target.value as string)}
        sx={{
          minWidth: 180,
          height: '40px',
          mb: 2,
          '& .MuiSelect-select': {
            paddingTop: '10px',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            height: '40px',
          }
        }}
        displayEmpty
        inputProps={{ 'aria-label': 'Project' }}
        renderValue={selected => {
          if (!selected) {
            return <span style={{ color: '#888' }}>Select a project</span>;
          }
          const project = projects.find(p => p.id === selected);
          return project ? project.name : '';
        }}
      >
        {projects.map(project => (
          <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
        ))}
      </Select>

      {projectDetails && !editMode && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle1"><strong>Name:</strong> {projectDetails.name}</Typography>
          <Typography variant="body2"><strong>Target Valuation:</strong> {projectDetails.target_valuation ?? '-'}</Typography>
          <Typography variant="body2"><strong>Weeks to Goal:</strong> {projectDetails.weeks_to_goal ?? '-'}</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={handleEdit}>Edit</Button>
        </Box>
      )}

      {projectDetails && editMode && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <TextField
            label="Name"
            value={form?.name ?? ''}
            onChange={e => handleChange('name', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Planned Hours/Week"
            type="number"
            value={form?.planned_hours_per_week ?? ''}
            onChange={e => handleChange('planned_hours_per_week', Number(e.target.value))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Target Valuation"
            type="number"
            value={form?.target_valuation ?? ''}
            onChange={e => handleChange('target_valuation', Number(e.target.value))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Weeks to Goal"
            type="number"
            value={form?.weeks_to_goal ?? ''}
            onChange={e => handleChange('weeks_to_goal', Number(e.target.value))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Implied Hour Value:</strong>{' '}
            {form?.target_valuation && form?.planned_hours_per_week && form?.weeks_to_goal
              ? ((form.target_valuation) / (form.planned_hours_per_week * form.weeks_to_goal)).toFixed(2)
              : '-'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outlined" onClick={handleCancel}>Cancel</Button>
          </Box>
        </Box>
      )}

      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>User Settings</Typography>
      <Box>
        <Typography>Signed in as {user.email}</Typography>
        <Button onClick={signOut} variant="outlined" color="error" sx={{ mt: 2 }}>Sign Out</Button>
      </Box>
    </Box>
  );
};

export default Settings;