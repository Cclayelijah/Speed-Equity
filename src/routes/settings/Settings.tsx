import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton, // ADD THIS
  Avatar,
  Paper,
  Chip,
  Divider,
  Skeleton,
  Collapse,
  TextField,
  IconButton,
} from '@mui/material';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import toast from 'react-hot-toast';
import { styled } from '@mui/material/styles';
import type { Database } from '../../types/supabase';

const RotateIconButton = styled(IconButton)(({ theme }) => ({
  transition: theme.transitions.create('transform', { duration: 200 }),
  '&.expanded': { transform: 'rotate(90deg)' },
  // Enhance visibility
  color: theme.palette.mode === 'dark'
    ? theme.palette.grey[200]
    : theme.palette.grey[700],
  backgroundColor: theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
  '& svg': {
    fontSize: 26,
  },
}));

// Constants
const LOGO_BUCKET = 'project-logos';
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const NAME_DEBOUNCE_MS = 600;

// Helpers
const logoKeyFrom = (projectId: string, file: { name: string }) => {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  return `${projectId}.${ext}`; // root-level, no folder duplication
};

const stripDuplicateBucketSegment = (url: string | null | undefined) => {
  if (!url) return url;
  return url.replace(/\/public\/project-logos\/project-logos\//g, '/public/project-logos/');
};

// Stronger typing
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type MemberRow = Database['public']['Tables']['project_members']['Row'] & {
  projects: Pick<ProjectRow, 'name' | 'logo_url' | 'owner_id'>;
};
type InviteRow = Database['public']['Tables']['project_invitations']['Row'] & {
  projects: Pick<ProjectRow, 'name' | 'logo_url'>;
};

// Utility
const isNumber = (v: unknown) => typeof v === 'number' && !isNaN(v);

// Debug helper function
async function debugStorageEnvironment() {
  console.log('[StorageDebug] begin');
  // Try list root of bucket (works if SELECT policy allows)
  const { data: listed, error: listErr } = await supabase.storage
    .from(LOGO_BUCKET)
    .list('', { limit: 5 });
  if (listErr) {
    console.warn('[StorageDebug] list error (likely policy or bucket truly missing):', listErr);
  } else {
    console.log('[StorageDebug] list success (bucket exists & policy OK). First keys:', listed);
  }

  // Probe a fake object to see error shape
  const probeName = '__probe_does_not_exist__.txt';
  const { data: probePub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(probeName);
  console.log('[StorageDebug] getPublicUrl pattern:', probePub);

  console.log('[StorageDebug] end');
}

async function verifyLogoObject(bucket: string, key: string) {
  console.log('[LogoVerify] start', { bucket, key });

  // 1. List root (or prefix) to confirm exact stored key
  const { data: rootList, error: rootErr } = await supabase.storage.from(bucket).list('', { limit: 100 });
  console.log('[LogoVerify] list root ->', { error: rootErr, keys: rootList?.map(o => o.name) });

  const prefix = key.split('.').shift() || '';
  const { data: prefixList, error: prefixErr } = await supabase.storage.from(bucket).list('', { search: prefix });
  console.log('[LogoVerify] list search prefix ->', { prefix, error: prefixErr, keys: prefixList?.map(o => o.name) });

  // 2. Attempt direct download (will fail with 401/403 if private or policy issue)
  const { data: downloadBlob, error: downloadErr } = await supabase.storage.from(bucket).download(key);
  console.log('[LogoVerify] download result ->', { ok: !!downloadBlob, size: downloadBlob?.size, error: downloadErr });

  // 3. Log public URL HEAD check (cannot use fetch without CORS sometimes, but try)
  const publicUrl = `https://${supabase.supabaseUrl.replace(/^https?:\/\//,'')}/storage/v1/object/public/${bucket}/${key}`;
  try {
    const headResp = await fetch(publicUrl, { method: 'HEAD' });
    console.log('[LogoVerify] HEAD public URL ->', publicUrl, headResp.status, headResp.statusText);
  } catch (e) {
    console.warn('[LogoVerify] HEAD fetch failed', e);
  }

  console.log('[LogoVerify] end');
}

const Settings = () => {
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

  // Per-field sync state
  const [nameSyncing, setNameSyncing] = useState<Record<string, boolean>>({});
  const [projectionSyncing, setProjectionSyncing] = useState<Record<string, boolean>>({});
  const [projectionStatus, setProjectionStatus] = useState<Record<string, 'idle' | 'pending' | 'saved' | 'error'>>({});
  const [projectionDirty, setProjectionDirty] = useState<Record<string, boolean>>({});
  const [nameFocused, setNameFocused] = useState<Record<string, boolean>>({}); // ADD THIS

  // Debounce timers
  const nameTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Centralized error toast
  const toastError = useCallback((err: unknown, fallback = 'Unexpected error') => {
    const msg = (err as any)?.message || fallback;
    toast.error(msg);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(nameTimers.current).forEach(t => clearTimeout(t));
    };
  }, []);

  // Memo of project ownership for quick lookup
  const ownershipMap = useMemo(
    () => new Map(myProjects.map(p => [p.project_id, p.projects.owner_id === user?.id] as const)),
    [myProjects, user?.id]
  );

  // Refetch logic extracted
  const fetchProjectsAndInvites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: memberProjects, error: mErr }, { data: invites, error: iErr }] =
      await Promise.all([
        supabase
          .from('project_members')
          .select('project_id, projects(name, logo_url, owner_id)')
          .eq('user_id', user.id),
        supabase
          .from('project_invitations')
          .select('project_id, projects(name, logo_url)')
          .eq('user_id', user.id),
      ]);
    if (mErr) toastError(mErr);
    if (iErr) toastError(iErr);
    setMyProjects(memberProjects ?? []);
    setPendingInvites(invites ?? []);
    setLoading(false);
  }, [user, toastError]);

  useEffect(() => {
    fetchProjectsAndInvites();
  }, [fetchProjectsAndInvites]);

  // Toggle expand (unchanged logic + small guard)
  const toggleExpand = useCallback(async (projectId: string, proj: MemberRow) => {
    const opening = expandedProjectId !== projectId;

    // If collapsing the currently open project: remove its focus state & exit
    if (!opening) {
      setExpandedProjectId(null);
      setNameFocused(prev => {
        if (!prev[projectId]) return prev;
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      return;
    }

    // Switching/opening: clear all prior focus flags
    setNameFocused({});
    setExpandedProjectId(projectId);

    setEditName(prev => ({ ...prev, [projectId]: proj.projects.name || '' }));
    setProjectionStatus(prev => ({ ...prev, [projectId]: 'idle' }));
    setEditValuation(prev => ({ ...prev, [projectId]: '' }));
    setEditHours(prev => ({ ...prev, [projectId]: '' }));

    const { data: projection, error } = await supabase
      .from('project_projections')
      .select('valuation, work_hours_until_completion')
      .eq('project_id', projectId)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && projection) {
      setEditValuation(p => ({ ...p, [projectId]: projection.valuation != null ? String(projection.valuation) : '' }));
      setEditHours(p => ({
        ...p,
        [projectId]: projection.work_hours_until_completion != null
          ? String(projection.work_hours_until_completion)
          : '',
      }));
      setProjectionDirty(prev => ({ ...prev, [projectId]: false }));
    }

    console.log('[ToggleExpand] projectId:', projectId, 'current logo_url:', proj.projects.logo_url);
  }, [expandedProjectId, supabase]);

  // Debounced project name save (skip if unchanged)
  const scheduleNameSave = useCallback((projectId: string, value: string, owned: boolean) => {
    if (!owned) return;
    const current = myProjects.find(p => p.project_id === projectId)?.projects.name || '';
    if (current === value) return; // avoid unnecessary call
    if (nameTimers.current[projectId]) clearTimeout(nameTimers.current[projectId]);
    setNameSyncing(prev => ({ ...prev, [projectId]: true }));
    nameTimers.current[projectId] = setTimeout(async () => {
      const { error } = await supabase.from('projects').update({ name: value }).eq('id', projectId);
      if (error) toastError(error, 'Failed saving name');
      else {
        setMyProjects(prev =>
          prev.map(p =>
            p.project_id === projectId ? { ...p, projects: { ...p.projects, name: value } } : p
          )
        );
      }
      setNameSyncing(prev => ({ ...prev, [projectId]: false }));
    }, NAME_DEBOUNCE_MS);
  }, [myProjects, toastError]);

  // Logo upload improvements: guard unchanged file & early exits
  const handleLogoUpload = useCallback((projectId: string, owner: boolean) => {
    if (!owner) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size === 0) return toast.error('File empty.');
      if (file.size > MAX_LOGO_SIZE) return toast.error('Image too large (>5MB).');
      setLogoUploading(true);
      const objectName = logoKeyFrom(projectId, file);
      console.log('[LogoUpload] sanitized objectName:', objectName);

      // Extra guard in case someone passed a prefixed path accidentally
      const safeObjectName = objectName
        .replace(/^\/+/, '')                // no leading slash
        .replace(/^project-logos\//, '');   // remove accidental bucket duplication

      if (safeObjectName !== objectName) {
        console.warn('[LogoUpload] objectName adjusted to remove duplication:', safeObjectName);
      }

      const { error: upErr } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(safeObjectName, file, {
          upsert: true,
          contentType: file.type || 'image/png',
          cacheControl: '3600',
        });

      if (upErr) {
        toastError(upErr, 'Upload failed');
        setLogoUploading(false);
        return;
      }

      await verifyLogoObject(LOGO_BUCKET, safeObjectName);

      // REPLACE the block that builds logo_url from getPublicUrl with the enhanced fallback:

      const expectedPublic = `https://${supabase.supabaseUrl.replace(/^https?:\/\//,'')}/storage/v1/object/public/${LOGO_BUCKET}/${safeObjectName}`;
      console.log('[LogoUpload] expected public URL:', expectedPublic);

      const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(safeObjectName);
      console.log('[LogoUpload] getPublicUrl raw:', pub);

      let logo_url = pub?.publicUrl ? `${stripDuplicateBucketSegment(pub.publicUrl)}?v=${Date.now()}` : null;

      if (!logo_url) {
        console.warn('[LogoUpload] public URL missing (bucket likely private). Trying signed URL fallback.');
        const { data: signed, error: signedErr } = await supabase.storage
          .from(LOGO_BUCKET)
          .createSignedUrl(safeObjectName, 60 * 60 * 24 * 7); // 7 days
        console.log('[LogoUpload] signedUrl attempt:', signed, signedErr);
        if (signed?.signedUrl) {
            logo_url = `${stripDuplicateBucketSegment(signed.signedUrl)}&v=${Date.now()}`;
        }
      }

      if (!logo_url) {
        toast.error('Could not resolve logo URL (bucket not public & no signed URL).');
        setLogoUploading(false);
        return;
      }

      // Inside handleLogoUpload just before updating DB:
      logo_url = logo_url.replace(/\/public\/project-logos\/project-logos\//g, '/public/project-logos/');

      const { error: updErr } = await supabase.from('projects').update({ logo_url }).eq('id', projectId);
      if (updErr) toastError(updErr, 'Failed updating project');
      else {
        setMyProjects(prev =>
          prev.map(p =>
            p.project_id === projectId
              ? { ...p, projects: { ...p.projects, logo_url } }
              : p
          )
        );
        toast.success('Logo updated');
        console.log('[LogoUpload] state updated. Project new logo_url:', logo_url);
      }
      setLogoUploading(false);
    };
    input.click();
  }, [toastError]);

  const handleLeaveProject = async (projectId: string) => {
    await supabase
      .from('project_members')
      .delete()
      .eq('user_id', user.id)
      .eq('project_id', projectId);
    setMyProjects(prev => prev.filter(p => p.project_id !== projectId));
    toast.success('Left project');
  };

  const handleTransferOwnership = (projectId: string) => {
    navigate(`/projects/${projectId}/transfer-ownership`);
  };

  const handleJoinProject = async (projectId: string) => {
    await supabase
      .from('project_members')
      .insert([{ project_id: projectId, user_id: user.id, email: user.email }]);
    setPendingInvites(prev => prev.filter(i => i.project_id !== projectId));
    toast.success('Joined project');
  };

  // ADD the saveProjection callback (place below scheduleNameSave or near other callbacks)
  const saveProjection = useCallback(async (projectId: string, owned: boolean) => {
    if (!owned) return;

    const valStr = editValuation[projectId];
    const hrsStr = editHours[projectId];
    const valuation = valStr === '' ? null : Number(valStr);
    const hours = hrsStr === '' ? null : Number(hrsStr);

    if (
      valuation == null ||
      hours == null ||
      !isNumber(valuation) ||
      !isNumber(hours) ||
      valuation < 0 ||
      hours < 0
    ) {
      setProjectionStatus(prev => ({ ...prev, [projectId]: 'error' }));
      toast.error('Enter valid non‑negative numbers for both fields');
      return;
    }

    setProjectionSyncing(prev => ({ ...prev, [projectId]: true }));
    setProjectionStatus(prev => ({ ...prev, [projectId]: 'pending' }));

    const { error } = await supabase.rpc('set_active_projection', {
      p_project_id: projectId,
      p_valuation: valuation,
      p_work_hours_until_completion: hours,
      p_effective_from: new Date().toISOString().slice(0, 10),
      p_projection_id: null,
    });

    if (error) {
      toastError(error, 'Projection save failed');
      setProjectionStatus(prev => ({ ...prev, [projectId]: 'error' }));
    } else {
      setProjectionStatus(prev => ({ ...prev, [projectId]: 'saved' }));
      setProjectionDirty(prev => ({ ...prev, [projectId]: false }));
      toast.success('Projection saved');
    }
    setProjectionSyncing(prev => ({ ...prev, [projectId]: false }));
  }, [editValuation, editHours, supabase, toastError]);

  useEffect(() => {
    debugStorageEnvironment();
  }, []);

  return (
    <Box sx={{ padding: 2, maxWidth: 700, mx: 'auto', pb: 6 }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>My Projects</Typography>
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>
          Dashboard
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {loading ? (
        <Box>
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
        </Box>
      ) : (
        <>
          <List>
            {myProjects.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                You are not a member of any projects.
              </Typography>
            )}
            {myProjects.map(p => {
              const owned = ownershipMap.get(p.project_id) === true;
              const expanded = expandedProjectId === p.project_id;
              const projId = p.project_id;
              const projProjectionState = projectionStatus[projId] || 'idle';
              return (
                <Paper key={projId} elevation={2} sx={{ borderRadius: 2, mb: 2 }}>
                  <ListItem
                    disablePadding
                    sx={{ pr: 6 }}
                    secondaryAction={
                      <RotateIconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(projId, p);
                        }}
                        className={expanded ? 'expanded' : ''}
                        aria-label={expanded ? 'Collapse project' : 'Expand project'}
                        size="small"
                      >
                        <ExpandMoreIcon />
                      </RotateIconButton>
                    }
                  >
                    <ListItemButton
                      onClick={() => toggleExpand(projId, p)}
                      sx={{ cursor: 'pointer', alignItems: 'flex-start', py: 1.25, px: 2 }}
                    >
                      <Avatar
                        src={stripDuplicateBucketSegment(p.projects.logo_url) || undefined}
                        sx={{ width: 48, height: 48, mr: 2 }}
                        imgProps={{
                          onLoad: () => console.log('[Avatar] LOAD OK list ->', stripDuplicateBucketSegment(p.projects.logo_url)),
                          onError: () => console.warn('[Avatar] LOAD FAIL list ->', stripDuplicateBucketSegment(p.projects.logo_url)),
                        }}
                      >
                        {p.projects.name?.[0] ?? '?'}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {p.projects.name}
                            {owned && <Chip label="Owner" color="primary" size="small" sx={{ ml: 1 }} />}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Divider />
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={stripDuplicateBucketSegment(p.projects.logo_url) || undefined}
                            sx={{ width: 72, height: 72 }}
                            imgProps={{
                              onLoad: () => console.log('[Avatar] LOAD OK expanded ->', stripDuplicateBucketSegment(p.projects.logo_url)),
                              onError: () => console.warn('[Avatar] LOAD FAIL expanded ->', stripDuplicateBucketSegment(p.projects.logo_url)),
                            }}
                          >
                            {p.projects.name?.[0] ?? '?'}
                          </Avatar>
                          <Button
                            startIcon={<PhotoCameraIcon />}
                            variant="outlined"
                            size="small"
                            disabled={!owned || logoUploading}
                            onClick={() => handleLogoUpload(projId, owned)}
                          >
                            {logoUploading ? 'Uploading...' : 'Change Logo'}
                          </Button>
                        </Box>
                        {owned && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            onClick={() => handleTransferOwnership(projId)}
                            sx={{ ml: 'auto' }}
                          >
                            Transfer Ownership
                          </Button>
                        )}
                      </Box>

                      <TextField
                        label="Project Name"
                        size="small"
                        value={editName[projId] ?? ''}
                        disabled={!owned}
                        onChange={e => {
                          const val = e.target.value;
                          setEditName(prev => ({ ...prev, [projId]: val }));
                        }}
                        onFocus={() => {
                          if (owned) setNameFocused(prev => ({ ...prev, [projId]: true }));
                        }}
                        onBlur={() => {
                          const val = editName[projId] ?? '';
                          scheduleNameSave(projId, val, owned);
                          setNameFocused(prev => ({ ...prev, [projId]: false }));
                        }}
                        fullWidth
                        helperText={
                          !owned
                            ? 'Read-only'
                            : nameSyncing[projId]
                              ? 'Saving...'
                              : nameFocused[projId]
                                ? 'Click off to save'
                                : 'Up to date'
                        }
                      />
                      <Divider sx={{ my: 1 }} />

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                          label="Active Valuation (USD)"
                          size="small"
                          type="number"
                          disabled={!owned}
                          value={editValuation[projId] ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setEditValuation(prev => ({ ...prev, [projId]: val }));
                            if (owned) setProjectionDirty(prev => ({ ...prev, [projId]: true }));
                          }}
                          sx={{ flex: 1, minWidth: 200 }}
                        />
                        <TextField
                          label="Work Hours Remaining"
                          size="small"
                          type="number"
                          disabled={!owned}
                          value={editHours[projId] ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setEditHours(prev => ({ ...prev, [projId]: val }));
                            if (owned) setProjectionDirty(prev => ({ ...prev, [projId]: true }));
                          }}
                          sx={{ flex: 1, minWidth: 200 }}
                        />
                      </Box>

                      {/* Save Projection Button */}
                      {owned && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button
                            variant="contained"
                            size="small"
                            disabled={
                              projectionSyncing[projId] ||
                              !projectionDirty[projId] ||
                              !editValuation[projId] ||
                              !editHours[projId]
                            }
                            onClick={() => saveProjection(projId, owned)}
                          >
                            {projectionSyncing[projId] ? 'Saving...' : 'Save Projection'}
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            {projectionDirty[projId]
                              ? 'Click save to persist changes'
                              : projProjectionState === 'saved'
                                ? 'Projection up to date'
                                : ''}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {!owned && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => handleLeaveProject(projId)}
                          >
                            Leave Project
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </List>

          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            <GroupAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Pending Invites
          </Typography>
          <List>
            {pendingInvites.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No pending invitations.
              </Typography>
            )}
            {pendingInvites.map(invite => (
              <Paper key={invite.project_id} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                <ListItem
                  secondaryAction={
                    <Button
                      variant="contained"
                      onClick={() => handleJoinProject(invite.project_id)}
                    >
                      Join Project
                    </Button>
                  }
                >
                  <Avatar
                    src={invite.projects.logo_url}
                    sx={{ width: 48, height: 48, bgcolor: 'primary.light', mr: 2 }}
                  >
                    {invite.projects.name?.[0] ?? '?'}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {invite.projects.name}
                      </Typography>
                    }
                    secondary="You've been invited to join this project."
                  />
                </ListItem>
              </Paper>
            ))}
          </List>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/add-project')}
            >
              New Project
            </Button>
          </Box>
        </>
      )}

      <Divider sx={{ my: 4 }} />
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" sx={{ mt: 2, mb: 2 }}>Profile</Typography>
        <Typography>Signed in as {user.email}</Typography>
        <Button onClick={signOut} variant="outlined" color="error" sx={{ mt: 2 }}>
          Sign Out
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;