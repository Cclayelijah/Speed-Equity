import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Switch, FormControlLabel } from '@mui/material';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

interface DailyCheckInForm {
  workoutCompleted: boolean;
  hoursWorked: number;
  achievements: string;
  hoursWasted: number;
}

const DailyCheckInDialog: React.FC<{ open: boolean; onClose: () => void; projectId: string }> = ({ open, onClose, projectId }) => {
  const { register, handleSubmit, reset } = useForm<DailyCheckInForm>();
  const [hasCheckedIn, setHasCheckedIn] = useState<boolean>(false);

  useEffect(() => {
    const checkIfEntryExists = async () => {
      const { data } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('project_id', projectId)
        .eq('entry_date', dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
        .single();

      setHasCheckedIn(!!data);
    };

    checkIfEntryExists();
  }, [projectId]);

  const onSubmit = async (data: DailyCheckInForm) => {
    const { workoutCompleted, hoursWorked, achievements, hoursWasted } = data;

    await supabase
      .from('daily_entries')
      .insert({
        project_id: projectId,
        entry_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        workout_completed: workoutCompleted,
        hours_worked: hoursWorked,
        achievements,
        hours_wasted: hoursWasted,
        created_by: supabase.auth.user()?.id,
      });

    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Daily Check-In</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControlLabel
            control={<Switch {...register('workoutCompleted')} />}
            label="Did you complete your workout yesterday?"
          />
          <TextField
            {...register('hoursWorked', { required: true })}
            label="Hours Worked"
            type="number"
            fullWidth
            margin="normal"
            disabled={hasCheckedIn}
          />
          <TextField
            {...register('achievements')}
            label="What did you achieve?"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            disabled={hasCheckedIn}
          />
          <TextField
            {...register('hoursWasted', { required: true })}
            label="Hours Wasted"
            type="number"
            fullWidth
            margin="normal"
            disabled={hasCheckedIn}
          />
          <DialogActions>
            <Button onClick={onClose} color="primary">
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={hasCheckedIn}>
              Submit
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DailyCheckInDialog;