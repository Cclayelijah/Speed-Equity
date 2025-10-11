import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface ValueStatProps {
  label: string;
  value: number;
  currency?: string;
  className?: string;
}

const ValueStat: React.FC<ValueStatProps> = ({ label, value, currency = '$', className = '' }) => {
  const display = `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800} mt={0.5}>
          {display}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ValueStat;