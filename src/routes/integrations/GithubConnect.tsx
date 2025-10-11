import React, { useEffect, useState } from "react";
import { Container, Card, CardContent, Button, TextField, Chip } from "@/components/ui/brand";
import { Grid, Typography, Stack, Alert, Skeleton } from "@mui/material";
import { Github } from "lucide-react";

const GithubConnect: React.FC = () => {
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // pretend fetch
    setTimeout(() => {
      setConnected(false);
      setLoading(false);
    }, 300);
  }, []);

  const handleConnect = async () => {
    // save token / connect flow
    setConnected(true);
  };

  const handleDisconnect = async () => {
    setConnected(false);
    setToken("");
  };

  return (
    <Container maxWidth="sm">
      <Card accent className="mb-4">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Github />
            <Typography variant="h5" fontWeight={800}>GitHub</Typography>
            {connected && <Chip label="Connected" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Connect your GitHub to sync commits and auto-fill progress.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Skeleton variant="rounded" height={120} />
          ) : connected ? (
            <>
              <Alert severity="success" className="mb-3">Connected to GitHub.</Alert>
              <Button tone="outline" onClick={handleDisconnect}>Disconnect</Button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConnect();
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Personal Access Token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_********************************"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" tone="primary" fullWidth disabled={!token}>
                    Connect GitHub
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default GithubConnect;
