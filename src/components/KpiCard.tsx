import React from "react";
import { Typography } from "@mui/material";
import { Card, CardContent } from "@/components/ui/brand";

interface KpiCardProps {
  title: string;
  value: number | null | undefined;
  /** Optional mini-sparkline path ("d" attribute). Rendered only if valid string without "undefined". */
  d?: string;
  className?: string;
}

const isValidPath = (d?: string) =>
  typeof d === "string" && d.length > 0 && !d.includes("undefined");

export default function KpiCard({ title, value, d, className }: KpiCardProps) {
  const display =
    value !== null && value !== undefined
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "—";

  return (
    <Card accent className={className}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={800} mt={0.5}>
          {display}
        </Typography>

        {isValidPath(d) && (
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            className="mt-2 text-white/60"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={d!}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </CardContent>
    </Card>
  );
}
