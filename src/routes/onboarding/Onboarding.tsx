import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  Divider,
  Fade,
  Chip,
  Skeleton,
  Stack
} from '@mui/material';
import AddProject from '../add-project/AddProject';
import AddIcon from '@mui/icons-material/Add';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../../components/AuthProvider';
import toast from 'react-hot-toast';
import type { Database } from '../../types/supabase';

type InviteRow = Database['public']['Tables']['project_invitations']['Row'] & {
  projects?: {
    name: string | null;
    logo_url: string | null;
  };
};

type MemberRow = {
  project_id: string;
  projects: {
    name: string | null;
    logo_url: string | null;
    owner_id?: string | null;
  };
};

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<InviteRow[]>([]);
  const [acceptedInvites, setAcceptedInvites] = useState<InviteRow[]>([]);
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Project memberships
    const { data: memberProjects, error: memberErr } = await supabase
      .from('project_members')
      .select('project_id, projects(name, logo_url, owner_id)')
      .eq('user_id', user.id);
    if (memberErr) toast.error(memberErr.message);
    setMemberships(memberProjects ?? []);

    // Invitations
    const { data: invites, error: invErr } = await supabase
      .from('project_invitations')
      .select('id, project_id, email, user_id, created_at, accepted_at, projects(name, logo_url)')
      .eq('email', user.email); // assuming email-based invites
    if (invErr) {
      // If table missing, silently ignore to avoid blocking page
      if (!invErr.message.toLowerCase().includes('does not exist')) {
        toast.error(invErr.message);
      }
    }

    const allInvites = invites ?? [];
    setPendingInvites(allInvites.filter(i => !i.accepted_at));
    setAcceptedInvites(allInvites.filter(i => i.accepted_at));

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptInvite = async (invite: InviteRow) => {
    if (!user) return;
    setAccepting(invite.id);
    try {
      // Call RPC (updated per your migration)
      const { data: accepted, error: rpcError } = await supabase.rpc('accept_project_invite', {
        p_invite_id: invite.id
      });

      if (rpcError) {
        toast.error(rpcError.message);
      } else {
        // Ensure membership exists (in case trigger not present)
        const { data: existingMember } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('project_id', invite.project_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingMember) {
          await supabase
            .from('project_members')
            .insert([{ project_id: invite.project_id, user_id: user.id }]);
        }

        toast.success('Invite accepted!');
        await loadData();
      }
    } finally {
      setAccepting(null);
    }
  };

  const handleGoToProject = (projectId: string) => {
    window.location.href = `/dashboard?project=${projectId}`;
  };

  if (!user) return null;

  return (
    <Fade in>
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6, mb: 6, p: 3, borderRadius: 3, boxShadow: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h3" gutterBottom align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Welcome!
        </Typography>
        <Typography sx={{ mb: 4 }} align="center" color="text.secondary">
          Get started by creating a new project or joining one you’ve been invited to.
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          <Button
            variant={showCreate ? 'contained' : 'outlined'}
            startIcon={<AddIcon />}
            size="large"
            onClick={() => setShowCreate(true)}
            sx={{ minWidth: 160, fontWeight: 600 }}
          >
            Create Project
          </Button>
          {memberships.length > 0 && (
            <Button
              variant="outlined"
              size="large"
              onClick={() => (window.location.href = '/dashboard')}
              sx={{ minWidth: 160, fontWeight: 600 }}
            >
              Go to Dashboard
            </Button>
          )}
        </Stack>

        {showCreate && (
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <AddProject ownerId={user.id} onCreated={() => loadData()} />
          </Paper>
        )}

        <Divider sx={{ mb: 4 }} />

        {/* Pending Invites */}
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          <GroupAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Pending Invitations
        </Typography>
        <List>
            {loading && (
              <>
                {[...Array(2)].map((_, i) => (
                  <Paper key={i} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                    <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 2 }} />
                  </Paper>
                ))}
              </>
            )}
            {!loading && pendingInvites.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No pending invitations.
              </Typography>
            )}
            {!loading &&
              pendingInvites.map(invite => (
                <Paper key={invite.id} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={accepting === invite.id}
                        sx={{ fontWeight: 600 }}
                      >
                        {accepting === invite.id ? 'Accepting...' : 'Accept'}
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={invite.projects?.logo_url ?? undefined}
                        sx={{ width: 48, height: 48, bgcolor: 'primary.light', mr: 2 }}
                      >
                        {invite.projects?.name?.[0] ?? '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {invite.projects?.name ?? 'Project'}
                        </Typography>
                      }
                      secondary={`Invited on ${new Date(invite.created_at).toLocaleDateString()}`}
                    />
                  </ListItem>
                </Paper>
              ))}
        </List>

        {/* Accepted Invites (optional display) */}
        {acceptedInvites.length > 0 && (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Recently Accepted
            </Typography>
            <List>
              {acceptedInvites.map(invite => (
                <Paper key={invite.id} elevation={0} sx={{ mb: 1, p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                  <ListItem
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleGoToProject(invite.project_id)}
                      >
                        Open
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={invite.projects?.logo_url ?? undefined}
                        sx={{ width: 40, height: 40 }}
                      >
                        {invite.projects?.name?.[0] ?? '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {invite.projects?.name}
                          </Typography>
                          <Chip
                            size="small"
                            icon={<CheckIcon />}
                            color="success"
                            label="Accepted"
                          />
                        </Box>
                      }
                      secondary={`Accepted ${invite.accepted_at ? new Date(invite.accepted_at).toLocaleDateString() : ''}`}
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          </>
        )}

        <Divider sx={{ my: 4 }} />

        {/* Existing Projects Memberships */}
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Your Projects
        </Typography>
        <List>
          {loading && (
            <>
              {[...Array(2)].map((_, i) => (
                <Paper key={i} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                  <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 2 }} />
                </Paper>
              ))}
            </>
          )}
          {!loading && memberships.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              You are not a member of any projects yet.
            </Typography>
          )}
          {!loading &&
            memberships.map(m => (
              <Paper key={m.project_id} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                <ListItem
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleGoToProject(m.project_id)}
                    >
                      Open
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      src={m.projects.logo_url ?? undefined}
                      sx={{ width: 48, height: 48 }}
                    >
                      {m.projects.name?.[0] ?? '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {m.projects.name}
                      </Typography>
                    }
                    secondary="Member"
                  />
                </ListItem>
              </Paper>
            ))}
        </List>

        {/* Final CTA */}
        {!loading &&
          memberships.length === 0 &&
          pendingInvites.length === 0 &&
          !showCreate && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="large"
                onClick={() => setShowCreate(true)}
              >
                Create Your First Project
              </Button>
            </Box>
          )}
      </Box>
    </Fade>
  );
};

export default Onboarding;