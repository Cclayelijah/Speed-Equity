import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import AuthPage from './routes/auth/AuthPage';
import Onboarding from './routes/onboarding/Onboarding';
import Dashboard from './routes/dashboard/Dashboard';
import Settings from './routes/settings/Settings';
import GithubConnect from './routes/integrations/GithubConnect';
import DailyCheckInPage from './routes/checkin/DailyCheckInPage';
import { Button } from '@mui/material';
import AddProject from './routes/add-project/AddProject';
import Checkins from './routes/checkins/Checkins';
import LandingPage from './routes/landing/Landing';
import StoryPage from './routes/story/StoryPage';
import PrivacyPolicy from './routes/policy/PrivacyPolicy';
import SiteLayout from './components/SiteLayout';
import AppLayout from './components/AppLayout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={
      <SiteLayout>
        <LandingPage />
      </SiteLayout>
    } />
    <Route path ="/privacy" element={
      <SiteLayout>
        <PrivacyPolicy />
      </SiteLayout>
    } />
    <Route path ="/story" element={
      <SiteLayout>
        <StoryPage />
      </SiteLayout>
    } />
    <Route path="/onboarding" element={
      <ProtectedRoute>
        <AppLayout title="Get Started"
        >
          <Onboarding />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/add-project" element={
      <ProtectedRoute>
        <AppLayout 
          title="New Project"
        >
          <AddProject ownerId={useAuth().user?.id ?? ''} />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/auth" element={
      <AppLayout 
        title="Ready to Sweat Equity?"
      >
        <AuthPage />
      </AppLayout>
    } />
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <AppLayout 
        title="Dashboard"
        > 
          <Dashboard />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/settings" element={
      <ProtectedRoute>
        <AppLayout
          title="Settings"
        >
          <Settings />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/integrations" element={
      <ProtectedRoute>
        <AppLayout 
          title="Integrations"
        >
          <GithubConnect />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/checkin" element={
      <ProtectedRoute>
        <AppLayout 
          title="Daily Check-In"
        >
          <DailyCheckInPage />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/checkins" element={
      <ProtectedRoute>
        <AppLayout 
          title="Check-Ins"
        >
          <Checkins />
        </AppLayout>
      </ProtectedRoute>
    } />
  </Routes>
);

export default App;

