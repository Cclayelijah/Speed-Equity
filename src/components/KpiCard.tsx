import React from 'react';

interface KpiCardProps {
  title: string;
  value: number | null | undefined;
  d?: string;
}

// Only render if d is a non-empty string and does not contain "undefined"
const isValidPath = (d?: string) =>
  typeof d === 'string' && d.length > 0 && !d.includes('undefined');

const KpiCard: React.FC<KpiCardProps> = ({ title, value, d }) => {
  const display =
    value !== null && value !== undefined
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : '—';

  return (
    <div className="relative p-4 overflow-hidden card sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500/70 via-rose-400/70 to-cyan-400/70" />
      <div className="text-[10px] tracking-wider uppercase font-semibold text-white/60">
        {title}
      </div>
      <div className="mt-1 text-2xl font-bold">{display}</div>

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
    </div>
  );
};

export default KpiCard;