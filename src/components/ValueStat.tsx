import React from 'react';
import { Box, Typography } from '@mui/material';

interface ValueStatProps {
  label: string;
  value: number;
  currency?: string;
  className?: string; // optional for layout overrides
}

const ValueStat: React.FC<ValueStatProps> = ({ label, value, currency = '$', className = '' }) => {
  const display = `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Box className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 ${className}`}>
      <Typography variant="caption" className="font-semibold tracking-wider uppercase text-white/60">
        {label}
      </Typography>
      <Typography variant="h6" className="mt-1 font-bold">
        {display}
      </Typography>
    </Box>
  );
};

export default ValueStat;