import React, { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  valuation: z.number().nonnegative(),
  weeksToGoal: z.number().positive(),
});

type SettingsForm = {
  valuation: number;
  weeksToGoal: number;
};

const Settings = () => {
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
      <Typography variant="h4">Settings</Typography>
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
        <Button type="submit" variant="contained" color="primary">
          Update Settings
        </Button>
      </form>
    </Box>
  );
};

export default Settings;