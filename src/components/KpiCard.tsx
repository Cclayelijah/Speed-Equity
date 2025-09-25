import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface KpiCardProps {
  title: string;
  value: number | null | undefined;
  d?: string;
}

// Simple validation: only render if d is a non-empty string and does not contain "undefined"
const isValidPath = (d?: string) =>
  typeof d === 'string' && d.length > 0 && !d.includes('undefined');

const KpiCard: React.FC<KpiCardProps> = ({ title, value, d }) => (
  <Card variant="outlined" sx={{ margin: 2, padding: 2 }}>
    <CardContent>
      <Typography variant="subtitle1">{title}</Typography>
      <Typography variant="h5">
        {value !== null && value !== undefined
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : '--'}
      </Typography>
      {isValidPath(d) && <svg width="40" height="40"><path d={d!} /></svg>}
    </CardContent>
  </Card>
);

export default KpiCard;