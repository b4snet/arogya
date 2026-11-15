import {
  AlertTriangle,
  Clock,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import type { Astronaut, Mission, Report, ReportTrendItem } from '../../types';
import {
  MISSING_VALUE_TEXT,
  NOT_APPLICABLE_TEXT,
  NOT_PROVIDED_TEXT,
  REPORT_CANONICAL_UNIT_NOTE,
  REPORT_PROVENANCE_LABEL,
  REPORT_PROTOTYPE_LABEL,
  REPORT_SAFETY_STATEMENT,
  barcodePayloadForReport,
  buildReportReferenceMatrix,
  buildReportTrendSeries,
  buildReportVitalRows,
} from '../../engine/reportSnapshot';
import { REPORTS_EXACT_DISCLAIMER } from '../../engine/reportGenerator';
import { STATUS_META } from '../../engine/thresholds';
import { STATUS_GUIDANCE_COPY } from '../../engine/atlasPanelBuilder';
import { ReportBarcode } from './ReportBarcode';
import { ReportReferenceMatrix } from './ReportReferenceMatrix';
import { ReportVitalSignsTable } from './ReportVitalSignsTable';
import { ReportTrendCharts } from './ReportTrendCharts';

const TREND_LABEL: Record<ReportTrendItem['direction'], string> = {
  improving: 'Improving',
  worsening: 'Worsening',
  stable: 'Stable',
  insufficient: 'Insufficient data',
};

function timezoneLabel(date: Date): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'local time';
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  return `${zone} (UTC${sign}${hours}:${minutes})`;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dashed border-[var(--arogya-border)] py-1 last:border-b-0">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[11px] font-medium text-[var(--arogya-text-primary)]">
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1E3A5F]"
    >
      {children}
    </h3>
  );
}

interface HealthReportCardProps {
  report: Report;
  astronaut: Astronaut;
  mission: Mission;
}

/**
 * Printable medical-style observation report.
 *
 * Structure: letterhead → two-column metadata → current vital signs snapshot → reference-range
 * and escalation matrix → observations and follow-up → recorded trend graphs → safety statement
 * and disclaimer. All values come from the report's immutable recorded snapshot.
 */
