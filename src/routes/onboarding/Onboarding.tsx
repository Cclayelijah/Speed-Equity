import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Button, TextField, Typography, Box } from '@mui/material';
import FileUpload from '../../components/FileUpload';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';

const schema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  plannedHoursPerWeek: z.number().min(0, 'Planned hours must be at least 0'),
  weeksToGoal: z.number().min(1, 'Weeks to goal must be at least 1'),
  targetValuation: z.number().min(0, 'Target valuation must be at least 0'),
});

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm({
    resolver: zodResolver(schema),
  });

  interface OnboardingFormData {
    projectName: string;
    plannedHoursPerWeek: number;
    weeksToGoal: number;
    targetValuation: number;
  }

  interface Project {
    id: string;
    name: string;
    planned_hours_per_week: number;
    weeks_to_goal: number;
    target_valuation: number;
    logo_url?: string;
  }

  useEffect(() => {
    const checkProject = async () => {
      if (user) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);

        if (projects && projects.length > 0) {
          navigate('/dashboard', { replace: true });
        }
      }
    };
    checkProject();
  }, [user, navigate]);

  const onSubmit = async (data: OnboardingFormData) => {
    const { projectName, plannedHoursPerWeek, weeksToGoal, targetValuation } = data;
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData?.user?.id;
    const email = userData?.user?.email;

    // Ensure profile exists for the user
    if (ownerId) {
      await supabase
        .from('profiles')
        .upsert([{ id: ownerId, email }]);
    }

    // Now create the project
    const { data: projectData, error } = await supabase
      .from('projects')
      .insert([
        {
          name: projectName,
          planned_hours_per_week: plannedHoursPerWeek,
          weeks_to_goal: weeksToGoal,
          target_valuation: targetValuation,
          owner_id: ownerId,
        },
      ])
      .select()
      .single<Project>();

    if (error || !projectData) {
      console.error('Error creating project:', error);
      return;
    }

    setProjectId(projectData.id);
  };

  // Step 2: Handle logo upload after project is created
  const handleLogoUpload = async (url: string) => {
    setLogoUrl(url);
    if (!projectId) return;

    const { error } = await supabase
      .from('projects')
      .update({ logo_url: url })
      .eq('id', projectId);

    if (error) {
      console.error('Error updating logo URL:', error);
      return;
    }

    // Step 3: Create initial valuation row
    const { weeksToGoal, targetValuation } = getValues();
    await supabase
      .from('project_valuations')
      .insert([
        {
          project_id: projectId,
          valuation: targetValuation,
          weeks_to_goal: weeksToGoal,
          effective_from: new Date().toISOString().slice(0, 10),
        },
      ]);

    navigate('/dashboard');
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Onboarding
      </Typography>
      <TextField
        label="Project Name"
        variant="outlined"
        fullWidth
        margin="normal"
        {...register('projectName')}
        error={!!errors.projectName}
        helperText={errors.projectName?.message}
      />
      <TextField
        label="Planned Hours per Week"
        variant="outlined"
        fullWidth
        margin="normal"
        type="number"
        {...register('plannedHoursPerWeek', { valueAsNumber: true })}
        error={!!errors.plannedHoursPerWeek}
        helperText={errors.plannedHoursPerWeek?.message}
      />
      <TextField
        label="Weeks to Goal"
        variant="outlined"
        fullWidth
        margin="normal"
        type="number"
        {...register('weeksToGoal', { valueAsNumber: true })}
        error={!!errors.weeksToGoal}
        helperText={errors.weeksToGoal?.message}
      />
      <TextField
        label="Target Valuation"
        variant="outlined"
        fullWidth
        margin="normal"
        type="number"
        {...register('targetValuation', { valueAsNumber: true })}
        error={!!errors.targetValuation}
        helperText={errors.targetValuation?.message}
      />
      <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={!!projectId}>
        Create Project
      </Button>
      {projectId && (
        <FileUpload
          projectId={projectId}
          onUploadComplete={handleLogoUpload}
        />
      )}
    </Box>
  );
};

export default Onboarding;