import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import DailyCheckInDialog from "./DailyCheckInDialog";
import {
  Container,
  Card,
  CardContent,
  Button,
  Chip,
} from "@/components/ui/brand";
import { Grid, Typography, Stack, Skeleton } from "@mui/material";

const DailyCheckInPage: React.FC = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string | null }>>([]);
  const [open, setOpen] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProjects(true);
      const { data } = await supabase
        .from("project_members")
        .select("project_id, projects(name)")
        .eq("user_id", user.id);
      const list = (data ?? []).map((r) => ({ id: (r as any).project_id, name: (r as any).projects.name })) as any[];
      setProjects(list);
      const initial = params.get("projectId") || list[0]?.id || "";
      setProjectId(initial);
      setLoadingProjects(false);
    })();
  }, [user, params]);

  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

  return (
    <Container maxWidth="md">
      <Card accent className="mb-4">
        <CardContent>
          <Grid container alignItems="center" spacing={2} justifyContent="space-between">
            <Grid item>
              <Typography variant="h4" fontWeight={900}>Daily Check-In</Typography>
              <Typography variant="body2" color="text.secondary">
                For <strong>Yesterday</strong> — {yesterday}
              </Typography>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button tone="outline" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </Button>
                <Chip label="Motivation mode" />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Select Project</Typography>
          {loadingProjects ? (
            <Skeleton variant="rounded" height={48} />
          ) : projects.length === 0 ? (
            <div className="py-4 text-white/70">No projects found. Create one first.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    projectId === p.id
                      ? "border-cyan-300/40 bg-cyan-400/10"
                      : "border-white/15 hover:bg-white/10"
                  }`}
                >
                  {p.name || p.id}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Button tone="primary" disabled={!projectId} onClick={() => setOpen(true)}>
              Open Check-In
            </Button>
          </div>
        </CardContent>
      </Card>

      {projectId && (
        <DailyCheckInDialog
          open={open}
          onClose={() => setOpen(false)}
          projectId={projectId}
        />
      )}
    </Container>
  );
};

export default DailyCheckInPage;
