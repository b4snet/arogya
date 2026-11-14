import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Database,
  Minus,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { StatusPill, healthStatusToTone } from '../ui';
import { REPORTS_EXACT_DISCLAIMER } from '../../engine/reportGenerator';
import { STATUS_META } from '../../engine/thresholds';
import type { Report, ReportTrendItem } from '../../types';

function TrendDirectionBadge({ direction }: { direction: ReportTrendItem['direction'] }) {
  if (direction === 'improving') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#22C55E]/35 bg-[#22C55E]/10 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-[#4ADE80]">
        <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>IMPROVING</span>
      </span>
    );
  }
  if (direction === 'worsening') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#F97316]/40 bg-[#F97316]/12 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-[#FB923C]">
        <TrendingDown className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>WORSENING</span>
      </span>
    );
  }
  if (direction === 'insufficient') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[var(--arogya-border-strong)] bg-white/[0.04] px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-[var(--arogya-text-secondary)]">
        <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>INSUFFICIENT DATA</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[var(--arogya-border-strong)] bg-white/[0.04] px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-[var(--arogya-text-secondary)]">
      <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>STABLE</span>
    </span>
  );
}

export function HealthReportCard({
  report,
  fallbackAstronautName,
  fallbackAstronautRole,
  fallbackMissionName,
}: {
  report: Report;
  fallbackAstronautName: string;
  fallbackAstronautRole: string;
  fallbackMissionName: string;
}) {
  const astronautName = report.astronautName ?? fallbackAstronautName;
  const astronautRole = report.astronautRole ?? fallbackAstronautRole;
  const missionName = report.missionName ?? fallbackMissionName;
  const periodText =
    report.periodLabel ?? `Last ${report.attachedVitalsWindowDays} Days`;
  const daySpanText =
    report.windowStartDay != null && report.windowEndDay != null
      ? report.windowStartDay === report.windowEndDay
        ? `Mission Day ${report.windowEndDay}`
        : `Mission Days ${report.windowStartDay}–${report.windowEndDay}`
      : `Mission Day ${report.missionDay}`;

  const systemSnapshots = report.systemSnapshots ?? [];
  const keyFindings = report.keyFindings ?? [];
  const trends = report.trends ?? [];
  const completedActions = report.actionTracking?.completed ?? [];
  const missedActions = report.actionTracking?.missed ?? [];
  const symptomsTimeline = report.symptomsTimeline ?? [];
  const riskFactors = report.riskFactors ?? [];

  return (
    <article
      aria-label={`Health Report Card for ${astronautName}`}
      className="print-report-sheet rounded-xl border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)] p-5 sm:p-7"
    >
      {/* Header Block: Astronaut, Mission, Timestamp, Score & Status */}
      <header className="print-avoid-break border-b border-[var(--arogya-border)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--arogya-text-secondary)]">
              <span className="font-mono-tabular font-semibold text-[#38BDF8]">
                {report.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>Prepared for {report.preparedForRole}</span>
              {report.conciseMedicalMode && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="rounded border border-[#22D3EE]/40 bg-[#22D3EE]/10 px-1.5 py-0.5 font-semibold text-[#22D3EE]">
                    CONCISE MEDICAL BRIEF
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono-tabular">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Generated {new Date(report.createdAtIso).toLocaleString()}
              </span>
            </div>

            <h2 className="arogya-display text-[var(--arogya-text-primary)]">
              {astronautName}
            </h2>

            <p className="text-sm text-[var(--arogya-text-secondary)]">
              <strong className="font-medium text-[var(--arogya-text-primary)]">
                {astronautRole}
              </strong>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{missionName}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                Day {report.missionDay} ({periodText}: {daySpanText})
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="print-report-card rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-4 py-2.5 text-right">
              <p className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
                Mission-Readiness Score
              </p>
              <p className="mt-0.5 font-mono-tabular text-2xl font-bold text-[var(--arogya-text-primary)]">
                {report.readinessScoreAtGeneration}
                <span className="ml-1 text-xs font-normal text-[var(--arogya-text-muted)]">
                  / 100
                </span>
              </p>
            </div>

            <div className="space-y-1.5 text-right">
              <p className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
                Overall Status
              </p>
              <StatusPill
                tone={healthStatusToTone(report.overallStatus)}
                label={STATUS_META[report.overallStatus].label}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Escalation Status Bar */}
        <div
          className={`mt-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${
            report.escalationRequired
              ? 'border-[#EF4444]/45 bg-[#EF4444]/10 text-[#FCA5A5]'
              : 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-secondary)]'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                report.escalationRequired ? 'text-[#F87171]' : 'text-[#38BDF8]'
              }`}
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-[var(--arogya-text-primary)]">
                Escalation Status:{' '}
                {report.escalationRequired
                  ? 'Medical Escalation Required — Contact Crew Medical Officer / Flight Surgeon'
                  : 'Routine Monitoring — No automatic escalation thresholds met'}
              </p>
              {report.escalationRequired &&
                report.escalationReasons &&
                report.escalationReasons.length > 0 && (
                  <p className="mt-0.5">{report.escalationReasons.join(' · ')}</p>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* Executive Summary / Situation */}
      <section className="print-avoid-break border-b border-[var(--arogya-border)] py-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
          Situation Summary
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--arogya-text-primary)]">
          {report.situation}
        </p>
      </section>

      {/* 8 Body-System Status Cards */}
      {systemSnapshots.length > 0 && (
        <section className="border-b border-[var(--arogya-border)] py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
            Body-System Status Cards
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {systemSnapshots.map((sys) => (
              <div
                key={sys.systemId}
                className="print-report-card flex flex-col justify-between rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold text-[var(--arogya-text-primary)]">
                      {sys.label}
                    </h4>
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--arogya-text-secondary)]">
                      {sys.score}/100
                    </span>
                  </div>
                  <div className="mt-2">
                    <StatusPill
                      tone={healthStatusToTone(sys.status)}
                      label={STATUS_META[sys.status].shortLabel}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                    {sys.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Findings & Trends */}
      <div className="grid grid-cols-1 gap-6 border-b border-[var(--arogya-border)] py-5 lg:grid-cols-2">
        <section className="print-avoid-break space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
            Key Findings
          </h3>
          {keyFindings.length > 0 ? (
            <ul className="space-y-2 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
              {keyFindings.map((finding, idx) => (
                <li
                  key={`${idx}-${finding.slice(0, 20)}`}
                  className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3 py-2"
                >
                  {finding}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--arogya-text-secondary)]">
              {report.assessmentSummary}
            </p>
          )}
        </section>

        <section className="print-avoid-break space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
            Period Trends vs Personal Baseline
          </h3>
          {trends.length > 0 ? (
            <div className="divide-y divide-[var(--arogya-border)] rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)]">
              {trends.map((t) => (
                <div
                  key={t.metric}
                  className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--arogya-text-primary)]">
                      {t.metric}
                    </span>
                    <TrendDirectionBadge direction={t.direction} />
                  </div>
                  <div className="text-right font-mono-tabular">
                    <p className="text-[var(--arogya-text-primary)]">{t.periodSummary}</p>
                    <p className="text-[11px] text-[var(--arogya-text-muted)]">
                      {t.baselineComparison}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--arogya-text-secondary)]">
              {report.background}
            </pre>
          )}
        </section>
      </div>

      {/* Completed & Missed Health Actions */}
      <section className="print-avoid-break border-b border-[var(--arogya-border)] py-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
          Completed & Missed Health Actions
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-[#4ADE80]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Completed Actions</span>
            </h4>
            {completedActions.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
                {completedActions.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ClipboardCheck
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4ADE80]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--arogya-text-secondary)]">
                No completed countermeasure or check-in actions logged in this period.
              </p>
            )}
          </div>

          <div className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-[#FACC15]">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Missed or Incomplete Actions</span>
            </h4>
            {missedActions.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
                {missedActions.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FACC15]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--arogya-text-secondary)]">
                All expected daily check-ins, counters, and telemetry captures were met in this period.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Symptoms Timeline & Risk Factors */}
      <div className="grid grid-cols-1 gap-6 border-b border-[var(--arogya-border)] py-5 lg:grid-cols-2">
        <section className="print-avoid-break space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
              Symptoms Timeline
            </h3>
            {!report.includePrivateNotes && (
              <span className="rounded border border-[var(--arogya-border-strong)] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[var(--arogya-text-secondary)]">
                Private notes withheld
              </span>
            )}
          </div>
          {symptomsTimeline.length > 0 ? (
            <ol className="space-y-2">
              {symptomsTimeline.map((entry) => (
                <li
                  key={entry.missionDay}
                  className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">
                      Mission Day {entry.missionDay}
                    </span>
                    <span className="font-medium text-[#FB923C]">
                      {entry.symptoms.join(' · ')}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="mt-1 text-[var(--arogya-text-secondary)]">
                      Crew note: &ldquo;{entry.notes}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <div className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3.5 py-3 text-xs text-[var(--arogya-text-secondary)]">
              No active symptoms or symptom notes logged across this period.
            </div>
          )}
        </section>

        <section className="print-avoid-break space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
            Identified Risk Factors
          </h3>
          <ul className="space-y-2 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
            {riskFactors.map((risk) => (
              <li
                key={risk}
                className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3.5 py-2.5"
              >
                {risk}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recommendations */}
      <section className="print-avoid-break border-b border-[var(--arogya-border)] py-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
          Prioritized Recommendations (Decision-Support Only)
        </h3>
        <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
          {report.recommendations.map((rec) => (
            <li
              key={rec}
              className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3.5 py-2.5"
            >
              {rec}
            </li>
          ))}
        </ul>
      </section>

      {/* Data-Quality Notes */}
      <section className="print-avoid-break border-b border-[var(--arogya-border)] py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Data-Quality Notes</span>
          </h3>
          {report.dataCompletenessPercent != null && (
            <span className="font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
              Telemetry Completeness: {report.dataCompletenessPercent}%
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          {report.dataQualityNote ?? report.background}
        </p>
      </section>

      {/* Mandatory Exact Disclaimer */}
      <footer className="print-avoid-break pt-4">
        <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          {REPORTS_EXACT_DISCLAIMER}
        </p>
      </footer>
    </article>
  );
}
