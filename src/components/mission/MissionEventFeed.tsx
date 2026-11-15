import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ClipboardCheck,
  Compass,
  FileText,
  FlaskConical,
  ListChecks,
  PlayCircle,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import type { CheckIn, Report } from '../../types';
import type { MissionPhaseTimelineItem } from '../../engine/missionPhases';
import {
  buildMissionEventFeed,
  type MissionEvent,
  type MissionEventKind,
  type MissionPhaseChangeInput,
} from '../../engine/missionEvents';
import { NASA_CMP_DATASET } from '../../data/researchLibrary';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import { Card, CardHeader } from '../ui';
import { MissionSourceBadge } from './MissionSourceBadge';

const EVENT_ICONS: Record<MissionEventKind, ReactNode> = {
  simulation: <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  scenario: <Activity className="h-3.5 w-3.5" aria-hidden="true" />,
  anomaly: <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />,
  phase: <Compass className="h-3.5 w-3.5" aria-hidden="true" />,
  'check-in': <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />,
  report: <FileText className="h-3.5 w-3.5" aria-hidden="true" />,
  research: <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />,
};

function formatEventTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSimulatedClock(seconds: number): string {
  const bounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(bounded / 60);
  const remainder = bounded % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function MissionEventRow({ event }: { event: MissionEvent }) {
  return (
    <li className="min-w-0 py-3" data-mission-event-kind={event.kind}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
          {EVENT_ICONS[event.kind]}
          <span>{event.typeLabel}</span>
        </span>
        <time
          dateTime={event.timestampIso}
          className="font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]"
        >
          {formatEventTimestamp(event.timestampIso)}
        </time>
        <MissionSourceBadge source={event.source} />
        {event.simulatedSecond != null && (
          <span className="font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
            sim clock {formatSimulatedClock(event.simulatedSecond)}
          </span>
        )}
      </div>
      <p className="mt-1 break-words text-xs leading-relaxed text-[var(--arogya-text-primary)]">
        {event.description}
      </p>
      {event.link && event.linkLabel && (
        <Link
          to={event.link}
          className="mt-1 inline-flex items-center gap-1 rounded-sm text-[11px] font-semibold text-[var(--arogya-info)] underline decoration-[var(--arogya-info)]/40 underline-offset-2 hover:decoration-[var(--arogya-info)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
        >
          {event.linkLabel}
        </Link>
      )}
    </li>
  );
}

export function MissionEventFeed({
  astronautId,
  checkIns,
  reports,
  currentPhase,
}: {
  astronautId: string;
  checkIns: CheckIn[];
  reports: Report[];
  currentPhase: Pick<MissionPhaseTimelineItem, 'id' | 'label' | 'research'>;
}) {
  const simulationTimeline = useSimulatedTelemetryStore((state) => state.timeline);
  const [phaseChanges, setPhaseChanges] = useState<MissionPhaseChangeInput[]>([]);
  const previousPhaseRef = useRef({ id: currentPhase.id, label: currentPhase.label });

  useEffect(() => {
    const previous = previousPhaseRef.current;
    if (previous.id === currentPhase.id) return;

    const atIso = new Date().toISOString();
    setPhaseChanges((changes) => [
      ...changes.slice(-7),
      {
        id: `phase-${currentPhase.id}-${atIso}`,
        atIso,
        previousLabel: previous.label,
        nextLabel: currentPhase.label,
      },
    ]);
    previousPhaseRef.current = { id: currentPhase.id, label: currentPhase.label };
  }, [currentPhase.id, currentPhase.label]);

  const feed = useMemo(
    () =>
      buildMissionEventFeed({
        astronautId,
        simulationEvents: simulationTimeline,
        phaseChanges,
        checkIns,
        reports,
        research: {
          phaseId: currentPhase.id,
          phaseLabel: currentPhase.label,
          research: currentPhase.research,
        },
        researchRetrievedAtIso: NASA_CMP_DATASET.provenance.retrievedAt,
        limit: 20,
      }),
    [astronautId, simulationTimeline, phaseChanges, checkIns, reports, currentPhase]
  );

  return (
    <Card padding="md" className="min-w-0 space-y-3">
      <CardHeader
        title="Mission Event Feed"
        subtitle="Chronological lifecycle, scenario, recorded, and research context"
        action={
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--arogya-text-secondary)]">
            <ListChecks className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />
            <span>{feed.totalCount} events</span>
          </span>
        }
      />

      {feed.events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-3 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          No mission events yet. Start a simulated session on the Dashboard, submit a check-in,
          or generate a report; those events and the current OSD-575 research context will appear
          here.
        </p>
      ) : (
        <div role="log" aria-live="polite" aria-relevant="additions">
          <ol className="divide-y divide-[var(--arogya-border)]">
            {feed.events.map((event) => (
              <MissionEventRow key={event.id} event={event} />
            ))}
          </ol>
        </div>
      )}

      {feed.truncated && (
        <p className="text-[10px] text-[var(--arogya-text-muted)]">
          Showing the latest {feed.events.length} of {feed.totalCount} events.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--arogya-border)] pt-3 text-[10px] text-[var(--arogya-text-muted)]">
        <RotateCcw className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          Simulation and phase events are in memory only. Check-ins and reports are browser-local
          records. Research context is archived OSD-575 data. Nothing is transmitted automatically.
        </span>
      </div>
    </Card>
  );
}
