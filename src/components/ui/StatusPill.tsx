import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { HealthStatusLevel } from '../../types';

export type StatusTone = 'success' | 'warning' | 'caution' | 'critical';

const TONE_MAP: Record<
  StatusTone,
  {
    bg: string;
    border: string;
    text: string;
    icon: typeof CheckCircle2;
    defaultLabel: string;
  }
> = {
  success: {
    bg: 'bg-[var(--arogya-success-soft)]',
    border: 'border-[var(--arogya-success-border)]',
    text: 'text-[var(--arogya-success-text)]',
    icon: CheckCircle2,
    defaultLabel: 'Nominal',
  },
  warning: {
    bg: 'bg-[var(--arogya-warning-soft)]',
    border: 'border-[var(--arogya-warning-border)]',
    text: 'text-[var(--arogya-warning-text)]',
    icon: AlertCircle,
    defaultLabel: 'Monitor',
  },
  caution: {
    bg: 'bg-[var(--arogya-caution-soft)]',
    border: 'border-[var(--arogya-caution-border)]',
    text: 'text-[var(--arogya-caution-text)]',
    icon: AlertTriangle,
    defaultLabel: 'Elevated',
  },
  critical: {
    bg: 'bg-[var(--arogya-critical-soft)]',
    border: 'border-[var(--arogya-critical-border)]',
    text: 'text-[var(--arogya-critical-text)]',
    icon: ShieldAlert,
    defaultLabel: 'Medical Review',
  },
};

export function healthStatusToTone(status: HealthStatusLevel): StatusTone {
  switch (status) {
    case 'red':
      return 'critical';
    case 'orange':
      return 'caution';
    case 'yellow':
      return 'warning';
    default:
      return 'success';
  }
}

interface StatusPillProps {
  tone: StatusTone;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({
  tone,
  label,
  size = 'sm',
  className = '',
}: StatusPillProps) {
  const cfg = TONE_MAP[tone];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border font-medium ${cfg.bg} ${cfg.border} ${cfg.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label ?? cfg.defaultLabel}</span>
    </span>
  );
}
