import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  IconButton,
  Button,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import toast from 'react-hot-toast';
import type { Database } from '../../types/supabase';

const DEFAULT_AVATAR_URL = 'https://pzbmeoayqecwhxzxiyeq.supabase.co/storage/v1/object/public/other-assets/default-pfp%20(1).jpg';

type DailyEntryRow = Database['public']['Tables']['daily_entries']['Row'];

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
  const entry = new Date(dateStr + 'T00:00:00Z').getTime();
  const now = Date.now();
  return (now - entry) / (1000 * 60 * 60 * 24);
};

const Checkins: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  // 'all' | 'mine' (current user) | specific user_id
  const [memberFilter, setMemberFilter] = useState<'all' | 'mine' | string>('all');

  const [entries, setEntries] = useState<DailyEntryRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [editingEntry, setEditingEntry] = useState<DailyEntryRow | null>(null);
  const [editHoursWorked, setEditHoursWorked] = useState('');
  const [editHoursWasted, setEditHoursWasted] = useState('');
  const [editCompleted, setEditCompleted] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteEntry, setDeleteEntry] = useState<DailyEntryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editable = useCallback(
    (e: DailyEntryRow) =>
      e.created_by === user?.id && diffInDays(e.entry_date) <= EDIT_WINDOW_DAYS,
    [user?.id]
  );

  const isOwnerEntry = useCallback(
    (e: DailyEntryRow) => e.created_by === user?.id,
    [user?.id]
  );

  // Fetch projects (user membership)
  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id, projects(name, logo_url)')
      .eq('user_id', user.id);
    if (error) toast.error('Failed to load projects');
    const list = (data as ProjectOption[]) || [];
    setProjects(list);
    if (!selectedProjectId && list.length > 0) {
      setSelectedProjectId(list[0].project_id);
    }
    setLoadingProjects(false);
  }, [user, selectedProjectId]);

  // Fetch members for selected project
  const loadMembers = useCallback(async () => {
    if (!selectedProjectId) return;
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id, email, equity')
      .eq('project_id', selectedProjectId)
      .order('email', { ascending: true });
    if (!error) {
      setMembers((data as MemberOption[]) || []);
    }
  }, [selectedProjectId]);

  // Fetch entries
  const loadEntries = useCallback(
    async (reset = false) => {
      if (!user || !selectedProjectId) return;
      setLoadingEntries(true);

      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('daily_entries')
        .select(
          'id, entry_date, created_by, project_id, hours_worked, hours_wasted, completed, plan_to_complete, inserted_at'
        )
        .eq('project_id', selectedProjectId)
        .order('entry_date', { ascending: false })
        .order('inserted_at', { ascending: false })
        .range(from, to);

      if (memberFilter !== 'all') {
        const targetUserId =
          memberFilter === 'mine' ? user?.id : memberFilter;
        if (targetUserId) {
          query = query.eq('created_by', targetUserId);
        }
      }

      const { data, error } = await query;
      if (error) {
        toast.error('Failed to load check-ins');
        setLoadingEntries(false);
        return;
      }

      const rows = (data as DailyEntryRow[]) || [];
      setHasMore(rows.length === PAGE_SIZE);
      if (reset) {
        setEntries(rows);
      } else {
        setEntries(prev => [...prev, ...rows]);
      }
      setLoadingEntries(false);
    },
    [user, selectedProjectId, page, memberFilter]
  );

  // Initialize projects
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load members & reset entries ONLY when project id actually changes.
  // Important: do NOT include loadEntries (it changes when memberFilter changes).
  useEffect(() => {
    if (!selectedProjectId) return;
    setMemberFilter('all');
    loadMembers();
    setEntries([]);
    setPage(0);
    // Initial fetch for the new project (will use current memberFilter = 'all')
    loadEntries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, loadMembers]);

  // Load when memberFilter changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setPage(0);
    loadEntries(true);
  }, [memberFilter, selectedProjectId, loadEntries]);

  // Load more when page increments (not initial)
  useEffect(() => {
    if (page === 0) return;
    loadEntries(false);
  }, [page, loadEntries]);

  const projectName = useMemo(
    () => projects.find(p => p.project_id === selectedProjectId)?.projects.name || '–',
    [projects, selectedProjectId]
  );

  // Open edit dialog
  const openEdit = (entry: DailyEntryRow) => {
    setEditingEntry(entry);
    setEditHoursWorked(entry.hours_worked != null ? String(entry.hours_worked) : '');
    setEditHoursWasted(entry.hours_wasted != null ? String(entry.hours_wasted) : '');
    setEditCompleted(entry.completed || '');
    setEditPlan(entry.plan_to_complete || '');
  };

  const resetEditState = () => {
    setEditingEntry(null);
    setEditHoursWorked('');
    setEditHoursWasted('');
    setEditCompleted('');
    setEditPlan('');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const hrs = editHoursWorked === '' ? undefined : Number(editHoursWorked);
    const wasted = editHoursWasted === '' ? undefined : Number(editHoursWasted);
    if (
      (hrs !== undefined && (isNaN(hrs) || hrs < 0)) ||
      (wasted !== undefined && (isNaN(wasted) || wasted < 0))
    ) {
      toast.error('Invalid hours');
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('daily_entries')
      .update({
        hours_worked: hrs,
        hours_wasted: wasted,
        completed: editCompleted || null,
        plan_to_complete: editPlan || null,
      })
      .eq('id', editingEntry.id)
      .eq('created_by', user?.id); // safety
    setSavingEdit(false);
    if (error) {
      toast.error('Update failed');
      return;
    }
    toast.success('Updated');
    // Refresh in-place
    setEntries(prev =>
      prev.map(e =>
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

  const confirmDelete = (entry: DailyEntryRow) => {
    setDeleteEntry(entry);
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    const { error } = await supabase
      .from('daily_entries')
      .delete()
      .eq('id', deleteEntry.id)
      .eq('created_by', user?.id);
    setDeleting(false);
    if (error) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Deleted');
    setEntries(prev => prev.filter(e => e.id !== deleteEntry.id));
    setDeleteEntry(null);
  };

  const loadMore = () => {
    if (hasMore && !loadingEntries) setPage(p => p + 1);
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
      <Paper
        elevation={3}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton
            aria-label="Back"
            onClick={() => navigate('/dashboard')}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <ArrowBackIcon />
          </IconButton>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="project-select-label">Project</InputLabel>
              <Select
                labelId="project-select-label"
                label="Project"
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value as string)}
                disabled={loadingProjects || projects.length === 0}
                sx={{ height: 40 }}
              >
                {loadingProjects ? (
                  <MenuItem value="">
                    <Skeleton variant="text" width={120} />
                  </MenuItem>
                ) : (
                  projects.map(p => (
                    <MenuItem key={p.project_id} value={p.project_id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={p.projects.logo_url || undefined}
                          sx={{ width: 24, height: 24 }}
                        >
                          {p.projects.name?.[0] ?? '?'}
                        </Avatar>
                        <span>{p.projects.name}</span>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="member-filter-label">Member</InputLabel>
            <Select
              labelId="member-filter-label"
              label="Member"
              value={memberFilter}
              onChange={e => setMemberFilter(e.target.value as string)}
              disabled={!selectedProjectId}
              sx={{ height: 40 }}
            >
              <MenuItem value="all">All Members</MenuItem>
              <MenuItem value="mine" disabled={!user}>
                My Entries
              </MenuItem>
              <MenuItem disabled dense sx={{ fontSize: 11, opacity: 0.65 }}>
                Other Members
              </MenuItem>
              {members
                .filter(m => m.user_id !== user?.id)
                .map(m => (
                  <MenuItem key={m.user_id} value={m.user_id}>
                    {m.email || m.user_id}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate('/checkin')}
            disabled={!selectedProjectId}
            sx={{ height: 40 }}
          >
            New Check-In
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'baseline',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Check-In History
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {projectName} • {
                memberFilter === 'all'
                  ? 'All Members'
                  : memberFilter === 'mine'
                    ? 'My Entries'
                    : members.find(m => m.user_id === memberFilter)?.email || memberFilter
              }
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Showing {entries.length} entries (page {page + 1})
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {loadingEntries && entries.length === 0 ? (
          <Box>
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={60}
                sx={{ mb: 1.5, borderRadius: 2 }}
              />
            ))}
          </Box>
        ) : entries.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
            No check-ins found.
          </Typography>
        ) : (
          <List sx={{ m: 0, p: 0 }}>
            {entries.map(entry => {
              const canEdit = editable(entry);
              const canDelete = isOwnerEntry(entry);
              return (
                <Paper
                  key={entry.id}
                  elevation={1}
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    px: 1,
                    py: 0.5,
                  }}
                >
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      '&:not(:last-child)': { borderBottom: 'none' },
                      gap: 1,
                      py: 0,
                    }}
                    disableGutters
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip
                          title={
                            canEdit
                              ? 'Edit entry'
                              : entry.created_by !== user?.id
                                ? 'You can only edit your own entries'
                                : `Editing disabled after ${EDIT_WINDOW_DAYS} days`
                          }
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => canEdit && openEdit(entry)}
                              disabled={!canEdit}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            canDelete
                              ? 'Delete entry'
                              : 'You can only delete your own entries'
                          }
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => canDelete && confirmDelete(entry)}
                              disabled={!canDelete}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 46 }}>
                      <Avatar
                        src={DEFAULT_AVATAR_URL}
                        sx={{ width: 36, height: 36, borderRadius: 16, border: '2px solid #ccc' }}
                        imgProps={{
                          onError: (e) => {
                            // Fallback to initials if image fails
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          },
                        }}
                      >
                        {(entry.created_by || '?').slice(0, 1).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Chip
                            label={`${entry.hours_worked ?? 0}h`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                          {entry.hours_wasted ? (
                            <Chip
                              label={`Lost ${entry.hours_wasted}h`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : null}
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 500 }}
                          >
                            {entry.entry_date}
                          </Typography>
                          {!canEdit && entry.created_by === user?.id ? (
                            <Tooltip
                              title={`Locked after ${EDIT_WINDOW_DAYS} days`}
                              arrow
                            >
                              <Chip
                                label="Locked"
                                size="small"
                                variant="outlined"
                                sx={{ borderStyle: 'dashed' }}
                              />
                            </Tooltip>
                          ) : null}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-line', mb: entry.plan_to_complete ? 0.75 : 0 }}
                          >
                            {entry.completed || '(no summary)'}
                          </Typography>
                          {entry.plan_to_complete && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', color: 'text.secondary' }}
                            >
                              Plan: {entry.plan_to_complete}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
              );
            })}
          </List>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 3,
          }}
        >
          {hasMore && (
            <Button
              variant="outlined"
              size="small"
              onClick={loadMore}
              disabled={loadingEntries}
            >
              {loadingEntries ? 'Loading…' : 'Load More'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingEntry}
        onClose={() => !savingEdit && resetEditState()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Check-In</DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Hours Worked"
            type="number"
            value={editHoursWorked}
            onChange={e => setEditHoursWorked(e.target.value)}
            inputProps={{ min: 0, step: 0.25 }}
          />
            <TextField
              label="Hours Wasted"
              type="number"
              value={editHoursWasted}
              onChange={e => setEditHoursWasted(e.target.value)}
              inputProps={{ min: 0, step: 0.25 }}
            />
          <TextField
            label="Completed / Achievements"
            value={editCompleted}
            onChange={e => setEditCompleted(e.target.value)}
            multiline
            minRows={3}
          />
          <TextField
            label="Plan / Next Steps"
            value={editPlan}
            onChange={e => setEditPlan(e.target.value)}
            multiline
            minRows={2}
          />
          {editingEntry && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Entry Date: {editingEntry.entry_date}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => !savingEdit && resetEditState()}
            disabled={savingEdit}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={savingEdit}
            variant="contained"
          >
            {savingEdit ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteEntry}
        onClose={() => !deleting && setDeleteEntry(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Check-In</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            This will permanently remove the entry for{' '}
            <strong>{deleteEntry?.entry_date}</strong>. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={() => !deleting && setDeleteEntry(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Checkins;