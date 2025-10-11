import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Typography, Alert } from "@mui/material";
import { Container, Card, CardContent, TextField, Button } from "@/components/ui/brand";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await signIn(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" className="py-20">
        <Typography align="center">Loading…</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" className="py-12">
      <Card accent>
        <CardContent>
          <Typography variant="h4" fontWeight={900} gutterBottom>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Use your email to receive a magic link.
          </Typography>

          <form onSubmit={handleSignIn} className="mt-2">
            <TextField
              id="email"
              type="email"
              autoComplete="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={submitting}
            />
            <Button type="submit" tone="primary" fullWidth disabled={submitting || !email}>
              {submitting ? "Sending…" : "Send Magic Link"}
            </Button>
            {sent && <Alert severity="success" sx={{ mt: 2 }}>Check your inbox for the magic link.</Alert>}
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AuthPage;
