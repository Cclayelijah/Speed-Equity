import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Camera, ShieldAlert, LogOut, UserPlus, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../components/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/supabase";

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
  const [projectionStatus, setProjectionStatus] = useState<
    Record<string, "idle" | "pending" | "saved" | "error">
  >({});
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
      supabase
        .from("project_members")
        .select("project_id, projects(name, logo_url, owner_id)")
        .eq("user_id", user.id),
      supabase.from("project_invitations").select("project_id, projects(name, logo_url)").eq("user_id", user.id),
    ]);
    if (mErr) toastError(mErr);
    if (iErr) toastError(iErr);
    setMyProjects(
      (memberProjects ?? []).map((m) => ({
        ...m,
        projects: { ...m.projects, logo_url: normalizeLogoUrl(m.projects.logo_url) },
      }))
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

        const objectName = logoKeyFrom(projectId, file);
        const safeObjectName = objectName.replace(/^\/+/, "").replace(/^project-logos\//, "");

        const { error: upErr } = await supabase.storage.from(LOGO_BUCKET).upload(safeObjectName, file, {
          upsert: true,
          contentType: file.type || "image/png",
          cacheControl: "3600",
        });

        if (upErr) {
          toastError(upErr, "Upload failed");
          setLogoUploading(false);
          return;
        }

        const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(safeObjectName);
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
          const { data: signed } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(safeObjectName, 60 * 60 * 24 * 30);
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
    <div className="max-w-3xl px-4 py-6 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black tracking-tight sm:text-2xl">My Projects</h1>
        {/* <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button> */}
      </div>
      <div className="h-px mb-4 bg-white/10" />

      {/* Loading */}
      {loading ? (
        <div>
          <div className="mb-2 h-14 rounded-2xl bg-white/10 animate-pulse" />
          <div className="mb-2 h-14 rounded-2xl bg-white/10 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Projects list */}
          <div className="space-y-3">
            {myProjects.length === 0 && (
              <div className="py-2 text-center text-white/70">You are not a member of any projects.</div>
            )}

            {myProjects.map((p) => {
              const projId = p.project_id;
              const owned = ownershipMap.get(projId) === true;
              const expanded = expandedProjectId === projId;
              const projProjectionState = projectionStatus[projId] || "idle";

              return (
                <div key={projId} className="p-0 overflow-hidden card">
                  {/* Row header */}
                  <button
                    onClick={() => toggleExpand(projId, p)}
                    className="flex items-center w-full gap-3 px-3 py-3 text-left transition hover:bg-white/5"
                    aria-expanded={expanded}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-3">
                      <Avatar
                        src={normalizeLogoUrl(p.projects.logo_url) || ""}
                        fallback={p.projects.name?.[0] ?? "?"}
                        size={48}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold truncate">{p.projects.name}</div>
                          {owned && (
                            <span className="inline-flex items-center rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-300/20 px-2 py-0.5 text-[11px] font-semibold">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 text-white/70 transition-transform ${expanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Expanded content */}
                  {expanded && (
                    <>
                      <div className="h-px bg-white/10" />
                      <div className="p-4 space-y-4 sm:p-5">
                        {/* Logo + actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={normalizeLogoUrl(p.projects.logo_url) || ""}
                              fallback={p.projects.name?.[0] ?? "?"}
                              size={72}
                            />
                            <button
                              className="btn btn-outline"
                              disabled={!owned || logoUploading}
                              onClick={() => handleLogoUpload(projId, owned)}
                            >
                              <Camera className="w-4 h-4" />
                              {logoUploading ? "Uploading..." : "Change Logo"}
                            </button>
                          </div>
                          {owned && (
                            <button
                              className="btn btn-outline text-amber-200"
                              onClick={() => handleTransferOwnership(projId)}
                              title="Transfer Ownership"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              Transfer Ownership
                            </button>
                          )}
                        </div>

                        {/* Project name */}
                        <div>
                          <label className="label">Project Name</label>
                          <input
                            className="input"
                            value={editName[projId] ?? ""}
                            disabled={!owned}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditName((prev) => ({ ...prev, [projId]: val }));
                            }}
                            onFocus={() => {
                              if (owned) setNameFocused((prev) => ({ ...prev, [projId]: true }));
                            }}
                            onBlur={() => {
                              const val = editName[projId] ?? "";
                              scheduleNameSave(projId, val, owned);
                              setNameFocused((prev) => ({ ...prev, [projId]: false }));
                            }}
                            placeholder="Enter project name"
                          />
                          <p className="help">
                            {!owned
                              ? "Read-only"
                              : nameSyncing[projId]
                              ? "Saving..."
                              : nameFocused[projId]
                              ? "Click off to save"
                              : "Up to date"}
                          </p>
                        </div>

                        <div className="h-px bg-white/10" />

                        {/* Projection inputs */}
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="flex-1">
                            <label className="label">Active Valuation (USD)</label>
                            <input
                              type="number"
                              className="input"
                              disabled={!owned}
                              value={editValuation[projId] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditValuation((prev) => ({ ...prev, [projId]: val }));
                                if (owned) setProjectionDirty((prev) => ({ ...prev, [projId]: true }));
                              }}
                              placeholder="e.g. 2500000"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="label">Work Hours Remaining</label>
                            <input
                              type="number"
                              className="input"
                              disabled={!owned}
                              value={editHours[projId] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditHours((prev) => ({ ...prev, [projId]: val }));
                                if (owned) setProjectionDirty((prev) => ({ ...prev, [projId]: true }));
                              }}
                              placeholder="e.g. 1200"
                            />
                          </div>
                        </div>

                        {owned && (
                          <div className="flex items-center gap-2">
                            <button
                              className="btn btn-primary"
                              disabled={
                                projectionSyncing[projId] ||
                                !projectionDirty[projId] ||
                                !editValuation[projId] ||
                                !editHours[projId]
                              }
                              onClick={() => saveProjection(projId, owned)}
                            >
                              {projectionSyncing[projId] ? "Saving..." : "Save Projection"}
                            </button>
                            <span className="text-xs text-white/60">
                              {projectionDirty[projId]
                                ? "Click save to persist changes"
                                : projProjectionState === "saved"
                                ? "Projection up to date"
                                : ""}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {!owned && (
                            <button
                              className="text-red-200 btn btn-outline"
                              onClick={() => handleLeaveProject(projId)}
                            >
                              <LogOut className="w-4 h-4" />
                              Leave Project
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pending invites */}
          <div className="my-8">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5 text-white/80" />
              <h2 className="text-xl font-bold">Pending Invites</h2>
            </div>
            {pendingInvites.length === 0 ? (
              <div className="py-2 text-center text-white/70">No pending invitations.</div>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.project_id} className="flex items-center justify-between gap-3 p-4 card">
                    <div className="flex items-center min-w-0 gap-3">
                      <Avatar
                        src={normalizeLogoUrl(invite.projects.logo_url) || ""}
                        fallback={invite.projects.name?.[0] ?? "?"}
                        size={48}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{invite.projects.name}</div>
                        <div className="text-xs text-white/70">You’ve been invited to join this project.</div>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleJoinProject(invite.project_id)}>
                      Join Project
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <button className="btn btn-primary" onClick={() => navigate("/add-project")}>
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>

          <div className="h-px my-6 bg-white/10" />

          {/* Profile */}
          <div>
            <h2 className="mb-2 text-2xl font-bold">Profile</h2>
            <div className="text-white/85">Signed in as {user.email}</div>
            <button className="mt-3 text-red-200 btn btn-outline" onClick={signOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

function Avatar({ src, fallback, size = 48 }: { src?: string; fallback: string; size?: number }) {
  return src ? (
    <img
      src={src}
      alt="Project logo"
      className="object-cover rounded-xl"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className="grid font-semibold place-items-center rounded-xl bg-white/10 text-white/80"
      style={{ width: size, height: size }}
    >
      {fallback}
    </div>
  );
}

export default Settings;