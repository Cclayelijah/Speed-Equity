import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import AuthPage from './routes/auth/AuthPage';
import Onboarding from './routes/onboarding/Onboarding';
import Dashboard from './routes/dashboard/Dashboard';
import Settings from './routes/settings/Settings';
import GithubConnect from './routes/integrations/GithubConnect';
import DailyCheckInPage from './routes/checkin/DailyCheckInPage';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from '@mui/material';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <AuthProvider>
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/integrations" element={
        <ProtectedRoute>
          <GithubConnect />
        </ProtectedRoute>
      } />
      <Route path="/checkin" element={
        <ProtectedRoute>
          <DailyCheckInPage />
        </ProtectedRoute>
      } />
    </Routes>
  </AuthProvider>
);

export default App;

// Inside DashboardReminder component
const DashboardReminder: React.FC = () => {
  const [showReminder, setShowReminder] = useState(false);
  const [dailyEntries, setDailyEntries] = useState<{ entry_date: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Example: Fetch dailyEntries from API or context here
    // setDailyEntries(fetchedEntries);

    const today = new Date().toISOString().slice(0, 10);
    const hasCheckedInToday = dailyEntries.some(entry => entry.entry_date === today);
    setShowReminder(!hasCheckedInToday);
  }, [dailyEntries]);

  return (
    <>
      {/* ...existing dashboard content... */}
      <Dialog open={showReminder} onClose={() => setShowReminder(false)}>
        <DialogTitle>Daily Check-In Reminder</DialogTitle>
        <DialogContent>
          <Typography>Don't forget to log your daily check-in!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/checkin')}>Check In Now</Button>
          <Button onClick={() => setShowReminder(false)}>Dismiss</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};