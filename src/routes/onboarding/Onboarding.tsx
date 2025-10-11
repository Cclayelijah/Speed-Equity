import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, CardContent, Button, Chip } from "@/components/ui/brand";
import { Grid, Typography, Stack } from "@mui/material";
import AddProject from "../add-project/AddProject";

const Onboarding: React.FC<{ ownerId: string; ownerEmail: string | null }> = ({ ownerId, ownerEmail }) => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Card accent className="mb-4">
        <CardContent>
          <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
            <Grid item>
              <Typography variant="h4" fontWeight={900}>Welcome to Speed Equity</Typography>
              <Typography variant="body2" color="text.secondary">
                Let’s create your first project and set your targets.
              </Typography>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={1}>
                <Chip label="Step 1 of 2" />
                <Button tone="outline" onClick={() => navigate("/dashboard")}>Skip</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" className="mb-2">Create Project</Typography>
          <AddProject ownerId={ownerId} ownerEmail={ownerEmail} />
        </CardContent>
      </Card>
    </Container>
  );
};

export default Onboarding;