export function HealthReportCard({ report, astronaut, mission }: HealthReportCardProps) {
  const astronautName = report.astronautName ?? astronaut.fullName;
  const astronautRole = report.astronautRole ?? astronaut.role;
  const missionName = report.missionName ?? mission.name;

  const snapshotVitals = report.snapshotVitals ?? [];
  const snapshotCheckIns = report.snapshotCheckIns ?? [];
  const latestVital = snapshotVitals.length > 0 ? snapshotVitals[snapshotVitals.length - 1] : null;
  const latestCheckIn = snapshotCheckIns.length > 0 ? snapshotCheckIns[snapshotCheckIns.length - 1] : null;

  const vitalRows = buildReportVitalRows({ astronaut, latestVital, latestCheckIn });
  const matrixRows = buildReportReferenceMatrix(astronaut);

  const startDay = report.windowStartDay ?? report.missionDay;
  const endDay = report.windowEndDay ?? report.missionDay;
  const trendSeries = buildReportTrendSeries({
    vitals: snapshotVitals,
    checkIns: snapshotCheckIns,
    startDay,
    endDay,
    sourceLabel: 'Arogya recorded mission observations (on-device record)',
  });

  const generatedAt = new Date(report.createdAtIso);
  const generatedLabel = Number.isFinite(generatedAt.getTime())
    ? `${generatedAt.toLocaleString()} · ${timezoneLabel(generatedAt)}`
    : NOT_PROVIDED_TEXT;

  const missingRows = vitalRows.filter((row) => row.flag === 'unavailable');
  const flaggedRows = vitalRows.filter((row) => row.flag === 'above' || row.flag === 'below');
  const trends = report.trends ?? [];
  const keyFindings = report.keyFindings ?? [];
  const symptomsTimeline = report.symptomsTimeline ?? [];
  const recommendations = report.recommendations;
  const systemSnapshots = report.systemSnapshots ?? [];

  return (
    <article
      aria-label={`Observation report ${report.id} for ${astronautName}`}
      className="print-report-sheet report-sheet rounded-xl border border-[var(--arogya-border-strong)] bg-white p-5 sm:p-8"
    >
      {/* 1. LETTERHEAD */}
      <header className="print-avoid-break border-b-2 border-[#1E3A5F] pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold tracking-[0.18em] text-[#1E3A5F]">AROGYA</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--arogya-text-secondary)]">
              Astronaut Health Monitoring
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.conciseMedicalMode && (
              <span className="rounded border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--arogya-info)]">
                CONCISE MEDICAL BRIEF
              </span>
            )}
            <span className="rounded border border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--arogya-caution-text)]">
              {REPORT_PROTOTYPE_LABEL}
            </span>
          </div>
        </div>
      </header>

      {/* 2. TWO-COLUMN METADATA */}
      <section
        aria-labelledby="report-metadata-heading"
        className="print-avoid-break grid grid-cols-1 gap-5 border-b border-[var(--arogya-border)] py-4 md:grid-cols-2"
      >
        <h3 id="report-metadata-heading" className="sr-only">
          Report identification
        </h3>

        <dl>
          <MetaRow label="Subject" value={`${astronautName} · ${astronautRole}`} />
          <MetaRow label="Age" value={astronaut.age > 0 ? `${astronaut.age} y` : NOT_PROVIDED_TEXT} />
          <MetaRow label="Gender" value={`${NOT_PROVIDED_TEXT} (not captured by this app)`} />
          <MetaRow label="Sample number" value={`${NOT_APPLICABLE_TEXT} — no laboratory sample recorded`} />
          <MetaRow label="Observation / session ID" value={report.id} />
          <MetaRow
            label="Observation window"
            value={`Mission Day ${report.missionDay} · ${report.periodLabel ?? `last ${report.attachedVitalsWindowDays} observations`}`}
          />
        </dl>

        <div className="flex flex-col items-end gap-2 text-right md:border-l md:border-[var(--arogya-border)] md:pl-5">
          <ReportBarcode value={barcodePayloadForReport(report.id)} />

          <dl className="w-full">
            <MetaRow label="Organization" value={`${NOT_PROVIDED_TEXT} (none configured)`} />
            <MetaRow
              label="Sample registration"
              value={`${NOT_APPLICABLE_TEXT} — observational data only`}
            />
            <MetaRow
              label="Mission location"
              value={`${mission.vehicleName} · ${mission.phase} · ${missionName}`}
            />
            <MetaRow
              label="Address"
              value={`${NOT_PROVIDED_TEXT} (no facility address configured)`}
            />
            <MetaRow label="Generated" value={generatedLabel} />
            <MetaRow label="Prepared for" value={report.preparedForRole} />
          </dl>
        </div>
      </section>

      {/* Urgent findings stay prominent */}
      <div
        className={`print-avoid-break mt-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-xs ${
          report.escalationRequired
            ? 'border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]'
            : 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-secondary)]'
        }`}
      >
        <div className="flex items-start gap-2">
          <ShieldAlert
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              report.escalationRequired ? 'text-[var(--arogya-critical-text)]' : 'text-[var(--arogya-info)]'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-[var(--arogya-text-primary)]">
              {report.escalationRequired
                ? 'Escalation status: medical review requested — contact the Crew Medical Officer / Flight Surgeon'
                : 'Escalation status: routine monitoring — no automatic escalation criteria met'}
            </p>
            {report.escalationRequired && report.escalationReasons && report.escalationReasons.length > 0 && (
              <p className="mt-0.5">{report.escalationReasons.join(' · ')}</p>
            )}
          </div>
        </div>
        <span className="font-mono-tabular text-[10px]">
          Overall status: {STATUS_META[report.overallStatus].label} · Readiness{' '}
          {report.readinessScoreAtGeneration}/100
        </span>
      </div>

      {/* 3. CURRENT VITAL SIGNS SNAPSHOT */}
      <section aria-labelledby="vitals-snapshot-heading" className="mt-5 space-y-2">
        <SectionHeading id="vitals-snapshot-heading">
          Current vital signs snapshot
        </SectionHeading>
        <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          Latest recorded value for each measurement in the observation window. Values are shown in
          canonical clinical units and are not relabelled; a channel with no recorded reading says
          “{MISSING_VALUE_TEXT}”.
        </p>
        <ReportVitalSignsTable rows={vitalRows} />
        <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          {REPORT_CANONICAL_UNIT_NOTE}
        </p>
      </section>

      {/* 4. BIOMETRIC REFERENCE-RANGE & ESCALATION MATRIX */}
      <section aria-labelledby="reference-matrix-heading" className="mt-5 space-y-2">
        <SectionHeading id="reference-matrix-heading">
          Biometric reference-range &amp; escalation matrix
        </SectionHeading>
        <ReportReferenceMatrix rows={matrixRows} />
      </section>

      {/* 5. OBSERVATIONS AND FOLLOW-UP */}
      <section aria-labelledby="observations-heading" className="mt-5 space-y-3">
        <SectionHeading id="observations-heading">Observations and follow-up</SectionHeading>

        <div className="print-avoid-break space-y-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Situation (SBAR)
          </h4>
          <p className="text-xs leading-relaxed text-[var(--arogya-text-primary)]">
            {report.situation}
          </p>
        </div>

        <div className="print-avoid-break space-y-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Background (SBAR)
          </h4>
          <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {report.background}
          </pre>
        </div>

        <div className="print-avoid-break space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Assessment — values and trends that may warrant attention
          </h4>
          {flaggedRows.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
              {flaggedRows.map((row) => (
                <li key={row.id}>
                  {row.test}: {row.result} {row.unit} — {row.flagLabel.toLowerCase()} ({row.reference})
                  {row.observedLabel ? `, observed ${row.observedLabel}` : ''}.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[var(--arogya-text-secondary)]">
              No recorded value in this window falls outside its comparison band.
            </p>
          )}
          {keyFindings.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
              {keyFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          )}
        </div>

        {trends.length > 0 && (
          <div className="print-avoid-break overflow-x-auto rounded-lg border border-[var(--arogya-border)]">
            <table className="report-table w-full min-w-[520px] border-collapse text-left text-[11px]">
              <caption className="sr-only">
                Period trends compared with the crew member&apos;s personal baseline.
              </caption>
              <thead>
                <tr className="bg-[var(--arogya-surface-elevated)] text-[10px] uppercase tracking-wider text-[var(--arogya-text-secondary)]">
                  <th scope="col" className="px-2.5 py-1.5 font-semibold">Metric</th>
                  <th scope="col" className="px-2.5 py-1.5 font-semibold">Period summary</th>
                  <th scope="col" className="px-2.5 py-1.5 font-semibold">vs personal baseline</th>
                  <th scope="col" className="px-2.5 py-1.5 font-semibold">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--arogya-border)]">
                {trends.map((trend) => (
                  <tr key={trend.metric} className="align-top break-inside-avoid">
                    <th scope="row" className="px-2.5 py-1.5 font-medium text-[var(--arogya-text-primary)]">
                      {trend.metric}
                    </th>
                    <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                      {trend.periodSummary}
                    </td>
                    <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                      {trend.baselineComparison}
                    </td>
                    <td className="px-2.5 py-1.5 font-medium text-[var(--arogya-text-primary)]">
                      {TREND_LABEL[trend.direction]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="print-avoid-break space-y-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Missing information
          </h4>
          <p className="text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
            {missingRows.length > 0
              ? `Not recorded in this window: ${missingRows.map((row) => row.test).join(', ')}.`
              : 'All supported channels have a recorded value in this window.'}{' '}
            {report.dataQualityNote}
            {report.dataCompletenessPercent != null
              ? ` Telemetry completeness: ${report.dataCompletenessPercent}%.`
              : ''}
          </p>
        </div>

        <div className="print-avoid-break space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Reviewed monitoring and countermeasure suggestions
          </h4>
          <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
            {recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
          <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            Decision-support suggestions only. No medication, supplement dosage, definitive diagnosis,
            or unsupported treatment is provided.
          </p>
        </div>

        {systemSnapshots.length > 0 && (
          <div className="print-avoid-break space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Body-system status summary
            </h4>
            <ul className="grid grid-cols-1 gap-x-5 gap-y-1 text-[11px] sm:grid-cols-2">
              {systemSnapshots.map((system) => (
                <li key={system.systemId} className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--arogya-text-primary)]">{system.label}</span>
                  <span className="whitespace-nowrap font-mono-tabular text-[10px] text-[var(--arogya-text-secondary)]">
                    {STATUS_META[system.status].shortLabel} · {system.score}/100
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
              {STATUS_GUIDANCE_COPY[report.overallStatus]}
            </p>
          </div>
        )}

        {symptomsTimeline.length > 0 && (
          <div className="print-avoid-break space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Symptoms timeline
            </h4>
            <ul className="space-y-0.5 text-[11px] text-[var(--arogya-text-primary)]">
              {symptomsTimeline.map((entry) => (
                <li key={entry.missionDay}>
                  Sol {entry.missionDay}: {entry.symptoms.join(' · ')}
                  {entry.notes ? ` — “${entry.notes}”` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="print-avoid-break space-y-1">
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            When the crew medical lead should review
          </h4>
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
            {report.escalationRequired ? (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-critical-text)]" aria-hidden="true" />
            ) : (
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
            )}
            <span>
              {report.escalationRequired
                ? 'Promptly — an escalation criterion is met. Transmit this report with the current comms-delay context and await medical direction.'
                : 'At the next scheduled medical review, or sooner if a flagged value persists across consecutive readings, new symptoms appear, or a reading moves outside its band.'}
            </span>
          </p>
        </div>

        {!report.includePrivateNotes && (
          <p className="flex items-center gap-1.5 text-[10px] text-[var(--arogya-text-muted)]">
            <Lock className="h-3 w-3" aria-hidden="true" />
            <span>Private crew notes withheld (not opted in for this report).</span>
          </p>
        )}
      </section>

      {/* 6. GRAPHS */}
      <section aria-labelledby="trend-graphs-heading" className="mt-5 space-y-2">
        <SectionHeading id="trend-graphs-heading">Recorded trend graphs</SectionHeading>
        <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          Window D{startDay}–D{endDay} · axes labelled with mission day and canonical units. Synthetic
          demonstration plots are excluded from this report.
        </p>
        <ReportTrendCharts series={trendSeries} startDay={startDay} endDay={endDay} />
      </section>

      {/* 7. SAFETY STATEMENT, PROVENANCE AND DISCLAIMER */}
      <footer className="print-avoid-break mt-5 space-y-2 border-t-2 border-[#1E3A5F] pt-3">
        <p className="text-[11px] font-semibold text-[var(--arogya-text-primary)]">
          {REPORT_SAFETY_STATEMENT}
        </p>
        <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          {REPORT_PROVENANCE_LABEL} · Report ID {report.id} · Generated {generatedLabel} · Authorising
          clinician signature: {NOT_PROVIDED_TEXT} (automated decision-support output).
        </p>
        <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          {REPORTS_EXACT_DISCLAIMER}
        </p>
      </footer>
    </article>
  );
}
