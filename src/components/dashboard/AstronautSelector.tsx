import { useMemo, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useArogyaStore } from '../../store/useArogyaStore';
import { evaluateHealthAssessment } from '../../engine/healthEngine';
import { STATUS_META } from '../../engine/thresholds';
import { AstronautAvatar } from '../ui/AstronautAvatar';

interface AstronautSelectorProps {
  id?: string;
  compact?: boolean;
  variant?: 'compact' | 'bar';
  showDemoReset?: boolean;
}

export function AstronautSelector({
  id = 'crew-selector',
  compact = false,
  variant,
  showDemoReset = false,
}: AstronautSelectorProps) {
  const astronauts = useArogyaStore((s) => s.astronauts);
  const activeAstronautId = useArogyaStore((s) => s.activeAstronautId);
  const mission = useArogyaStore((s) => s.mission);
  const vitalsByAstronaut = useArogyaStore((s) => s.vitalsByAstronaut);
  const checkInsByAstronaut = useArogyaStore((s) => s.checkInsByAstronaut);
  const setActiveAstronaut = useArogyaStore((s) => s.setActiveAstronaut);
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const [resetFeedback, setResetFeedback] = useState(false);

  const resolvedVariant = variant ?? (compact ? 'compact' : 'bar');

  const crewSnapshots = useMemo(
    () =>
      astronauts.map((member) => {
        const vitals = vitalsByAstronaut[member.id] ?? [];
        const checkIns = checkInsByAstronaut[member.id] ?? [];
        const evalResult = evaluateHealthAssessment(member, checkIns, vitals, mission);
        return {
          member,
          status: evalResult.overallStatus,
          score: evalResult.overallReadinessScore,
        };
      }),
    [astronauts, vitalsByAstronaut, checkInsByAstronaut, mission]
  );

  const activeSnapshot =
    crewSnapshots.find((c) => c.member.id === activeAstronautId) ?? crewSnapshots[0];

  const handleDemoReset = () => {
    resetDemoData();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2600);
  };

  if (resolvedVariant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Select active crew member
        </label>
        {activeSnapshot && (
          <AstronautAvatar
            astronautId={activeSnapshot.member.id}
            fullName={activeSnapshot.member.fullName}
            status={activeSnapshot.status}
            size="sm"
            active
          />
        )}
        <select
          id={id}
          value={activeAstronautId}
          onChange={(e) => setActiveAstronaut(e.target.value)}
          className="h-11 max-w-[190px] rounded-[var(--radius-md)] border border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-2.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:border-[var(--arogya-border-strong)] focus:border-[var(--arogya-accent-primary)] sm:h-9 sm:max-w-[205px]"
        >
          {crewSnapshots.map(({ member }) => (
            <option key={member.id} value={member.id}>
              {member.fullName} ({member.callSign})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <section
      aria-label="Crew Astronaut Selector"
      className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)]/92 p-3 sm:px-4 sm:py-3"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="radiogroup"
          aria-label="Switch active astronaut"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-wrap lg:items-center"
        >
          {crewSnapshots.map(({ member, status, score }) => {
            const isSelected = member.id === activeAstronautId;
            const statusMeta = STATUS_META[status];
            return (
              <button
                key={member.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setActiveAstronaut(member.id)}
                className={`group flex min-h-[48px] items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#1E3A5F] lg:min-w-[240px] lg:flex-1 ${
                  isSelected
                    ? 'border-[#1E3A5F] bg-[var(--arogya-selected-bg)] shadow-[0_0_0_1px_rgba(30,58,95,0.25)]'
                    : 'border-[var(--arogya-border)] bg-[var(--arogya-bg)]/70 hover:border-[var(--arogya-border-strong)] hover:bg-[var(--arogya-surface-elevated)]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AstronautAvatar
                    astronautId={member.id}
                    fullName={member.fullName}
                    status={status}
                    size="sm"
                    active={isSelected}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-[var(--arogya-text-primary)]">
                        {member.fullName}
                      </span>
                    </div>
                    <p className="truncate font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                      {member.callSign} · {score}/100 ·{' '}
                      <span style={{ color: statusMeta.colorHex }}>{statusMeta.shortLabel}</span>
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--arogya-info)]">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    <span>Active</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {showDemoReset && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--arogya-border)] pt-2.5 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            {resetFeedback && (
              <span
                role="status"
                aria-live="polite"
                className="text-[11px] font-medium text-[var(--arogya-success-text)]"
              >
                Demo dataset restored
              </span>
            )}
            <button
              type="button"
              onClick={handleDemoReset}
              title="Restore original mock dataset for all three astronauts"
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:border-[#1E3A5F]/60 hover:text-[var(--arogya-info)] focus-visible:outline-2 focus-visible:outline-[#1E3A5F]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
              <span>Demo Mission</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
