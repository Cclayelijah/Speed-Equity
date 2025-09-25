import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Typography, Box, Grid } from '@mui/material';
import { LineChart, BarChart } from '@mui/x-charts';
import KpiCard from '../../components/KpiCard';
import { useNavigate } from 'react-router-dom';

type DailyEntry = {
  entry_date: string;
  sweat_equity_earned: number;
  money_lost: number;
};

const Dashboard = () => {
  const [projectStats, setProjectStats] = useState<any>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: stats } = await supabase
        .from('project_stats')
        .select('*')
        .single();

      const { data: entries, error } = await supabase
        .from('daily_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching daily entries:', error);
        setLoading(false);
        return;
      }

      setProjectStats(stats);
      setDailyEntries(entries);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!projectStats) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">No project stats available.</Typography>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <button
            onClick={() => navigate('/checkin')}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Submit Report
          </button>
        </Box>
      </Box>
    );
  }

  const dates = dailyEntries.map(entry => entry.entry_date);
  const cumulativeSweatEquity = dailyEntries.map(entry => entry.sweat_equity_earned);
  const dailyMoneyLost = dailyEntries.map(entry => entry.money_lost);

  return (
    <Box>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2}}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Box sx={{ mb: 2 }}>
          <button
            onClick={() => navigate('/checkin')}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Submit Report
          </button>
        </Box>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Implied $/hr" value={projectStats.implied_hour_value} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Hours Worked" value={projectStats.total_hours_worked} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Hours Wasted" value={projectStats.total_hours_wasted} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Sweat Equity Earned" value={projectStats.sweat_equity_earned} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Money Lost" value={projectStats.money_lost} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Net Progress" value={projectStats.net_progress} />
        </Grid>
      </Grid>
      <Box mt={4}>
        <Grid container spacing={2} sx={{ width: '100%' }}>
          <Grid item xs={12} md={6} sx={{ minWidth: 0, p: 0, display: 'flex', justifyContent: 'center' }}>
            <LineChart
              xAxis={[{ data: dates }]}
              series={[
                { data: cumulativeSweatEquity, label: 'Cumulative Sweat Equity ($)' },
              ]}
              height={500}
              width={600}
              style={{ width: '100%' }}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ minWidth: 0, p: 0, display: 'flex', justifyContent: 'center' }}>
            <BarChart
              xAxis={[{ data: dates }]}
              series={[{ data: dailyMoneyLost, label: 'Daily Money Lost ($)' }]}
              height={500}
              width={600}
              style={{ width: '100%' }}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;