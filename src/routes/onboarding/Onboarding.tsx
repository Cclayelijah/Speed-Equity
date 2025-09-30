import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Paper,
  Divider,
  Fade,
} from '@mui/material';
import AddProject from '../add-project/AddProject';
import AddIcon from '@mui/icons-material/Add';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../../components/AuthProvider';

const Onboarding = () => {
  const { user } = useAuth();
  const [invitedProjects, setInvitedProjects] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('project_invitations')
        .select('project_id, projects(name, logo_url)')
        .eq('user_id', user.id)
        .then(({ data }) => setInvitedProjects(data ?? []));
    }
  }, [user]);

  const handleJoinProject = async (projectId: string) => {
    await supabase
      .from('project_members')
      .insert([{ project_id: projectId, user_id: user.id }]);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: 'Joined project!', severity: 'success' }
    }));
    window.location.href = '/dashboard';
  };

  if (!user) return null;

  return (
    <Fade in>
      <Box sx={{
        maxWidth: 700,
        mx: 'auto',
        mt: 6,
        p: 3,
        borderRadius: 3,
        boxShadow: 3,
        bgcolor: 'background.paper',
      }}>
        <Typography variant="h3" gutterBottom align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Welcome!
        </Typography>
        <Typography sx={{ mb: 4 }} align="center" color="text.secondary">
          Get started by creating a new project or joining one you've been invited to.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Button
            variant={showCreate ? "contained" : "outlined"}
            startIcon={<AddIcon />}
            size="large"
            onClick={() => setShowCreate(true)}
            sx={{ minWidth: 160, fontWeight: 600 }}
          >
            Create Project
          </Button>
        </Box>
        <Divider sx={{ mb: 4 }} />
        {showCreate && (
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <AddProject ownerId={user.id} />
          </Paper>
        )}
        <Typography variant="h5" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
          <GroupAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Invited to Join
        </Typography>
        <List>
          {invitedProjects.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              No invitations found.
            </Typography>
          )}
          {invitedProjects.map(invite => (
            <Paper key={invite.project_id} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
              <ListItem
                secondaryAction={
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => handleJoinProject(invite.project_id)}
                    sx={{ fontWeight: 600 }}
                  >
                    Join Project
                  </Button>
                }
              >
                <ListItemIcon>
                  <Avatar
                    src={invite.projects.logo_url}
                    sx={{ width: 48, height: 48, bgcolor: 'primary.light', mr: 2 }}
                  >
                    {invite.projects.name?.[0] ?? '?'}
                  </Avatar>
                </ListItemIcon>
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
      </Box>
    </Fade>
  );
};

export default Onboarding;