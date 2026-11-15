import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Copy,
  Download,
  FileText,
  Lock,
  Printer,
  RotateCcw,
  Stethoscope,
} from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { evaluateHealthAssessment } from '../engine/healthEngine';
import {
  REPORT_PERIOD_LABELS,
  buildStructuredReport,
  filterDataForReportPeriod,
  reportToMarkdown,
} from '../engine/reportGenerator';
import { buildMissionHealthBrief } from '../engine/missionHealthBrief';
import type { Report, ReportFormat, ReportPeriod } from '../types';
import { Button, EmptyState } from '../components/ui';
import { HealthReportCard } from '../components/reports/HealthReportCard';
import { DriveSyncModal } from '../components/layout/DriveSyncModal';
import { useDriveExportState } from '../services/driveExportStore';
import { DRIVE_STATUS_LABELS } from '../services/driveExportState';
import {
  computeObservationWindow,
  countObservedDays,
  describeWindowCoverage,
} from '../utils/observationWindow';

const PERIOD_OPTIONS: Array<{ id: ReportPeriod; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '14d', label: 'Last 14 days' },
  { id: 'full_mission', label: 'Full mission' },
];

/**
 * Mission-health report page.
 *
 * The report is generated from recorded mission data into a single immutable object (which
 * carries its own observation snapshot and decision-support context), so printing cannot be
 * disturbed by incoming readings. Recovery and countermeasure context uses a fixed 7/14-day
 * recorded window, independent of the selected report period. Previously stored reports stay in
 * the store untouched.
 */
