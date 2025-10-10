import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import toast from "react-hot-toast";
import type { Database } from "../../types/supabase";
import { ArrowLeft, PlusCircle, Pencil, Trash2 } from "lucide-react";

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
  // 'all' | 'mine' | specific user_id
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

  // Fetch projects (user membership)
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

  // Fetch members for selected project
  const loadMembers = useCallback(async () => {
    if (!selectedProjectId) return;
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id, email, equity")
      .eq("project_id", selectedProjectId)
      .order("email", { ascending: true });
    if (!error) setMembers((data as MemberOption[]) || []);
  }, [selectedProjectId]);

  // Fetch entries
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

  // Initialize projects
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // When project changes, reset filters and fetch
  useEffect(() => {
    if (!selectedProjectId) return;
    setMemberFilter("all");
    setEntries([]);
    setPage(0);
    loadMembers();
    loadEntries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, loadMembers]);

  // Reload when filter changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setPage(0);
    loadEntries(true);
  }, [memberFilter, selectedProjectId, loadEntries]);

  // Load more
  useEffect(() => {
    if (page === 0) return;
    loadEntries(false);
  }, [page, loadEntries]);

  const projectName = useMemo(
    () => projects.find((p) => p.project_id === selectedProjectId)?.projects.name || "–",
    [projects, selectedProjectId]
  );

  // Edit helpers
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

  // Delete helpers
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
    <div className="max-w-6xl px-4 py-6 mx-auto">
      {/* Header controls */}
      <div className="p-4 mb-4 card sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">

            {/* Project select */}
            <div className="relative group">
              {loadingProjects ? (
                <div className="h-10 w-44 rounded-xl bg-white/10 animate-pulse" />
              ) : (
                <select
                  className="input appearance-none !h-10 !py-2.5 pr-12 min-w-[14rem] bg-white/10 text-white border-white/25 hover:border-white/35 focus:border-white/50 focus:ring-2 focus:ring-fuchsia-400/30"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projects.length === 0}
                  title="Project"
                >
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.projects.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="absolute w-px h-6 -translate-y-1/2 pointer-events-none right-9 top-1/2 bg-white/10 group-focus-within:bg-white/20" />
              <svg
                className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none right-3 top-1/2 text-white/80"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
              </svg>
            </div>

            {/* Member filter */}
            <div className="relative group">
              <select
                className="input appearance-none !h-10 !py-2.5 pr-12 min-w-[12rem] bg-white/10 text-white border-white/25 hover:border-white/35 focus:border-white/50 focus:ring-2 focus:ring-fuchsia-400/30"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value as any)}
                disabled={!selectedProjectId}
                title="Member filter"
              >
                <option value="all">All Members</option>
                <option value="mine" disabled={!user}>
                  My Entries
                </option>
                {members
                  .filter((m) => m.user_id !== user?.id)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.email || m.user_id}
                    </option>
                  ))}
              </select>
              <span className="absolute w-px h-6 -translate-y-1/2 pointer-events-none right-9 top-1/2 bg-white/10 group-focus-within:bg-white/20" />
              <svg
                className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none right-3 top-1/2 text-white/80"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
              </svg>
            </div>
          </div>

          <button
            className="inline-flex items-center gap-2 btn btn-primary"
            onClick={() => navigate("/checkin")}
            disabled={!selectedProjectId}
          >
            <PlusCircle className="w-4 h-4" />
            New Check-In
          </button>
        </div>
      </div>

      {/* List card */}
      <div className="p-5 card sm:p-6">
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
              <div key={i} className="h-[60px] rounded-2xl bg-white/10 animate-pulse mb-1.5" />
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
                    <div className="grid text-sm font-semibold h-9 w-9 shrink-0 rounded-xl bg-white/10 place-items-center">
                      {(entry.created_by || "?").slice(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-cyan-400/15 text-cyan-200 border border-cyan-300/20 px-2 py-0.5 text-[11px] font-semibold">
                          {(entry.hours_worked ?? 0)}h
                        </span>
                        {entry.hours_wasted ? (
                          <span className="inline-flex items-center rounded-full bg-amber-400/15 text-amber-200 border border-amber-300/20 px-2 py-0.5 text-[11px] font-semibold">
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
                          canEdit
                            ? "text-white/80 hover:text-white hover:bg-white/10"
                            : "text-white/40 cursor-not-allowed"
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
                          canDelete
                            ? "text-white/80 hover:text-white hover:bg-white/10"
                            : "text-white/40 cursor-not-allowed"
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
            <button className="btn btn-outline" onClick={loadMore} disabled={loadingEntries}>
              {loadingEntries ? "Loading…" : "Load More"}
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center p-4"
          onClick={() => !savingEdit && resetEditState()}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[#05060A]/90 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-checkin-title"
            className="relative w-full max-w-lg card bg-white/[0.06] border-white/15 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
            <div className="p-5 sm:p-6">
              <h3 id="edit-checkin-title" className="text-xl font-semibold">
                Edit Check-In
              </h3>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">Hours Worked</label>
                  <input
                    type="number"
                    className="input"
                    value={editHoursWorked}
                    onChange={(e) => setEditHoursWorked(e.target.value)}
                    min={0}
                    step={0.25}
                  />
                </div>
                <div>
                  <label className="label">Hours Wasted</label>
                  <input
                    type="number"
                    className="input"
                    value={editHoursWasted}
                    onChange={(e) => setEditHoursWasted(e.target.value)}
                    min={0}
                    step={0.25}
                  />
                </div>
                <div>
                  <label className="label">Completed / Achievements</label>
                  <textarea
                    className="input min-h-[110px]"
                    value={editCompleted}
                    onChange={(e) => setEditCompleted(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Plan / Next Steps</label>
                  <textarea
                    className="input min-h-[90px]"
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                  />
                </div>
                <div className="text-xs text-white/60">
                  Entry Date: {editingEntry.entry_date}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  className="btn btn-outline"
                  onClick={() => !savingEdit && resetEditState()}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteEntry && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center p-4"
          onClick={() => !deleting && setDeleteEntry(null)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[#05060A]/90 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-checkin-title"
            className="relative w-full max-w-md card bg-white/[0.06] border-white/15 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
            <div className="p-5 sm:p-6">
              <h3 id="delete-checkin-title" className="text-xl font-semibold">
                Delete Check-In
              </h3>
              <p className="mt-2 text-white/80">
                This will permanently remove the entry for{" "}
                <strong>{deleteEntry.entry_date}</strong>. This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  className="btn btn-outline"
                  onClick={() => !deleting && setDeleteEntry(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button className="text-red-900 bg-red-300 btn btn-primary hover:bg-red-200" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkins;