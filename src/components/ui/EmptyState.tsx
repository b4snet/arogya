import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)] text-center ${
        compact ? 'h-full p-5' : 'px-6 py-12'
      }`}
    >
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-accent-primary)]">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-[var(--arogya-text-primary)]">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
