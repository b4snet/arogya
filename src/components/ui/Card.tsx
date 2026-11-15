import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'alert';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    'bg-white border border-[var(--arogya-border)] shadow-sm',
  elevated:
    'bg-white border border-[var(--arogya-border)] shadow-md',
  interactive:
    'bg-white border border-[var(--arogya-border)] hover:border-[#1E3A5F]/40 hover:bg-[#F8FAFC] transition-colors duration-150 cursor-pointer shadow-sm',
  // Opaque alert surface: cards may sit over the Dashboard's backdrop video.
  alert:
    'bg-[#FEF2F2] border border-[#DC2626]/30',
};

const PADDING_CLASSES: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-xl ${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="arogya-h2 text-[var(--arogya-text-primary)] truncate font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
