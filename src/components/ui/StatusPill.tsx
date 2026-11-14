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
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/35',
    text: 'text-[#4ADE80]',
    icon: CheckCircle2,
    defaultLabel: 'Nominal',
  },
  warning: {
    bg: 'bg-[#EAB308]/10',
    border: 'border-[#EAB308]/35',
    text: 'text-[#FACC15]',
    icon: AlertCircle,
    defaultLabel: 'Monitor',
  },
  caution: {
    bg: 'bg-[#F97316]/12',
    border: 'border-[#F97316]/40',
    text: 'text-[#FB923C]',
    icon: AlertTriangle,
    defaultLabel: 'Elevated',
  },
  critical: {
    bg: 'bg-[#EF4444]/14',
    border: 'border-[#EF4444]/45',
    text: 'text-[#F87171]',
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
