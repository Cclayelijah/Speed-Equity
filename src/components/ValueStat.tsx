import React from "react";
import { Typography } from "@mui/material";
import { Card, CardContent } from "@/components/ui/brand";

interface ValueStatProps {
  label: string;
  value: number;
  currency?: string;
  className?: string;
}

export default function ValueStat({
  label,
  value,
  currency = "$",
  className = "",
}: ValueStatProps) {
  const display = `${currency}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <Card accent className={className}>
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
}
