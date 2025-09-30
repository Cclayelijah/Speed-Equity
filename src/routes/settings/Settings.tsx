import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, ListItemSecondaryAction, Avatar, Paper, Chip, Divider, Skeleton } from '@mui/material';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import GroupAddIcon from '@mui/icons-material/GroupAdd';

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectsAndInvites() {
      setLoading(true);
      // Fetch projects where user is a member
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id, projects(name, logo_url, owner_id)')
        .eq('user_id', user.id);

      setMyProjects(memberProjects ?? []);

      // Fetch pending invites
      const { data: invites } = await supabase
        .from('project_invitations')
        .select('project_id, projects(name, logo_url)')
        .eq('user_id', user.id);

      setPendingInvites(invites ?? []);
      setLoading(false);
    }
    if (user) fetchProjectsAndInvites();
  }, [user]);

  const handleLeaveProject = async (projectId: string) => {
    await supabase
      .from('project_members')
      .delete()
      .eq('user_id', user.id)
      .eq('project_id', projectId);
    setMyProjects(myProjects.filter(p => p.project_id !== projectId));
    // Optionally: toast.success('Left project!');
  };

  const handleTransferOwnership = (projectId: string) => {
    // Navigate to a transfer ownership page or open a modal
    navigate(`/projects/${projectId}/transfer-ownership`);
  };

  const handleJoinProject = async (projectId: string) => {
    await supabase
      .from('project_members')
      .insert([{ project_id: projectId, user_id: user.id }]);
    setPendingInvites(pendingInvites.filter(i => i.project_id !== projectId));
    // Optionally: toast.success('Joined project!');
  };

  return (
    <Box sx={{ padding: 2, maxWidth: 700, mx: 'auto' }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>My Projects</Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />
      {loading ? (
        <Box>
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
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
            {myProjects.map(p => (
              <Paper key={p.project_id} elevation={2} sx={{ borderRadius: 2 }}>
                <ListItem>
                  <Avatar src={p.projects.logo_url} sx={{ width: 48, height: 48, mr: 2 }}>
                    {p.projects.name?.[0] ?? '?'}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {p.projects.name}
                        {p.projects.owner_id === user.id && (
                          <Chip label="Owner" color="primary" size="small" sx={{ ml: 2 }} />
                        )}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    {p.projects.owner_id === user.id ? (
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<SwapHorizIcon />}
                        onClick={() => handleTransferOwnership(p.project_id)}
                        sx={{ }}
                      />
                    ) : (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ExitToAppIcon />}
                        onClick={() => handleLeaveProject(p.project_id)}
                      >
                        Leave Project
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
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
          <Box sx={{textAlign: 'center'}}>
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