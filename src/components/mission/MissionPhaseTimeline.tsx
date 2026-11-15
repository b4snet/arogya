import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, FlaskConical, Radio } from 'lucide-react';
import { Card } from '../ui';
import {
  buildMissionPhaseTimeline,
  formatPhaseProfileWindow,
  getPhaseNavigationIndex,
  type MissionPhaseId,
  type MissionPhaseStatus,
  type MissionPhaseTimelineItem,
  type PhaseResearchStatus,
} from '../../engine/missionPhases';

const STATUS_ICON: Record<MissionPhaseStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  active: Radio,
  upcoming: Clock3,
};

const STATUS_ICON_CLASS: Record<MissionPhaseStatus, string> = {
  completed: 'text-[var(--arogya-success-text)]',
  active: 'text-[var(--arogya-info)]',
  upcoming: 'text-[var(--arogya-text-muted)]',
};

const RESEARCH_BADGE_CLASS: Record<PhaseResearchStatus, string> = {
  direct:
    'border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] text-[var(--arogya-info)]',
  'context-only':
    'border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-secondary)]',
  'not-represented':
    'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]',
};

function phaseCardClass(item: MissionPhaseTimelineItem, selected: boolean): string {
  const base =
    'relative flex h-full w-full flex-col rounded-xl border p-3 pl-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A5F]';
  const status =
    item.status === 'active'
      ? 'border-[#1E3A5F] bg-[var(--arogya-selected-bg)]'
      : item.status === 'completed'
        ? 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)]'
        : 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] hover:border-[var(--arogya-border-strong)]';
  return `${base} ${status} ${selected ? 'ring-2 ring-[#1E3A5F]/35' : ''}`;
}

function phaseRailClass(status: MissionPhaseStatus): string {
  if (status === 'active') return 'bg-[var(--arogya-info)]';
  if (status === 'completed') return 'bg-[var(--arogya-success-text)]';
  return 'bg-[var(--arogya-border-strong)]';
}

interface MissionPhaseTimelineProps {
  transitDay: number;
  transitDurationDays: number;
}

export function MissionPhaseTimeline({
  transitDay,
  transitDurationDays,
}: MissionPhaseTimelineProps) {
  const timeline = useMemo(
    () => buildMissionPhaseTimeline({ transitDay, transitDurationDays }),
    [transitDay, transitDurationDays]
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<MissionPhaseId>(
    timeline.currentPhaseId
  );
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentPhase =
    timeline.phases.find((phase) => phase.id === timeline.currentPhaseId) ?? timeline.phases[0];
  const selectedPhase =
    timeline.phases.find((phase) => phase.id === selectedPhaseId) ?? currentPhase;

  if (!selectedPhase || !currentPhase) return null;

  const handlePhaseKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = getPhaseNavigationIndex(index, event.key, timeline.phases.length);
    if (nextIndex == null) return;
    event.preventDefault();
    setSelectedPhaseId(timeline.phases[nextIndex].id);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <Card padding="md" className="space-y-4" data-mission-phase-timeline>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="arogya-h2 text-[var(--arogya-text-primary)]">Mission Timeline</h2>
          <p className="text-xs text-[var(--arogya-text-secondary)]">
            Full mission profile · {timeline.profileTotalDays} planned days, with the outbound
            transit segment driven by the simulation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--arogya-text-secondary)]">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            Simulated demonstration
          </span>
          <span className="rounded-md border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-2.5 py-1 font-mono-tabular text-[11px] font-semibold text-[var(--arogya-info)]">
            Current: {currentPhase.label}
          </span>
        </div>
      </div>

      <p
        role="note"
        className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-3 py-2 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]"
      >
        {timeline.simulatedScopeNote} Research context comes from the bundled NASA OSD-575 serum
        CMP extract; it is archived research observation, not this crew’s measurements.
      </p>

      <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
        {timeline.phases.map((phase) => (
          <span
            key={phase.id}
            className={`${phaseRailClass(phase.status)} ${
              phase.status === 'upcoming' ? 'opacity-45' : ''
            } ${phase.id === selectedPhase.id ? 'ring-1 ring-inset ring-white/60' : ''}`}
            style={{ width: `${(phase.plannedDurationDays / timeline.profileTotalDays) * 100}%` }}
          />
        ))}
      </div>

      <ol
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Mission lifecycle phases. Use arrow keys to move between phases."
      >
        {timeline.phases.map((phase, index) => {
          const selected = phase.id === selectedPhase.id;
          const StatusIcon = STATUS_ICON[phase.status];
          return (
            <li key={phase.id}>
              <button
                ref={(element) => {
                  buttonRefs.current[index] = element;
                }}
                type="button"
                tabIndex={selected ? 0 : -1}
                aria-pressed={selected}
                aria-current={phase.status === 'active' ? 'step' : undefined}
                aria-controls="mission-phase-detail"
                data-mission-phase={phase.id}
                data-phase-status={phase.status}
                onClick={() => setSelectedPhaseId(phase.id)}
                onKeyDown={(event) => handlePhaseKeyDown(event, index)}
                className={phaseCardClass(phase, selected)}
              >
                <span
                  className={`absolute inset-y-1 left-1 w-1 rounded-full ${phaseRailClass(phase.status)}`}
                  aria-hidden="true"
                />
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-[10px] font-semibold text-[var(--arogya-text-muted)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold ${STATUS_ICON_CLASS[phase.status]}`}
                  >
                    <StatusIcon
                      className={`h-3.5 w-3.5 ${phase.status === 'active' ? 'motion-safe:animate-pulse' : ''}`}
                      aria-hidden="true"
                    />
                    {phase.statusLabel}
                  </span>
                </span>
                <span className="mt-1.5 text-sm font-semibold text-[var(--arogya-text-primary)]">
                  {phase.label}
                </span>
                <span className="mt-0.5 text-[11px] leading-snug text-[var(--arogya-text-secondary)]">
                  {phase.elapsedLabel}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded border border-[var(--arogya-border)] bg-white/60 px-1.5 py-0.5 text-[9px] font-medium text-[var(--arogya-text-secondary)]">
                    Simulated demonstration
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${RESEARCH_BADGE_CLASS[phase.research.status]}`}
                  >
                    {phase.research.badgeLabel}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <section
        id="mission-phase-detail"
        aria-live="polite"
        data-phase-detail={selectedPhase.id}
        className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-muted)]">
              Phase detail
            </p>
            <h3 className="text-base font-semibold text-[var(--arogya-text-primary)]">
              {selectedPhase.label}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--arogya-text-secondary)]">
              Simulated demonstration
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${RESEARCH_BADGE_CLASS[selectedPhase.research.status]}`}
            >
              <FlaskConical className="h-3 w-3" aria-hidden="true" />
              {selectedPhase.research.badgeLabel}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              {selectedPhase.description}
            </p>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--arogya-text-primary)]">
                Health considerations
              </h4>
              <ul className="mt-1.5 space-y-1.5">
                {selectedPhase.healthConsiderations.map((consideration) => (
                  <li
                    key={consideration}
                    className="flex gap-2 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--arogya-info)]"
                      aria-hidden="true"
                    />
                    <span>{consideration}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
                  Simulated elapsed time
                </dt>
                <dd className="mt-1 font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
                  {selectedPhase.elapsedLabel}
                </dd>
              </div>
              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
                  Planned window
                </dt>
                <dd className="mt-1 font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
                  {formatPhaseProfileWindow(selectedPhase)}
                </dd>
                <dd className="mt-0.5 text-[10px] text-[var(--arogya-text-secondary)]">
                  {selectedPhase.plannedDurationLabel}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] p-3">
              <h4 className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--arogya-info)]">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                NASA research context
              </h4>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                {selectedPhase.research.detail}
              </p>
              {selectedPhase.research.timepoints.length > 0 && (
                <p className="mt-2 font-mono-tabular text-[10px] text-[var(--arogya-text-secondary)]">
                  OSD-575 timepoints: {selectedPhase.research.timepoints.join(', ')}
                </p>
              )}
              {selectedPhase.research.analytes.length > 0 && (
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
                  CMP analytes in context: {selectedPhase.research.analytes.join(', ')}
                </p>
              )}
              <p className="mt-2 text-[10px] font-medium text-[var(--arogya-text-muted)]">
                Research observation only. Not this crew’s measurements and not a medical finding.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Card>
  );
}
