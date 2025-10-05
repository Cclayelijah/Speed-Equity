import React, { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const router = useNavigate()
  const { user, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email);
    setSent(true);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (user) router('/dashboard');

  return (
    <Box component="form" onSubmit={handleSignIn} sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 3, mt: 2 }}>Sign In</Typography>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" fullWidth>Send Magic Link</Button>
      {sent && <Typography sx={{ mt: 2 }}>Check your email for the magic link!</Typography>}
    </Box>
  );
};

export default AuthPage;