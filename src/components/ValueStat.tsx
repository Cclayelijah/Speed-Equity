import React from 'react';
import { Box, Typography } from '@mui/material';

interface ValueStatProps {
  label: string;
  value: number;
  currency?: string;
}

const ValueStat: React.FC<ValueStatProps> = ({ label, value, currency = '$' }) => {
  return (
    <Box>
      <Typography variant="h6">{label}</Typography>
      <Typography variant="h4">
        {currency}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Typography>
    </Box>
  );
};

export default ValueStat;