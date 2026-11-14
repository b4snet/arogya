import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'alert';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    'bg-[var(--arogya-surface)] border border-[var(--arogya-border)]',
  elevated:
    'bg-[var(--arogya-surface-elevated)] border border-[var(--arogya-border-strong)]',
  interactive:
    'bg-[var(--arogya-surface)] border border-[var(--arogya-border)] hover:border-[#22D3EE]/40 hover:bg-[var(--arogya-surface-elevated)] transition-colors duration-150 cursor-pointer',
  alert:
    'bg-[#EF4444]/10 border border-[#EF4444]/35',
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
        <h2 className="arogya-h2 text-[var(--arogya-text-primary)] truncate">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
