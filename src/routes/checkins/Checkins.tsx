import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";
import type { Database } from "@/types/supabase";
import { ArrowLeft, PlusCircle, Pencil, Trash2 } from "lucide-react";
import {
  Container,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@/components/ui/brand";
import { Grid, Stack, Typography, Skeleton, CircularProgress } from "@mui/material";

type DailyEntryRow = Database["public"]["Tables"]["daily_entries"]["Row"];

interface ProjectOption {
  project_id: string;
  projects: { name: string | null; logo_url: string | null };
}
interface MemberOption {
  user_id: string;
  email: string | null;
  equity: number | null;
}

const PAGE_SIZE = 10;
const EDIT_WINDOW_DAYS = 14;

const diffInDays = (dateStr?: string | null) => {
  if (!dateStr) return Infinity;
  const entry = new Date(dateStr + "T00:00:00Z").getTime();
  const now = Date.now();
  return (now - entry) / (1000 * 60 * 60 * 24);
};

const Checkins: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberFilter, setMemberFilter] = useState<"all" | "mine" | string>("all");

  const [entries, setEntries] = useState<DailyEntryRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [editingEntry, setEditingEntry] = useState<DailyEntryRow | null>(null);
  const [editHoursWorked, setEditHoursWorked] = useState("");
  const [editHoursWasted, setEditHoursWasted] = useState("");
  const [editCompleted, setEditCompleted] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteEntry, setDeleteEntry] = useState<DailyEntryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editable = useCallback(
    (e: DailyEntryRow) => e.created_by === user?.id && diffInDays(e.entry_date) <= EDIT_WINDOW_DAYS,
    [user?.id]
  );
  const isOwnerEntry = useCallback((e: DailyEntryRow) => e.created_by === user?.id, [user?.id]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from("project_members")
      .select("project_id, projects(name, logo_url)")
      .eq("user_id", user.id);
    if (error) toast.error("Failed to load projects");
    const list = (data as ProjectOption[]) || [];
    setProjects(list);
    if (!selectedProjectId && list.length > 0) setSelectedProjectId(list[0].project_id);
    setLoadingProjects(false);
  }, [user, selectedProjectId]);

  const loadMembers = useCallback(async () => {
    if (!selectedProjectId) return;
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id, email, equity")
      .eq("project_id", selectedProjectId)
      .order("email", { ascending: true });
    if (!error) setMembers((data as MemberOption[]) || []);
  }, [selectedProjectId]);

  const loadEntries = useCallback(
    async (reset = false) => {
      if (!user || !selectedProjectId) return;
      setLoadingEntries(true);

      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("daily_entries")
        .select(
          "id, entry_date, created_by, project_id, hours_worked, hours_wasted, completed, plan_to_complete, inserted_at"
        )
        .eq("project_id", selectedProjectId)
        .order("entry_date", { ascending: false })
        .order("inserted_at", { ascending: false })
        .range(from, to);

      if (memberFilter !== "all") {
        const targetUserId = memberFilter === "mine" ? user?.id : memberFilter;
        if (targetUserId) query = query.eq("created_by", targetUserId);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Failed to load check-ins");
        setLoadingEntries(false);
        return;
      }

      const rows = (data as DailyEntryRow[]) || [];
      setHasMore(rows.length === PAGE_SIZE);
      if (reset) setEntries(rows);
      else setEntries((prev) => [...prev, ...rows]);
      setLoadingEntries(false);
    },
    [user, selectedProjectId, page, memberFilter]
  );

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setMemberFilter("all");
    setEntries([]);
    setPage(0);
    loadMembers();
    loadEntries(true);
  }, [selectedProjectId, loadMembers]); // eslint-disable-line

  useEffect(() => {
    if (!selectedProjectId) return;
    setPage(0);
    loadEntries(true);
  }, [memberFilter, selectedProjectId, loadEntries]);

  useEffect(() => {
    if (page === 0) return;
    loadEntries(false);
  }, [page, loadEntries]);

  const projectName = useMemo(
    () => projects.find((p) => p.project_id === selectedProjectId)?.projects.name || "–",
    [projects, selectedProjectId]
  );

  const openEdit = (entry: DailyEntryRow) => {
    setEditingEntry(entry);
    setEditHoursWorked(entry.hours_worked != null ? String(entry.hours_worked) : "");
    setEditHoursWasted(entry.hours_wasted != null ? String(entry.hours_wasted) : "");
    setEditCompleted(entry.completed || "");
    setEditPlan(entry.plan_to_complete || "");
  };
  const resetEditState = () => {
    setEditingEntry(null);
    setEditHoursWorked("");
    setEditHoursWasted("");
    setEditCompleted("");
    setEditPlan("");
  };
  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const hrs = editHoursWorked === "" ? undefined : Number(editHoursWorked);
    const wasted = editHoursWasted === "" ? undefined : Number(editHoursWasted);
    if ((hrs !== undefined && (isNaN(hrs) || hrs < 0)) || (wasted !== undefined && (isNaN(wasted) || wasted < 0))) {
      toast.error("Invalid hours");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("daily_entries")
      .update({
        hours_worked: hrs,
        hours_wasted: wasted,
        completed: editCompleted || null,
        plan_to_complete: editPlan || null,
      })
      .eq("id", editingEntry.id)
      .eq("created_by", user?.id);
    setSavingEdit(false);
    if (error) {
      toast.error("Update failed");
      return;
    }
    toast.success("Updated");
    setEntries((prev) =>
      prev.map((e) =>
        e.id === editingEntry.id
          ? {
              ...e,
              hours_worked: hrs ?? 0,
              hours_wasted: wasted ?? 0,
              completed: editCompleted || null,
              plan_to_complete: editPlan || null,
            }
          : e
      )
    );
    resetEditState();
  };

  const confirmDelete = (entry: DailyEntryRow) => setDeleteEntry(entry);
  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    const { error } = await supabase
      .from("daily_entries")
      .delete()
      .eq("id", deleteEntry.id)
      .eq("created_by", user?.id);
    setDeleting(false);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    setEntries((prev) => prev.filter((e) => e.id !== deleteEntry.id));
    setDeleteEntry(null);
  };

  const loadMore = () => {
    if (hasMore && !loadingEntries) setPage((p) => p + 1);
  };

  return (
    <Container maxWidth="lg">
      <Card className="mb-4">
        <CardContent>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item>
              <Button tone="outline" onClick={() => navigate("/dashboard")} startIcon={<ArrowLeft size={18} />}>
                Dashboard
              </Button>
            </Grid>
            <Grid item xs>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="proj-label">Project</InputLabel>
                  <Select
                    labelId="proj-label"
                    label="Project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value as string)}
                    disabled={loadingProjects}
                  >
                    {loadingProjects ? (
                      <MenuItem value="">
                        <Skeleton width={120} />
                      </MenuItem>
                    ) : (
                      projects.map((p) => (
                        <MenuItem key={p.project_id} value={p.project_id}>
                          {p.projects.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="member-label">Member</InputLabel>
                  <Select
                    labelId="member-label"
                    label="Member"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value as any)}
                  >
                    <MenuItem value="all">All Members</MenuItem>
                    <MenuItem value="mine">My Entries</MenuItem>
                    {members
                      .filter((m) => m.user_id !== user?.id)
                      .map((m) => (
                        <MenuItem key={m.user_id} value={m.user_id}>
                          {m.email || m.user_id}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <Button tone="primary" onClick={() => navigate("/checkin")} disabled={!selectedProjectId} startIcon={<PlusCircle size={18} />}>
                  New Check-In
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-bold">Check-In History</h2>
              <div className="text-xs text-white/60">
                {projectName} •{" "}
                {memberFilter === "all"
                  ? "All Members"
                  : memberFilter === "mine"
                  ? "My Entries"
                  : members.find((m) => m.user_id === memberFilter)?.email || (memberFilter as string)}
              </div>
            </div>
            <div className="text-xs text-white/60">Showing {entries.length} entries (page {page + 1})</div>
          </div>

          <div className="h-px mb-3 bg-white/10" />

          {loadingEntries && entries.length === 0 ? (
            <div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="mb-1.5 h-[60px] animate-pulse rounded-2xl bg-white/10" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-6 text-center text-white/70">No check-ins found.</div>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((entry) => {
                const canEdit = editable(entry);
                const canDelete = isOwnerEntry(entry);
                return (
                  <li key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-start gap-3 px-2.5 py-2">
                      <div className="grid text-sm font-semibold h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                        {(entry.created_by || "?").slice(0, 1).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-400/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                            {(entry.hours_worked ?? 0)}h
                          </span>
                          {entry.hours_wasted ? (
                            <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                              Lost {entry.hours_wasted}h
                            </span>
                          ) : null}
                          <span className="text-xs text-white/60">{entry.entry_date}</span>
                          {!canEdit && entry.created_by === user?.id ? (
                            <span
                              className="inline-flex items-center rounded-full border border-white/25 px-2 py-0.5 text-[11px] text-white/70"
                              title={`Locked after ${EDIT_WINDOW_DAYS} days`}
                            >
                              Locked
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1.5 whitespace-pre-line text-sm text-white/85">
                          {entry.completed || "(no summary)"}
                        </div>
                        {entry.plan_to_complete && (
                          <div className="mt-1 text-xs text-white/60">Plan: {entry.plan_to_complete}</div>
                        )}
                      </div>

                      <div className="ml-auto flex items-center gap-1.5 pl-2">
                        <button
                          className={`rounded-lg p-2 transition ${
                            canEdit ? "text-white/80 hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-white/40"
                          }`}
                          onClick={() => canEdit && openEdit(entry)}
                          title={
                            canEdit
                              ? "Edit entry"
                              : entry.created_by !== user?.id
                              ? "You can only edit your own entries"
                              : `Editing disabled after ${EDIT_WINDOW_DAYS} days`
                          }
                          disabled={!canEdit}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className={`rounded-lg p-2 transition ${
                            canDelete ? "text-white/80 hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-white/40"
                          }`}
                          onClick={() => canDelete && confirmDelete(entry)}
                          title={canDelete ? "Delete entry" : "You can only delete your own entries"}
                          disabled={!canDelete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex justify-center mt-3">
            {hasMore && (
              <Button tone="outline" onClick={loadMore} disabled={loadingEntries}>
                {loadingEntries ? "Loading…" : "Load More"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingEntry && (
        <Dialog open={Boolean(editingEntry)} onClose={() => !savingEdit && resetEditState()} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Check-In</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                label="Hours Worked"
                type="number"
                value={editHoursWorked}
                onChange={(e) => setEditHoursWorked(e.target.value)}
                inputProps={{ min: 0, step: 0.25 }}
                dense
              />
              <TextField
                label="Hours Wasted"
                type="number"
                value={editHoursWasted}
                onChange={(e) => setEditHoursWasted(e.target.value)}
                inputProps={{ min: 0, step: 0.25 }}
                dense
              />
              <TextField
                label="Completed / Achievements"
                value={editCompleted}
                onChange={(e) => setEditCompleted(e.target.value)}
                multiline
                minRows={3}
                dense
              />
              <TextField
                label="Plan / Next Steps"
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                multiline
                minRows={2}
                dense
              />
              <Typography variant="caption" color="textSecondary">
                Entry Date: {editingEntry.entry_date}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => !savingEdit && resetEditState()} disabled={savingEdit} tone="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} tone="primary">
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirm Modal */}
      {deleteEntry && (
        <Dialog open={Boolean(deleteEntry)} onClose={() => !deleting && setDeleteEntry(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Check-In</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              This will permanently remove the entry for <strong>{deleteEntry.entry_date}</strong>. This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => !deleting && setDeleteEntry(null)} disabled={deleting} tone="outline">
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={deleting} tone="primary" startIcon={deleting ? <CircularProgress size={16} /> : undefined}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default Checkins;
