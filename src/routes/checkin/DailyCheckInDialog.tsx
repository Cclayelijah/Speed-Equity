import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
} from "@mui/material";

interface DailyCheckInForm {
  workoutCompleted: boolean;
  hoursWorked: number;
  achievements: string;
  hoursWasted: number;
}

const DailyCheckInDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  projectId: string;
}> = ({ open, onClose, projectId }) => {
  const { register, handleSubmit, reset, setValue } = useForm<DailyCheckInForm>();
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !projectId) return;
    const checkIfEntryExists = async () => {
      const { data } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("project_id", projectId)
        .eq("entry_date", dayjs().subtract(1, "day").format("YYYY-MM-DD"))
        .maybeSingle();
      setHasCheckedIn(!!data);
    };
    checkIfEntryExists();
  }, [open, projectId]);

  const onSubmit = async (data: DailyCheckInForm) => {
    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const createdBy = authData.user?.id ?? null;
      await supabase.from("daily_entries").insert({
        project_id: projectId,
        entry_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
        workout_completed: data.workoutCompleted,
        hours_worked: data.hoursWorked,
        achievements: data.achievements,
        hours_wasted: data.hoursWasted,
        created_by: createdBy,
      });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Daily Check-In</DialogTitle>
      <DialogContent dividers>
        {hasCheckedIn && <Alert severity="info" sx={{ mb: 2 }}>You already checked in for yesterday.</Alert>}
        <form id="checkin-form" onSubmit={handleSubmit(onSubmit)}>
          <FormControlLabel
            control={
              <Checkbox
                {...register("workoutCompleted")}
                onChange={(e) => setValue("workoutCompleted", e.target.checked)}
                disabled={hasCheckedIn}
              />
            }
            label="Did you complete your workout yesterday?"
          />
          <TextField
            label="Hours Worked"
            type="number"
            fullWidth
            margin="normal"
            inputProps={{ step: 0.1, min: 0 }}
            disabled={hasCheckedIn}
            {...register("hoursWorked", { valueAsNumber: true, required: true })}
          />
          <TextField
            label="What did you achieve?"
            fullWidth
            margin="normal"
            multiline
            minRows={4}
            disabled={hasCheckedIn}
            {...register("achievements")}
          />
          <TextField
            label="Hours Wasted"
            type="number"
            fullWidth
            margin="normal"
            inputProps={{ step: 0.1, min: 0 }}
            disabled={hasCheckedIn}
            {...register("hoursWasted", { valueAsNumber: true, required: true })}
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button type="submit" form="checkin-form" variant="contained" disabled={hasCheckedIn || submitting}>
          {hasCheckedIn ? "Already Submitted" : submitting ? "Submitting…" : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DailyCheckInDialog;