export function ReportsPage() {
  const { astronaut, mission, vitals14d, checkIns14d } = useActiveAssessment();
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const [searchParams] = useSearchParams();
  const isEscalateQuery = searchParams.get('escalate') === '1';

  const [period, setPeriod] = useState<ReportPeriod>('14d');
  const [format, setFormat] = useState<ReportFormat>('flight_surgeon_sbar');
  const [recipient, setRecipient] = useState<'Flight Surgeon' | 'Crew Medical Officer'>(
    isEscalateQuery ? 'Crew Medical Officer' : 'Flight Surgeon'
  );
  const [includePrivateNotes, setIncludePrivateNotes] = useState(false);
  const [conciseMedicalMode, setConciseMedicalMode] = useState(isEscalateQuery);
  const [copied, setCopied] = useState(false);
  const [driveExportOpen, setDriveExportOpen] = useState(false);
  const driveState = useDriveExportState();

  useEffect(() => {
    if (isEscalateQuery) {
      setFormat('flight_surgeon_sbar');
      setRecipient('Crew Medical Officer');
      setConciseMedicalMode(true);
    }
  }, [isEscalateQuery]);

  const hasAnyTelemetry = checkIns14d.length > 0 || vitals14d.length > 0;

  // Brief snapshot: always the daily and last-7-day view, independent of the selected report period.
  const healthBrief = useMemo(() => {
    const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
      checkIns14d,
      vitals14d,
      mission.currentDay,
      '7d'
    );
    const briefAssessment = evaluateHealthAssessment(
      astronaut,
      checkInsWindow,
      vitalsWindow,
      mission
    );
    return buildMissionHealthBrief({
      astronaut,
      checkIns: checkInsWindow,
      vitals: vitalsWindow,
      missionDay: mission.currentDay,
      escalation: {
        required: briefAssessment.escalationRequired,
        reasons: briefAssessment.escalationReasons,
      },
    });
  }, [astronaut, checkIns14d, vitals14d, mission]);

  // Recovery and countermeasure context uses a 7/14-day recorded window, independent of the
  // selected report period, so a one-day report still has enough recorded evidence to explain.
  const decisionWindowDays: 7 | 14 =
    period === 'today' || period === '7d' ? 7 : 14;

  // Internal, immutable report snapshot: regenerated only when report inputs change.
  const report: Report = useMemo(() => {
    const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
      checkIns14d,
      vitals14d,
      mission.currentDay,
      period
    );
    const decisionData = filterDataForReportPeriod(
      checkIns14d,
      vitals14d,
      mission.currentDay,
      decisionWindowDays === 7 ? '7d' : '14d'
    );
    const periodAssessment = evaluateHealthAssessment(
      astronaut,
      checkInsWindow,
      vitalsWindow,
      mission
    );
    return buildStructuredReport({
      astronaut,
      assessment: periodAssessment,
      mission,
      vitalsWindow,
      checkInsWindow,
      format,
      preparedForRole: recipient,
      period,
      includePrivateNotes,
      conciseMedicalMode,
      healthBrief,
      decisionSupportData: {
        checkIns: decisionData.checkInsWindow,
        vitals: decisionData.vitalsWindow,
        windowDays: decisionWindowDays,
      },
    });
  }, [
    astronaut,
    checkIns14d,
    vitals14d,
    mission,
    period,
    format,
    recipient,
    includePrivateNotes,
    conciseMedicalMode,
    healthBrief,
    decisionWindowDays,
  ]);

  // How much of the requested period actually exists in the record (never padded).
  const periodCoverage = useMemo(() => {
    const requestedDays =
      period === 'today' ? 1 : period === '7d' ? 7 : period === '14d' ? 14 : mission.currentDay;
    const window = computeObservationWindow(mission.currentDay, requestedDays);
    const observedDays = countObservedDays(
      filterDataForReportPeriod(checkIns14d, vitals14d, mission.currentDay, period).vitalsWindow
    );
    return describeWindowCoverage(window, observedDays);
  }, [period, mission.currentDay, checkIns14d, vitals14d]);

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    const markdown = reportToMarkdown(report, astronaut.fullName);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const area = document.createElement('textarea');
      area.value = markdown;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      {/* Page header — hidden when printing */}
      <header className="no-print flex flex-col justify-between gap-4 border-b border-[var(--arogya-border)] pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs text-[var(--arogya-text-secondary)]">
            {astronaut.fullName} · {astronaut.role} · {mission.name} (Day {mission.currentDay})
          </p>
          <h1 className="arogya-display mt-1 text-[var(--arogya-text-primary)]">
            Mission Health Report
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!hasAnyTelemetry}
            onClick={() => window.print()}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print / Save PDF
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry}
            onClick={handleCopyMarkdown}
            leftIcon={
              copied ? (
                <Check className="h-4 w-4 text-[var(--arogya-success-text)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
          >
            {copied ? 'Copied Markdown' : 'Copy Markdown'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry}
            onClick={() =>
              downloadBlob(
                reportToMarkdown(report, astronaut.fullName),
                `${report.id}.md`,
                'text/markdown;charset=utf-8;'
              )
            }
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download MD
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry}
            onClick={() =>
              downloadBlob(
                JSON.stringify(report, null, 2),
                `${report.id}.json`,
                'application/json;charset=utf-8;'
              )
            }
            leftIcon={<Download className="h-4 w-4" />}
          >
            JSON
          </Button>

          {/* Optional Drive export: local downloads above always stay available. */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry}
            onClick={() => setDriveExportOpen(true)}
            leftIcon={<CloudUpload className="h-4 w-4" />}
          >
            {driveState.status === 'connected' ? 'Export to Drive' : 'Export to Drive (optional)'}
          </Button>
        </div>
      </header>

      {/* Missing-data summary — surfaced before configuration, hidden when printing */}
      {report.dataGaps && report.dataGaps.length > 0 && (
        <div
          role="note"
          className="no-print flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-4 py-2.5 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--arogya-text-primary)]">
            <AlertTriangle
              className="h-3.5 w-3.5 text-[var(--arogya-warning-text)]"
              aria-hidden="true"
            />
            {report.dataGaps.length} missing-data area
            {report.dataGaps.length === 1 ? '' : 's'} in this window
          </span>
          {report.dataCompletenessPercent != null && (
            <span>Recorded-vitals completeness: {report.dataCompletenessPercent}%</span>
          )}
          <span>Missing values are never imputed or treated as normal.</span>
          <a
            href="#report-data-gaps-heading"
            className="font-semibold text-[#1E3A5F] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
          >
            Review in the brief
          </a>
        </div>
      )}

      {/* Report configuration — hidden when printing */}
      <section
        aria-label="Report configuration"
        className="no-print space-y-3 rounded-xl border border-[var(--arogya-border)] bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="block text-xs font-medium text-[var(--arogya-text-secondary)]">
              Report Period
            </span>
            <div
              role="group"
              aria-label="Report time period"
              className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-1"
            >
              {PERIOD_OPTIONS.map((option) => {
                const active = period === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPeriod(option.id)}
                    aria-pressed={active}
                    /* Constant weight/width: the selected period must not resize the group. */
                    className={`min-h-[40px] min-w-[104px] whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#1E3A5F] text-white'
                        : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {periodCoverage && (
              <p role="status" className="mt-1.5 text-[11px] font-medium text-[var(--arogya-warning-text)]">
                {periodCoverage}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-[var(--arogya-text-muted)]">
              Recovery readiness and countermeasure adherence use the last {decisionWindowDays}{' '}
              recorded mission days, independent of the report period.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="report-format"
                className="block text-xs font-medium text-[var(--arogya-text-secondary)]"
              >
                Briefing Format
              </label>
              <select
                id="report-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ReportFormat)}
                className="mt-1.5 h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 text-xs text-[var(--arogya-text-primary)]"
              >
                <option value="flight_surgeon_sbar">Flight Surgeon SBAR Brief</option>
                <option value="anomaly_brief">Threshold Drift / Anomaly Brief</option>
                <option value="daily_summary">Daily Crew Readiness Summary</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="report-recipient"
                className="block text-xs font-medium text-[var(--arogya-text-secondary)]"
              >
                Prepared For
              </label>
              <select
                id="report-recipient"
                value={recipient}
                onChange={(e) =>
                  setRecipient(e.target.value as 'Flight Surgeon' | 'Crew Medical Officer')
                }
                className="mt-1.5 h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 text-xs text-[var(--arogya-text-primary)]"
              >
                <option value="Flight Surgeon">Ground Flight Surgeon</option>
                <option value="Crew Medical Officer">Onboard Crew Medical Officer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--arogya-border)] pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs text-[var(--arogya-text-primary)]">
            <input
              type="checkbox"
              checked={includePrivateNotes}
              onChange={(e) => setIncludePrivateNotes(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] accent-[#1E3A5F]"
            />
            <Lock className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
            <span>
              Include private free-text crew notes in the report{' '}
              <span className="text-[var(--arogya-text-secondary)]">
                (excluded by default for astronaut privacy)
              </span>
            </span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--arogya-text-secondary)]">
            <input
              type="checkbox"
              checked={conciseMedicalMode}
              onChange={(e) => setConciseMedicalMode(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] accent-[#1E3A5F]"
            />
            <span>Concise Medical Officer View</span>
          </label>
        </div>

        <p className="flex items-center gap-1.5 border-t border-[var(--arogya-border)] pt-2.5 text-[11px] text-[var(--arogya-text-muted)]">
          <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Report period: {REPORT_PERIOD_LABELS[period]} · {report.attachedVitalsWindowDays} recorded
            observation{report.attachedVitalsWindowDays === 1 ? '' : 's'} in window
          </span>
        </p>
      </section>

      {/* Generated report */}
      {!hasAnyTelemetry ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No Report Data Available Yet"
          description={`No daily check-ins or biometric vital readings are recorded yet for ${astronaut.fullName}. Complete a 60-second check-in or load the demo mission dataset to generate a report.`}
          action={
            <Link
              to="/check-in"
              className="inline-flex min-h-[40px] items-center rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#2D4A6F]"
            >
              Start Daily Check-In
            </Link>
          }
          secondaryAction={
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={resetDemoData}
            >
              Load Demo Mission
            </Button>
          }
        />
      ) : (
        <HealthReportCard report={report} astronaut={astronaut} mission={mission} />
      )}

      <p className="no-print text-[11px] text-[var(--arogya-text-muted)]">
        Google Drive export is optional: {DRIVE_STATUS_LABELS[driveState.status].toLowerCase()}. Local
        Markdown, JSON and print exports always remain available.
      </p>

      <DriveSyncModal
        isOpen={driveExportOpen}
        onClose={() => setDriveExportOpen(false)}
        report={hasAnyTelemetry ? report : null}
        astronautName={astronaut.fullName}
        initialTab="export"
      />
    </div>
  );
}
