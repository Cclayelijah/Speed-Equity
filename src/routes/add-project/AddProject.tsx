import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button, TextField, Typography, Box, Snackbar, Alert } from '@mui/material';
import FileUpload from '../../components/FileUpload';

export async function createProject(input: {
  name: string;
  weeks_to_goal: number;
  target_valuation: number;
  owner_id: string;
}) {
  const { data, error } = await supabase
    .from('projects')
    .insert([input])
    .select()
    .single();

  if (error) {
    // Surface RLS error toast
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: error.message, severity: 'error' }
    }));
    throw error;
  }

  // Refetch project_members for this project
  const { data: members } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', data.id);

  // Confirm owner row exists
  const ownerExists = members?.some(m => m.user_id === input.owner_id);
  if (!ownerExists) {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: 'Owner is not a member of the project!', severity: 'warning' }
    }));
  }

  return data;
}

const AddProject = ({ ownerId }: { ownerId: string }) => {
  const [form, setForm] = useState({
    name: '',
    weeks_to_goal: 1,
    target_valuation: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProject({ ...form, owner_id: ownerId });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Project created!', severity: 'success' }
      }));
    } catch {}
    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Create a New Project</Typography>
      <TextField
        label="Project Name"
        value={form.name}
        onChange={e => handleChange('name', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Weeks to Goal"
        type="number"
        value={form.weeks_to_goal}
        onChange={e => handleChange('weeks_to_goal', Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Target Valuation"
        type="number"
        value={form.target_valuation}
        onChange={e => handleChange('target_valuation', Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" fullWidth disabled={loading}>
        {loading ? 'Creating...' : 'Create Project'}
      </Button>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Project Logo
        </Typography>
        <FileUpload
          label="Upload Logo"
          accept="image/*"
          onUpload={file => handleChange('logo', file)}
        />
      </Box>
    </Box>
  );
};

export default AddProject;