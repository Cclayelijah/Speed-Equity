import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@/components/ui/brand";
import { Typography } from "@mui/material";

const DashboardReminder: React.FC<{
  open?: boolean;
  onClose?: () => void;
}> = ({ open = false, onClose }) => {
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Daily Reminder</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Quick nudge: log yesterday’s progress so your dashboard stays accurate.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button tone="outline" onClick={onClose}>Later</Button>
        <Button tone="primary" onClick={onClose}>Let’s do it</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DashboardReminder;
