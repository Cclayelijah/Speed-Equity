import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ShieldAlert, LogOut, UserPlus, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../components/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/supabase";
import {
  Container,
  Card,
  CardContent,
  Button,
} from "@/components/ui/brand";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const LOGO_BUCKET = "project-logos";
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const NAME_DEBOUNCE_MS = 600;

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type MemberRow = Database["public"]["Tables"]["project_members"]["Row"] & {
  projects: Pick<ProjectRow, "name" | "logo_url" | "owner_id">;
};
type InviteRow = Database["public"]["Tables"]["project_invitations"]["Row"] & {
  projects: Pick<ProjectRow, "name" | "logo_url">;
};

const normalizeLogoUrl = (url: string | null | undefined) =>
  url?.replace(/\/public\/project-logos\/project-logos\//g, "/public/project-logos/") ?? url ?? "";

const logoKeyFrom = (projectId: string, file: { name: string }) => {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  return `${projectId}.${ext}`;
};

const isNumber = (v: unknown) => typeof v === "number" && !isNaN(v as number);

const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [myProjects, setMyProjects] = useState<MemberRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editValuation, setEditValuation] = useState<Record<string, string>>({});
  const [editHours, setEditHours] = useState<Record<string, string>>({});

  const [logoUploading, setLogoUploading] = useState(false);
  const [nameSyncing, setNameSyncing] = useState<Record<string, boolean>>({});
  const [projectionSyncing, setProjectionSyncing] = useState<Record<string, boolean>>({});
  const [projectionStatus, setProjectionStatus] = useState<Record<string, "idle" | "pending" | "saved" | "error">>({});
  const [projectionDirty, setProjectionDirty] = useState<Record<string, boolean>>({});
  const [nameFocused, setNameFocused] = useState<Record<string, boolean>>({});

  const nameTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toastError = useCallback((err: unknown, fallback = "Unexpected error") => {
    const msg = (err as any)?.message || fallback;
    toast.error(msg);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(nameTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const ownershipMap = useMemo(
    () => new Map(myProjects.map((p) => [p.project_id, p.projects.owner_id === user?.id] as const)),
    [myProjects, user?.id]
  );

  const fetchProjectsAndInvites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: memberProjects, error: mErr }, { data: invites, error: iErr }] = await Promise.all([
      supabase.from("project_members").select("project_id, projects(name, logo_url, owner_id)").eq("user_id", user.id),
      supabase.from("project_invitations").select("project_id, projects(name, logo_url)").eq("user_id", user.id),
    ]);
    if (mErr) toastError(mErr);
    if (iErr) toastError(iErr);
    setMyProjects(
      (memberProjects ?? []).map((m) => ({ ...m, projects: { ...m.projects, logo_url: normalizeLogoUrl(m.projects.logo_url) } }))
    );
    setPendingInvites(invites ?? []);
    setLoading(false);
  }, [user, toastError]);

  useEffect(() => {
    fetchProjectsAndInvites();
  }, [fetchProjectsAndInvites]);

  const toggleExpand = useCallback(
    async (projectId: string, proj: MemberRow) => {
      const opening = expandedProjectId !== projectId;
      if (!opening) {
        setExpandedProjectId(null);
        setNameFocused((prev) => {
          if (!prev[projectId]) return prev;
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        return;
      }
      setNameFocused({});
      setExpandedProjectId(projectId);
      setEditName((prev) => ({ ...prev, [projectId]: proj.projects.name || "" }));
      setProjectionStatus((prev) => ({ ...prev, [projectId]: "idle" }));
      setEditValuation((prev) => ({ ...prev, [projectId]: "" }));
      setEditHours((prev) => ({ ...prev, [projectId]: "" }));

      const { data: projection, error } = await supabase
        .from("project_projections")
        .select("valuation, work_hours_until_completion")
        .eq("project_id", projectId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && projection) {
        setEditValuation((p) => ({ ...p, [projectId]: projection.valuation != null ? String(projection.valuation) : "" }));
        setEditHours((p) => ({
          ...p,
          [projectId]: projection.work_hours_until_completion != null ? String(projection.work_hours_until_completion) : "",
        }));
        setProjectionDirty((prev) => ({ ...prev, [projectId]: false }));
      }
    },
    [expandedProjectId]
  );

  const scheduleNameSave = useCallback(
    (projectId: string, value: string, owned: boolean) => {
      if (!owned) return;
      const current = myProjects.find((p) => p.project_id === projectId)?.projects.name || "";
      if (current === value) return;
      if (nameTimers.current[projectId]) clearTimeout(nameTimers.current[projectId]);
      setNameSyncing((prev) => ({ ...prev, [projectId]: true }));
      nameTimers.current[projectId] = setTimeout(async () => {
        const { error } = await supabase.from("projects").update({ name: value }).eq("id", projectId);
        if (error) toastError(error, "Failed saving name");
        else {
          setMyProjects((prev) =>
            prev.map((p) => (p.project_id === projectId ? { ...p, projects: { ...p.projects, name: value } } : p))
          );
        }
        setNameSyncing((prev) => ({ ...prev, [projectId]: false }));
      }, NAME_DEBOUNCE_MS);
    },
    [myProjects, toastError]
  );

  const handleLogoUpload = useCallback(
    (projectId: string, owner: boolean) => {
      if (!owner) return;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size === 0) return toast.error("File empty.");
        if (file.size > MAX_LOGO_SIZE) return toast.error("Image too large (>5MB).");
        setLogoUploading(true);

        const objectName = logoKeyFrom(projectId, file).replace(/^\/+/, "").replace(/^project-logos\//, "");

        const { error: upErr } = await supabase.storage.from(LOGO_BUCKET).upload(objectName, file, {
          upsert: true,
          contentType: file.type || "image/png",
          cacheControl: "3600",
        });

        if (upErr) {
          toastError(upErr, "Upload failed");
          setLogoUploading(false);
          return;
        }

        const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(objectName);
        let logo_url = pub?.publicUrl || null;

        if (logo_url) {
          try {
            const head = await fetch(logo_url, { method: "HEAD" });
            if (head.status !== 200) logo_url = null;
          } catch {
            logo_url = null;
          }
        }

        if (!logo_url) {
          const { data: signed } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(objectName, 60 * 60 * 24 * 30);
          logo_url = signed?.signedUrl || null;
        }

        if (!logo_url) {
          toast.error("Could not resolve logo URL.");
          setLogoUploading(false);
          return;
        }

        logo_url = normalizeLogoUrl(`${logo_url}${logo_url.includes("?") ? "&" : "?"}v=${Date.now()}`);

        const { error: updErr } = await supabase.from("projects").update({ logo_url }).eq("id", projectId);
        if (updErr) {
          toastError(updErr, "Failed updating project");
        } else {
          setMyProjects((prev) =>
            prev.map((p) => (p.project_id === projectId ? { ...p, projects: { ...p.projects, logo_url } } : p))
          );
          toast.success("Logo updated");
        }
        setLogoUploading(false);
      };
      input.click();
    },
    [toastError]
  );

  const handleLeaveProject = async (projectId: string) => {
    await supabase.from("project_members").delete().eq("user_id", user.id).eq("project_id", projectId);
    setMyProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    toast.success("Left project");
  };

  const handleTransferOwnership = (projectId: string) => {
    navigate(`/projects/${projectId}/transfer-ownership`);
  };

  const handleJoinProject = async (projectId: string) => {
    await supabase.from("project_members").insert([{ project_id: projectId, user_id: user.id, email: user.email }]);
    setPendingInvites((prev) => prev.filter((i) => i.project_id !== projectId));
    toast.success("Joined project");
  };

  const saveProjection = useCallback(
    async (projectId: string, owned: boolean) => {
      if (!owned) return;

      const valStr = editValuation[projectId];
      const hrsStr = editHours[projectId];
      const valuation = valStr === "" ? null : Number(valStr);
      const hours = hrsStr === "" ? null : Number(hrsStr);

      if (valuation == null || hours == null || !isNumber(valuation) || !isNumber(hours) || valuation < 0 || hours < 0) {
        setProjectionStatus((prev) => ({ ...prev, [projectId]: "error" }));
        toast.error("Enter valid numbers");
        return;
      }

      setProjectionSyncing((prev) => ({ ...prev, [projectId]: true }));
      setProjectionStatus((prev) => ({ ...prev, [projectId]: "pending" }));

      const { error } = await supabase.rpc("set_active_projection", {
        p_project_id: projectId,
        p_valuation: valuation,
        p_work_hours_until_completion: hours,
        p_effective_from: new Date().toISOString().slice(0, 10),
        p_projection_id: null,
      });

      if (error) {
        toastError(error, "Projection save failed");
        setProjectionStatus((prev) => ({ ...prev, [projectId]: "error" }));
      } else {
        setProjectionStatus((prev) => ({ ...prev, [projectId]: "saved" }));
        setProjectionDirty((prev) => ({ ...prev, [projectId]: false }));
        toast.success("Projection saved");
      }
      setProjectionSyncing((prev) => ({ ...prev, [projectId]: false }));
    },
    [editValuation, editHours, toastError]
  );

  return (
    <Container maxWidth="md">
      <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h4" fontWeight={900}>My Projects</Typography>
        <Button tone="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
      </Box>
      <Divider className="!border-white/10" />

      {loading ? (
        <Stack spacing={2} mt={2}>
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
        </Stack>
      ) : (
        <>
          <Stack spacing={2} mt={2}>
            {myProjects.length === 0 && <Box className="py-2 text-center text-white/70">You are not a member of any projects.</Box>}
            {myProjects.map((p) => {
              const projId = p.project_id;
              const owned = ownershipMap.get(projId) === true;
              const expanded = expandedProjectId === projId;
              const projProjectionState = projectionStatus[projId] || "idle";

              return (
                <Card key={projId} className="overflow-hidden" variant="outlined">
                  <CardContent className="!p-0">
                    <Button
                      onClick={() => toggleExpand(projId, p)}
                      className="!w-full !justify-between !rounded-none !px-3 !py-3 hover:!bg-white/10"
                    >
                      <Box display="flex" alignItems="center" gap={1.5} minWidth={0} flex={1}>
                        <Avatar src={normalizeLogoUrl(p.projects.logo_url) || undefined} alt="" sx={{ width: 48, height: 48, borderRadius: 2 }} />
                        <Box minWidth={0} textAlign="left">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography className="truncate" fontWeight={600}>{p.projects.name}</Typography>
                            {owned && <Chip size="small" label="Owner" color="success" variant="outlined" />}
                          </Box>
                        </Box>
                      </Box>
                      <Typography className={`transition-transform ${expanded ? "rotate-90" : ""}`}>›</Typography>
                    </Button>

                    {expanded && (
                      <>
                        <Divider className="!border-white/10" />
                        <Box className="p-4 space-y-4 sm:p-5">
                          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar src={normalizeLogoUrl(p.projects.logo_url) || undefined} alt="" sx={{ width: 72, height: 72, borderRadius: 2 }} />
                              <Button tone="outline" startIcon={<Camera size={18} />} disabled={!owned || logoUploading} onClick={() => handleLogoUpload(projId, owned)}>
                                {logoUploading ? "Uploading..." : "Change Logo"}
                              </Button>
                            </Stack>
                            {owned && (
                              <Button tone="outline" onClick={() => handleTransferOwnership(projId)} startIcon={<ShieldAlert size={18} />}>
                                Transfer Ownership
                              </Button>
                            )}
                          </Box>

                          <Box>
                            <TextField
                              label="Project Name"
                              value={editName[projId] ?? ""}
                              disabled={!owned}
                              onFocus={() => owned && setNameFocused((prev) => ({ ...prev, [projId]: true }))}
                              onBlur={() => {
                                const val = editName[projId] ?? "";
                                scheduleNameSave(projId, val, owned);
                                setNameFocused((prev) => ({ ...prev, [projId]: false }));
                              }}
                              onChange={(e) => setEditName((prev) => ({ ...prev, [projId]: e.target.value }))}
                              helperText={!owned ? "Read-only" : nameSyncing[projId] ? "Saving..." : nameFocused[projId] ? "Click off to save" : "Up to date"}
                            />
                          </Box>

                          <Divider className="!border-white/10" />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Active Valuation (USD)"
                                type="number"
                                disabled={!owned}
                                value={editValuation[projId] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditValuation((prev) => ({ ...prev, [projId]: val }));
                                  if (owned) setProjectionDirty((prev) => ({ ...prev, [projId]: true }));
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Work Hours Remaining"
                                type="number"
                                disabled={!owned}
                                value={editHours[projId] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditHours((prev) => ({ ...prev, [projId]: val }));
                                  if (owned) setProjectionDirty((prev) => ({ ...prev, [projId]: true }));
                                }}
                              />
                            </Grid>
                          </Grid>

                          {owned && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Button tone="primary" onClick={() => saveProjection(projId, owned)} disabled={projectionSyncing[projId] || !projectionDirty[projId] || !editValuation[projId] || !editHours[projId]}>
                                {projectionSyncing[projId] ? "Saving..." : "Save Projection"}
                              </Button>
                              <Typography variant="caption" color="text.secondary">
                                {projectionDirty[projId] ? "Click save to persist changes" : projProjectionState === "saved" ? "Projection up to date" : ""}
                              </Typography>
                            </Stack>
                          )}

                          {!owned && (
                            <Button tone="outline" onClick={() => handleLeaveProject(projId)}>
                              <LogOut size={18} />
                              &nbsp;Leave Project
                            </Button>
                          )}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

          <Box mt={6}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <UserPlus size={20} />
              <Typography variant="h6">Pending Invites</Typography>
            </Stack>

            {pendingInvites.length === 0 ? (
              <Box className="py-2 text-center text-white/70">No pending invitations.</Box>
            ) : (
              <Stack spacing={2}>
                {pendingInvites.map((invite) => (
                  <Card key={invite.project_id} variant="outlined">
                    <CardContent className="!py-3">
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
                          <Avatar src={normalizeLogoUrl(invite.projects.logo_url) || undefined} alt="" sx={{ width: 48, height: 48, borderRadius: 2 }} />
                          <Box minWidth={0}>
                            <Typography fontWeight={600} className="truncate">{invite.projects.name}</Typography>
                            <Typography variant="caption" color="text.secondary">You’ve been invited to join this project.</Typography>
                          </Box>
                        </Stack>
                        <Button tone="primary" onClick={() => handleJoinProject(invite.project_id)}>
                          Join Project
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            <Box textAlign="center" mt={3}>
              <Button tone="primary" startIcon={<Plus size={18} />} onClick={() => navigate("/add-project")}>
                New Project
              </Button>
            </Box>
          </Box>

          <Divider className="my-6 !border-white/10" />

          <Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>Profile</Typography>
            <Typography>Signed in as {user.email}</Typography>
            <Button tone="outline" className="mt-2" onClick={signOut} startIcon={<LogOut size={18} />}>
              Sign Out
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
};

export default Settings;
