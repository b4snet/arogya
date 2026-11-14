import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
}

export function ErrorState({
  title = 'Unable to Display This Section Right Now',
  description = 'A local display issue interrupted this view. Your saved mission telemetry remains safe on this device.',
  action,
  secondaryAction,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-xl border border-[#F97316]/35 bg-[var(--arogya-surface)] text-center ${
        compact ? 'p-5' : 'px-6 py-12'
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[#F97316]/35 bg-[#F97316]/10 text-[#FB923C]">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>
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
