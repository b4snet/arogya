import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Lock,
  Printer,
  RotateCcw,
  Stethoscope,
  Trash2,
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
import type { Report, ReportFormat, ReportPeriod } from '../types';
import { STATUS_META } from '../engine/thresholds';
import { AstronautAvatar, Button, Card, EmptyState } from '../components/ui';
import { HealthReportCard } from '../components/reports/HealthReportCard';

const PERIOD_OPTIONS: Array<{ id: ReportPeriod; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '14d', label: 'Last 14 days' },
  { id: 'full_mission', label: 'Full mission' },
];

export function ReportsPage() {
  const { astronaut, mission, vitals14d, checkIns14d } = useActiveAssessment();
  const reports = useArogyaStore((s) => s.reports);
  const addReport = useArogyaStore((s) => s.addReport);
  const deleteReport = useArogyaStore((s) => s.deleteReport);
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
  const [medicalPrepNotice, setMedicalPrepNotice] = useState<string | null>(
    isEscalateQuery
      ? 'Urgent escalation briefing prepared for Crew Medical Officer / Flight Surgeon (private crew notes excluded unless opted in below). Copy Markdown, download .md, or print to PDF immediately.'
      : null
  );
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSavedId(null);
    if (isEscalateQuery) {
      setFormat('flight_surgeon_sbar');
      setRecipient('Crew Medical Officer');
      setConciseMedicalMode(true);
      setMedicalPrepNotice(
        'Urgent escalation briefing prepared for Crew Medical Officer / Flight Surgeon (private crew notes excluded unless opted in below). Copy Markdown, download .md, or print to PDF immediately.'
      );
    } else {
      setMedicalPrepNotice(null);
    }
  }, [astronaut.id, isEscalateQuery]);

  const hasAnyTelemetry = checkIns14d.length > 0 || vitals14d.length > 0;

  const astronautReports = useMemo(
    () => reports.filter((r) => r.astronautId === astronaut.id),
    [reports, astronaut.id]
  );

  // Compute live period-scoped report card immediately when user switches period or astronaut
  const livePreviewReport = useMemo(() => {
    const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
      checkIns14d,
      vitals14d,
      mission.currentDay,
      period
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
  ]);

  const savedSelection = useMemo(
    () =>
      selectedSavedId
        ? astronautReports.find((r) => r.id === selectedSavedId) ?? null
        : null,
    [astronautReports, selectedSavedId]
  );

  const activeReport: Report = savedSelection ?? livePreviewReport;
  const isViewingSaved = savedSelection !== null;

  const handleSaveSnapshot = () => {
    const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
      checkIns14d,
      vitals14d,
      mission.currentDay,
      period
    );
    const periodAssessment = evaluateHealthAssessment(
      astronaut,
      checkInsWindow,
      vitalsWindow,
      mission
    );
    const snapshot = buildStructuredReport({
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
    });
    addReport(snapshot);
    setSelectedSavedId(snapshot.id);
  };

  const handlePrepareMedicalReport = () => {
    setFormat('flight_surgeon_sbar');
    setConciseMedicalMode(true);
    setSelectedSavedId(null);
    setMedicalPrepNotice(
      `Concise medical report prepared for ${recipient} (${
        includePrivateNotes ? 'private crew notes included by opt-in' : 'private crew notes excluded'
      }). Ready to copy, download as Markdown, or print to PDF.`
    );
  };

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
    const md = reportToMarkdown(activeReport, astronaut.fullName);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedId(activeReport.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback copy via temporary textarea if clipboard API is restricted
      const area = document.createElement('textarea');
      area.value = md;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopiedId(activeReport.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <header className="no-print flex flex-col justify-between gap-4 border-b border-[var(--arogya-border)] pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--arogya-text-secondary)]">
            <AstronautAvatar
              astronautId={astronaut.id}
              fullName={astronaut.fullName}
              size="xs"
              active
            />
            <span>
              {astronaut.fullName} · {astronaut.role} · {mission.name} (Day {mission.currentDay})
            </span>
          </div>
          <h1 className="arogya-display mt-1 text-[var(--arogya-text-primary)]">
            Astronaut Health Report Cards
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--arogya-text-secondary)]">
            Generate, copy, download in Markdown, or print PDF-ready decision-support summaries across mission timeframes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!hasAnyTelemetry}
            onClick={handlePrepareMedicalReport}
            leftIcon={<Stethoscope className="h-4 w-4" />}
          >
            Prepare Medical Report
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry && !isViewingSaved}
            onClick={handleCopyMarkdown}
            leftIcon={
              copiedId === activeReport.id ? (
                <Check className="h-4 w-4 text-[#4ADE80]" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
          >
            {copiedId === activeReport.id ? 'Copied Markdown' : 'Copy Markdown'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry && !isViewingSaved}
            onClick={() =>
              downloadBlob(
                reportToMarkdown(activeReport, astronaut.fullName),
                `${activeReport.id}.md`,
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
            disabled={!hasAnyTelemetry && !isViewingSaved}
            onClick={() =>
              downloadBlob(
                JSON.stringify(activeReport, null, 2),
                `${activeReport.id}.json`,
                'application/json;charset=utf-8;'
              )
            }
            leftIcon={<Download className="h-4 w-4" />}
          >
            JSON
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!hasAnyTelemetry && !isViewingSaved}
            onClick={() => window.print()}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print / Save PDF
          </Button>
        </div>
      </header>

      {/* Report Configuration Controls */}
      <Card padding="md" className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="block text-xs font-medium text-[var(--arogya-text-secondary)]">
              Report Period
            </span>
            <div
              role="group"
              aria-label="Report time period"
              className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-1"
            >
              {PERIOD_OPTIONS.map((opt) => {
                const active = period === opt.id && !isViewingSaved;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPeriod(opt.id);
                      setSelectedSavedId(null);
                    }}
                    aria-pressed={active}
                    className={`min-h-[40px] whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#22D3EE] text-[#060B14] font-semibold'
                        : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
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
                onChange={(e) => {
                  setFormat(e.target.value as ReportFormat);
                  setSelectedSavedId(null);
                }}
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
                onChange={(e) => {
                  setRecipient(
                    e.target.value as 'Flight Surgeon' | 'Crew Medical Officer'
                  );
                  setSelectedSavedId(null);
                }}
                className="mt-1.5 h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 text-xs text-[var(--arogya-text-primary)]"
              >
                <option value="Flight Surgeon">Ground Flight Surgeon</option>
                <option value="Crew Medical Officer">Onboard Crew Medical Officer</option>
              </select>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={!hasAnyTelemetry}
              onClick={handleSaveSnapshot}
              leftIcon={<FilePlus2 className="h-4 w-4" />}
            >
              Save Report Snapshot
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--arogya-border)] pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs text-[var(--arogya-text-primary)]">
            <input
              type="checkbox"
              checked={includePrivateNotes}
              onChange={(e) => {
                setIncludePrivateNotes(e.target.checked);
                setSelectedSavedId(null);
              }}
              className="h-4 w-4 rounded border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] accent-[#22D3EE]"
            />
            <Lock className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>
              Include private free-text crew notes in exported report{' '}
              <span className="text-[var(--arogya-text-secondary)]">
                (excluded by default for astronaut privacy)
              </span>
            </span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--arogya-text-secondary)]">
            <input
              type="checkbox"
              checked={conciseMedicalMode}
              onChange={(e) => {
                setConciseMedicalMode(e.target.checked);
                setSelectedSavedId(null);
                if (!e.target.checked) setMedicalPrepNotice(null);
              }}
              className="h-4 w-4 rounded border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] accent-[#22D3EE]"
            />
            <span>Concise Medical Officer View</span>
          </label>
        </div>

        {medicalPrepNotice && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#22D3EE]/40 bg-[#22D3EE]/10 px-3.5 py-2.5 text-xs text-[var(--arogya-text-primary)]"
          >
            <span>{medicalPrepNotice}</span>
            <button
              type="button"
              onClick={() => {
                setConciseMedicalMode(false);
                setMedicalPrepNotice(null);
              }}
              className="font-semibold text-[#22D3EE] hover:underline"
            >
              Switch to Full Report
            </button>
          </div>
        )}
      </Card>

      {/* Main Split: Saved Snapshots List + Printable Health Report Card */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="no-print space-y-3 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Report Archive ({astronautReports.length})
            </h2>
            {isViewingSaved && (
              <button
                type="button"
                onClick={() => setSelectedSavedId(null)}
                className="text-xs font-medium text-[#22D3EE] hover:underline"
              >
                Live Preview
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedSavedId(null)}
            className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
              !isViewingSaved
                ? 'border-[#22D3EE]/50 bg-[#121C2B]'
                : 'border-[var(--arogya-border)] bg-[var(--arogya-surface)] hover:bg-white/[0.03]'
            }`}
          >
            <p className="text-xs font-semibold text-[var(--arogya-text-primary)]">
              Live Preview · {REPORT_PERIOD_LABELS[period]}
            </p>
            <p className="mt-1 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
              Readiness {livePreviewReport.readinessScoreAtGeneration}/100 ·{' '}
              {STATUS_META[livePreviewReport.overallStatus].shortLabel}
            </p>
          </button>

          {astronautReports.length === 0 ? (
            <EmptyState
              title="No Saved Snapshots Yet"
              description="Live reports update automatically above. Click Save Report Snapshot to archive a timestamped copy."
              compact
            />
          ) : (
            <div className="space-y-2">
              {astronautReports.map((rpt) => {
                const selected = savedSelection?.id === rpt.id;
                return (
                  <div
                    key={rpt.id}
                    className={`flex items-start justify-between gap-2 rounded-xl border p-3 transition-colors ${
                      selected
                        ? 'border-[#22D3EE]/50 bg-[#121C2B]'
                        : 'border-[var(--arogya-border)] bg-[var(--arogya-surface)] hover:bg-white/[0.03]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSavedId(rpt.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-semibold text-[var(--arogya-text-primary)]">
                        Day {rpt.missionDay} · {rpt.periodLabel ?? rpt.preparedForRole}
                      </p>
                      <p className="mt-1 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                        {rpt.readinessScoreAtGeneration}/100 ·{' '}
                        {STATUS_META[rpt.overallStatus].shortLabel}
                        {rpt.escalationRequired ? ' · ESCALATE' : ''}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--arogya-text-muted)]">
                        {new Date(rpt.createdAtIso).toLocaleString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteReport(rpt.id);
                        if (selectedSavedId === rpt.id) setSelectedSavedId(null);
                      }}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[var(--arogya-text-muted)] hover:bg-[#EF4444]/15 hover:text-[#FCA5A5]"
                      aria-label={`Delete report ${rpt.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <div className="xl:col-span-9">
          {!hasAnyTelemetry && !isViewingSaved ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No Report Data Available Yet"
              description={`No daily check-ins or biometric vital readings are recorded yet for ${astronaut.fullName}. Complete a 60-second check-in or load the demo mission dataset to generate a structured medical report.`}
              action={
                <Link
                  to="/check-in"
                  className="inline-flex min-h-[40px] items-center rounded-lg bg-[#22D3EE] px-4 text-xs font-semibold text-[#060B14] transition-colors hover:bg-[#38BDF8]"
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
            <HealthReportCard
              report={activeReport}
              fallbackAstronautName={astronaut.fullName}
              fallbackAstronautRole={astronaut.role}
              fallbackMissionName={mission.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}
