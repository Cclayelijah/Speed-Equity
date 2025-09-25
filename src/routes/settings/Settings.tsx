import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem, Alert } from '@mui/material';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { fetchOwnedProjects } from '../../lib/projectHelpers';
import { useNavigate } from 'react-router-dom';

type ProjectDetails = {
  id: string;
  name: string;
  target_valuation?: number;
  work_hours_until_completion?: number;
  logo_url?: string;
  owner_id?: string;
};

function useUpsertProjectProjection(project_id: string) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upsert = async (work_hours_until_completion: number) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('project_projections')
      .upsert([
        {
          project_id,
          work_hours_until_completion,
          effective_from: new Date().toISOString().slice(0, 10), // today
        }
      ]);
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('rls')) {
        setError('Only the project owner can change projections.');
      } else {
        setError(error.message);
      }
      return false;
    }
    return true;
  };

  return { upsert, error, loading };
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProjectDetails | null>(null);
  const [saving, setSaving] = useState(false);

  // New state for projection form
  const [projectionForm, setProjectionForm] = useState<number>(0);

  // Check if user is owner
  const isOwner = projectDetails && user && projectDetails.owner_id === user.id;

  // Upsert hook
  const { upsert, error: projectionError, loading: projectionLoading } = useUpsertProjectProjection(selectedProjectId);

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
        .select('id, name, logo_url, target_valuation, work_hours_until_completion, owner_id')
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
        target_valuation: form.target_valuation,
        work_hours_until_completion: form.work_hours_until_completion,
      })
      .eq('id', form.id);
    setSaving(false);
    setEditMode(false);
    // Refresh details
    setProjectDetails(form);
  };

  const handleProjectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await upsert(projectionForm);
    if (success) {
      setEditMode(false);
      setProjectionForm(0);
    }
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
          <Typography variant="body2"><strong>Work Hours Until Completion:</strong> {projectDetails.work_hours_until_completion ?? '-'}</Typography>
          {isOwner && (
            <Button sx={{ mt: 2 }} variant="contained" onClick={handleEdit}>Edit Projection</Button>
          )}
        </Box>
      )}

      {projectDetails && editMode && isOwner && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <form onSubmit={handleProjectionSubmit}>
            <TextField
              label="Work Hours Until Completion"
              type="number"
              value={form?.work_hours_until_completion ?? ''}
              onChange={e => handleChange('work_hours_until_completion', Number(e.target.value))}
              fullWidth
              sx={{ mb: 2 }}
            />
            {projectionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {projectionError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary" type="submit" disabled={projectionLoading}>
                {projectionLoading ? 'Saving...' : 'Save Projection'}
              </Button>
              <Button variant="outlined" onClick={handleCancel}>Cancel</Button>
            </Box>
          </form>
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