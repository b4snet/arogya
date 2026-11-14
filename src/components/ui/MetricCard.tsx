import type { ReactNode } from 'react';
import { Card } from './Card';
import { StatusPill, type StatusTone } from './StatusPill';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  referenceRange?: string;
  tone?: StatusTone;
  statusLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  referenceRange,
  tone,
  statusLabel,
  icon,
  className = '',
}: MetricCardProps) {
  return (
    <Card padding="md" className={className}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-[var(--arogya-text-secondary)]">
          {label}
        </span>
        {tone ? (
          <StatusPill tone={tone} label={statusLabel} />
        ) : (
          icon && <span className="text-[var(--arogya-text-secondary)]">{icon}</span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono-tabular text-2xl font-semibold text-[var(--arogya-text-primary)]">
          {value}
        </span>
        {unit && (
          <span className="font-mono-tabular text-xs uppercase text-[var(--arogya-text-secondary)]">
            {unit}
          </span>
        )}
      </div>

      {(delta || referenceRange) && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--arogya-border)] pt-2 text-[11px] text-[var(--arogya-text-secondary)]">
          <span className="font-mono-tabular">{delta ?? 'Baseline'}</span>
          {referenceRange && (
            <span className="font-mono-tabular text-[var(--arogya-text-muted)]">
              Ref {referenceRange}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
