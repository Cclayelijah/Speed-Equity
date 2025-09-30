import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button, TextField, Typography, List, ListItem, Box } from '@mui/material';

const GithubConnect = () => {
  const [repoFullName, setRepoFullName] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [commits, setCommits] = useState([]);

  const fetchCommits = async () => {
    const { data, error } = await supabase
      .from('github_commits')
      .select('*')
      .order('committed_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching commits:', error);
    } else {
      setCommits(data);
    }
  };

  const handleSaveRepo = async () => {
    const { error } = await supabase
      .from('github_repos')
      .insert([{ repo_full_name: repoFullName, webhook_secret: webhookSecret }]);

    if (error) {
      console.error('Error saving repository:', error);
    } else {
      setRepoFullName('');
      setWebhookSecret('');
      fetchCommits();
    }
  };

  useEffect(() => {
    fetchCommits();
  }, []);

  return (
    <Box sx={{ padding: 2, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h4">GitHub Integration</Typography>
      <TextField
        label="Repository Full Name"
        value={repoFullName}
        onChange={(e) => setRepoFullName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Webhook Secret"
        value={webhookSecret}
        onChange={(e) => setWebhookSecret(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button variant="contained" onClick={handleSaveRepo}>
        Save Repository
      </Button>
      <Typography variant="h6" marginTop={2}>Recent Commits</Typography>
      <List>
        {commits.map((commit) => (
          <ListItem key={commit.id}>
            <Typography>{commit.message} - {commit.committed_at}</Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default GithubConnect;