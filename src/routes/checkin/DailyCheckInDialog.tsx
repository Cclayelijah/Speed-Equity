import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";

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
  const { register, handleSubmit, reset } = useForm<DailyCheckInForm>();
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
      const createdBy =
        // supabase-js v2 compatible fetch (fallback to v1 if available)
        (await supabase.auth.getUser()).data.user?.id ?? (supabase as any).auth.user?.()?.id ?? null;

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
    <div
      className="fixed inset-0 z-[70] grid place-items-center p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#05060A]/90 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-checkin-title"
        className="relative w-full max-w-lg card bg-white/[0.06] border-white/15 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
        >
          ×
        </button>

        <div className="p-5 sm:p-6">
          <h2 id="daily-checkin-title" className="text-xl font-semibold">
            Daily Check-In
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {/* Workout completed */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-white/20 bg-white/10 accent-cyan-400"
                {...register("workoutCompleted")}
                disabled={hasCheckedIn}
              />
              <span className="text-white/85">Did you complete your workout yesterday?</span>
            </label>

            {/* Hours worked */}
            <div>
              <label className="label">Hours Worked</label>
              <input
                type="number"
                className="input"
                step="0.1"
                min="0"
                placeholder="e.g. 6.5"
                {...register("hoursWorked", { valueAsNumber: true, required: true })}
                disabled={hasCheckedIn}
              />
            </div>

            {/* Achievements */}
            <div>
              <label className="label">What did you achieve?</label>
              <textarea
                className="input min-h-[110px]"
                placeholder="Brief summary of what you accomplished"
                {...register("achievements")}
                disabled={hasCheckedIn}
              />
            </div>

            {/* Hours wasted */}
            <div>
              <label className="label">Hours Wasted</label>
              <input
                type="number"
                className="input"
                step="0.1"
                min="0"
                placeholder="e.g. 1"
                {...register("hoursWasted", { valueAsNumber: true, required: true })}
                disabled={hasCheckedIn}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={hasCheckedIn || submitting}
              >
                {hasCheckedIn ? "Already Submitted" : submitting ? "Submitting…" : "Submit"}
              </button>
            </div>

            {hasCheckedIn && (
              <div className="text-xs text-white/70">
                You already checked in for yesterday.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckInDialog;