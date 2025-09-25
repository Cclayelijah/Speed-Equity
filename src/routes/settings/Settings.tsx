import React, { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  valuation: z.number().nonnegative(),
  weeksToGoal: z.number().positive(),
});

type SettingsForm = {
  valuation: number;
  weeksToGoal: number;
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signOut } = useAuth();
  const { register, handleSubmit, setValue } = useForm<SettingsForm>({
    resolver: zodResolver(schema),
  });
  
  const [currentValuation, setCurrentValuation] = useState<number | null>(null);
  const [currentWeeksToGoal, setCurrentWeeksToGoal] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurrentSettings = async () => {
      const { data, error } = await supabase
        .from('project_valuations')
        .select('valuation, weeks_to_goal')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
      } else {
        setCurrentValuation(data.valuation);
        setCurrentWeeksToGoal(data.weeks_to_goal);
        setValue('valuation', data.valuation);
        setValue('weeksToGoal', data.weeks_to_goal);
      }
    };

    fetchCurrentSettings();
  }, [setValue]);

  const onSubmit = async (data: SettingsForm) => {
    const { error } = await supabase
      .from('project_valuations')
      .insert([{ valuation: data.valuation, weeks_to_goal: data.weeksToGoal, effective_from: new Date() }]);

    if (error) {
      console.error('Error updating settings:', error);
    } else {
      alert('Settings updated successfully!');
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          {...register('valuation')}
          label="Target Valuation"
          type="number"
          fullWidth
          margin="normal"
          required
        />
        <TextField
          {...register('weeksToGoal')}
          label="Weeks to Goal"
          type="number"
          fullWidth
          margin="normal"
          required
        />
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
          Update Settings
        </Button>
      </form>
      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>User Settings</Typography>
      <Box>
        <Typography>Signed in as {user.email}</Typography>
        <Button onClick={signOut} variant="outlined" color="error" sx={{ mt: 2 }}>Sign Out</Button>
      </Box>
    </Box>
  );
};

export default Settings;