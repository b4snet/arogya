import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardHeader } from './Card';
import { EmptyState } from './EmptyState';
import { ChartSkeleton } from './Skeleton';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  heightClass?: string;
  children: ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  subtitle,
  action,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No telemetry readings recorded in this mission window.',
  emptyAction,
  heightClass = 'h-60',
  children,
  className = '',
}: ChartContainerProps) {
  return (
    <Card padding="md" className={className}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className={`mt-4 w-full ${heightClass}`}>
        {loading ? (
          <ChartSkeleton />
        ) : isEmpty ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="No Telemetry Available"
            description={emptyMessage}
            action={emptyAction}
            compact
          />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
