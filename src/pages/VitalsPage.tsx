import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Plus,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { buildStructuredReport, reportToMarkdown } from '../engine/reportGenerator';
import {
  VITALS_REFERENCE_TABLE_NOTE,
  buildVitalReferenceRows,
  buildVitalsCsv,
} from '../engine/vitalsReference';
import {
  Button,
  Card,
  EmptyState,
  StatusPill,
  healthStatusToTone,
} from '../components/ui';
import { VitalsChartsGrid, type VitalsTimeWindow } from '../components/vitals/VitalsChartsGrid';
import { VitalsReferenceTable } from '../components/vitals/VitalsReferenceTable';
import { ManualVitalsPanel } from '../components/vitals/ManualVitalsPanel';
import { VitalsSnapshotGrid } from '../components/vitals/VitalsSnapshotGrid';
import { NasaResearchDataPanel } from '../components/vitals/NasaResearchDataPanel';
import { OrganContextCard } from '../components/vitals/OrganContextCard';
import { ResearchContextSection } from '../components/research/ResearchContextSection';
import { mgDlToMmolL } from '../utils/unitConversions';
import {
  computeObservationWindow,
  countObservedDays,
  describeWindowCoverage,
  filterByObservationWindow,
} from '../utils/observationWindow';

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function VitalsPage() {
  const { hash } = useLocation();
  const { astronaut, mission, vitals14d, checkIns14d, assessment } = useActiveAssessment();
  const addVitals = useArogyaStore((s) => s.addVitals);
  const addReport = useArogyaStore((s) => s.addReport);
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const [timeWindow, setTimeWindow] = useState<VitalsTimeWindow>(14);
  const [showManualForm, setShowManualForm] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'vitals' | 'report' | 'csv';
    message: string;
  } | null>(null);

  useEffect(() => {
    setFeedbackBanner(null);
    setShowManualForm(false);
  }, [astronaut.id]);

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const sortedVitals = useMemo(
    () => [...vitals14d].sort((a, b) => a.missionDay - b.missionDay),
    [vitals14d]
  );

  // Mission-day window anchored to the current mission day (integer days, timezone-free).
  const observationWindow = useMemo(
    () => computeObservationWindow(mission.currentDay, timeWindow),
    [mission.currentDay, timeWindow]
  );

  const windowVitals = useMemo(
    () => filterByObservationWindow(sortedVitals, observationWindow),
    [sortedVitals, observationWindow]
  );

  const windowCheckIns = useMemo(
    () => filterByObservationWindow(checkIns14d, observationWindow),
    [checkIns14d, observationWindow]
  );

  const windowCoverageNotice = describeWindowCoverage(
    observationWindow,
    countObservedDays(windowVitals)
  );

  const latest = sortedVitals[sortedVitals.length - 1];

  const referenceRows = useMemo(
    () => buildVitalReferenceRows(astronaut, windowVitals, sortedVitals),
    [astronaut, windowVitals, sortedVitals]
  );

  const windowMissingCount = useMemo(() => {
    let missing = 0;
    windowVitals.forEach((v) => {
      if (v.heartRateBpm == null) missing++;
      if (v.systolicBpMmHg == null || v.diastolicBpMmHg == null) missing++;
      if (v.bodyTempC == null) missing++;
      if (v.bloodGlucoseMgDl == null) missing++;
      if (v.bodyMassKg == null) missing++;
      if (v.dailyRadiationMsv == null) missing++;
      if (v.spo2Percent == null) missing++;
    });
    return missing;
  }, [windowVitals]);

  const handleSaveManualReading = (reading: {
    missionDay: number;
    heartRateBpm: number | null;
    hrvMs: number | null;
    systolicBpMmHg: number | null;
    diastolicBpMmHg: number | null;
    spo2Percent: number | null;
    respiratoryRateBpm: number | null;
    bodyTempC: number | null;
    bloodGlucoseMgDl: number | null;
    bodyMassKg: number | null;
    dailyRadiationMsv: number | null;
  }) => {
    addVitals({
      astronautId: astronaut.id,
      ...reading,
      source: 'manual_entry',
    });
    setShowManualForm(false);
    setFeedbackBanner({
      type: 'vitals',
      message: `Mission Day ${reading.missionDay} biometric reading saved for ${astronaut.fullName}. Dashboard, Vitals, and assessment updated.`,
    });
  };

  const handleExportCsv = () => {
    const csv = buildVitalsCsv(astronaut, windowVitals);
    downloadFile(
      csv,
      `arogya-vitals-${astronaut.id}-${timeWindow}d-D${mission.currentDay}.csv`,
      'text/csv;charset=utf-8;'
    );
    setFeedbackBanner({
      type: 'csv',
      message: `Exported ${windowVitals.length}-day biometric telemetry CSV for ${astronaut.callSign}.`,
    });
  };

  const handleExportStructuredReport = () => {
    const report = buildStructuredReport({
      astronaut,
      assessment,
      mission,
      vitalsWindow: windowVitals,
      checkInsWindow: windowCheckIns,
      format: assessment.escalationRequired ? 'anomaly_brief' : 'flight_surgeon_sbar',
      preparedForRole: 'Flight Surgeon',
    });
    addReport(report);

    const vitalTableLines = [
      '',
      '## Vital Signs Reference Snapshot (Decision-Support Only)',
      '| Vital Sign | Latest | General Adult Range | Personal Baseline | Trend | Status |',
      '| --- | --- | --- | --- | --- | --- |',
      ...referenceRows.map(
        (r) =>
          `| ${r.name} | ${r.latestFormatted} | ${r.generalReferenceRange} | ${r.personalBaseline} | ${r.trendLabel} | ${r.statusLabel} |`
      ),
      '',
      `_${VITALS_REFERENCE_TABLE_NOTE}_`,
    ];

    const markdown = `${reportToMarkdown(report, astronaut.fullName)}\n${vitalTableLines.join('\n')}`;
    downloadFile(markdown, `${report.id}.md`, 'text/markdown;charset=utf-8;');

    setFeedbackBanner({
      type: 'report',
      message: `Structured SBAR medical report (${report.id}) exported and saved to Briefings.`,
    });
  };

  const latestTimestampLabel = latest
    ? new Date(latest.timestampIso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No measurements logged';
  const latestSampleLabel = latest
    ? `Mission Day ${latest.missionDay} · ${latestTimestampLabel}`
    : 'None logged';

  const qualityTone =
    assessment.dataQuality.qualityTier === 'complete'
      ? 'success'
      : assessment.dataQuality.qualityTier === 'partial'
      ? 'warning'
      : 'caution';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Page Header & Actions */}
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--arogya-border)] pb-5 lg:flex-row lg:items-end">
        <h1 className="arogya-display text-[var(--arogya-text-primary)]">
          Vitals Monitor
        </h1>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            disabled={windowVitals.length === 0}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleExportStructuredReport}
            leftIcon={<FileText className="h-4 w-4" />}
          >
            Export Medical Report
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            aria-expanded={showManualForm}
            onClick={() => setShowManualForm((prev) => !prev)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {showManualForm ? 'Hide Manual Entry' : 'Log New Reading'}
          </Button>
        </div>
      </header>

      {/* Action Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-4 py-3 text-xs text-[var(--arogya-text-primary)]"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
            <span>{feedbackBanner.message}</span>
          </div>
          <div className="flex items-center gap-3">
            {feedbackBanner.type === 'report' && (
              <Link
                to="/reports"
                className="font-semibold text-[var(--arogya-info)] underline underline-offset-2 hover:text-[var(--arogya-info)]"
              >
                Open Briefings
              </Link>
            )}
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Panel */}
      {showManualForm && (
        <ManualVitalsPanel
          astronaut={astronaut}
          currentMissionDay={mission.currentDay}
          latestReading={latest}
          onSave={handleSaveManualReading}
          onClose={() => setShowManualForm(false)}
        />
      )}

      {/* Data-Quality & Escalation Status Strip */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card padding="md" className="lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
              <div>
                <h2 className="arogya-h3 text-[var(--arogya-text-primary)]">
                  Telemetry Data-Quality Status
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                  {assessment.dataQuality.note}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono-tabular text-lg font-semibold text-[var(--arogya-text-primary)]">
                {assessment.dataQuality.completenessPercent}%
              </span>
              <StatusPill
                tone={qualityTone}
                label={
                  assessment.dataQuality.qualityTier === 'complete'
                    ? 'Complete'
                    : assessment.dataQuality.qualityTier === 'partial'
                    ? 'Partial Data'
                    : 'Incomplete'
                }
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--arogya-border)] pt-3 text-xs text-[var(--arogya-text-secondary)]">
            <span className="font-mono-tabular">
              Today&apos;s vitals (Day {mission.currentDay}):{' '}
              <strong className={assessment.dataQuality.hasTodayVitals ? 'text-[var(--arogya-success-text)]' : 'text-[var(--arogya-warning-text)]'}>
                {assessment.dataQuality.hasTodayVitals ? 'Logged' : 'Missing'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            {windowCoverageNotice && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[var(--arogya-warning-text)]">
                  {windowCoverageNotice}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Window gaps ({timeWindow}d):{' '}
              <strong className={windowMissingCount > 0 ? 'text-[var(--arogya-warning-text)]' : 'text-[var(--arogya-text-primary)]'}>
                {windowMissingCount} missing channel{windowMissingCount === 1 ? '' : 's'}
              </strong>
            </span>
            {assessment.dataQuality.missingFields.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--arogya-warning-text)]">
                  Flagged missing: {assessment.dataQuality.missingFields.join(', ')}
                </span>
              </>
            )}
          </div>
        </Card>

        <Card
          variant={assessment.escalationRequired ? 'alert' : 'default'}
          padding="md"
          className="flex flex-col justify-between lg:col-span-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  assessment.escalationRequired ? 'text-[var(--arogya-critical-text)]' : 'text-[var(--arogya-info)]'
                }`}
                aria-hidden="true"
              />
              <div>
                <h2 className="arogya-h3 text-[var(--arogya-text-primary)]">
                  Medical Escalation Status
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                  {assessment.escalationRequired
                    ? assessment.escalationReasons.join('; ')
                    : 'No automatic escalation criteria triggered in current readings.'}
                </p>
              </div>
            </div>
            <StatusPill
              tone={healthStatusToTone(assessment.overallStatus)}
              label={assessment.escalationRequired ? 'Escalate' : 'Non-Diagnostic'}
            />
          </div>
          <p className="mt-3 border-t border-[var(--arogya-border)] pt-2.5 text-[11px] text-[var(--arogya-text-muted)]">
            Readiness {assessment.overallReadinessScore}/100 · Decision support only
          </p>
        </Card>
      </div>

      {/* No-Vitals-Yet Empty State */}
      {sortedVitals.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="No Vitals Recorded Yet"
          description={`No biometric telemetry readings have been logged yet for ${astronaut.fullName}. Log your first manual reading or load the demo mission dataset to review longitudinal trends and baseline comparisons.`}
          action={
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowManualForm(true)}
            >
              Log First Reading
            </Button>
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
        <>
          <VitalsSnapshotGrid
            rows={referenceRows}
            timeWindow={timeWindow}
            latestSampleLabel={latestSampleLabel}
          />

          <OrganContextCard assessment={assessment} />

          {/* 7D / 14D / 30D Recharts Visualizations */}
          <VitalsChartsGrid
            astronaut={astronaut}
            allReadings={sortedVitals}
            currentMissionDay={mission.currentDay}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />

          {/* Accessible Reference-Range Matrix + Mandatory Exact Safety Note */}
          <VitalsReferenceTable rows={referenceRows} astronautName={astronaut.fullName} />

      {/* Daily Telemetry Log Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--arogya-border)] px-4 py-3.5 sm:px-6">
          <div>
            <h2 className="arogya-h2 text-[var(--arogya-text-primary)]">
              Mission Telemetry Log ({windowVitals.length} Days Displayed)
            </h2>
            <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
              Recorded readings across the active {timeWindow}-day window. Uncaptured sensors are explicitly labeled MISSING.
            </p>
          </div>
          <span className="font-mono-tabular text-xs text-[var(--arogya-text-muted)]">
            Units shown per column: bpm · mmHg · °C · mmol/L · kg · mSv
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <caption className="sr-only">
              Daily biometric telemetry log for {astronaut.fullName} over the selected {timeWindow}-day window.
            </caption>
            <thead>
              <tr className="border-b border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[11px] font-semibold text-[var(--arogya-text-secondary)]">
                <th scope="col" className="px-4 py-3">Day</th>
                <th scope="col" className="px-3 py-3">Measured</th>
                <th scope="col" className="px-3 py-3">Source</th>
                <th scope="col" className="px-3 py-3">HR</th>
                <th scope="col" className="px-3 py-3">BP</th>
                <th scope="col" className="px-3 py-3">Temp</th>
                <th scope="col" className="px-3 py-3">Glucose</th>
                <th scope="col" className="px-3 py-3">Body Mass</th>
                <th scope="col" className="px-3 py-3">Daily Rad</th>
                <th scope="col" className="px-3 py-3">Cumul Rad</th>
                <th scope="col" className="px-4 py-3">SpO₂</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--arogya-border)] font-mono-tabular text-[var(--arogya-text-primary)]">
              {[...windowVitals].reverse().map((v) => (
                <tr key={v.id} className="hover:bg-[var(--arogya-bg)]">
                  <th scope="row" className="px-4 py-2.5 font-semibold">
                    D{v.missionDay}
                  </th>
                  <td className="px-3 py-2.5 text-[var(--arogya-text-secondary)]">
                    {new Date(v.timestampIso).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[var(--arogya-text-secondary)]">
                    {v.source === 'manual_entry' ? 'Manual' : 'Wearable'}
                  </td>
                  <td className={`px-3 py-2.5 ${v.heartRateBpm == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.heartRateBpm != null ? `${v.heartRateBpm} bpm` : 'MISSING'}
                  </td>
                  <td
                    className={`px-3 py-2.5 ${
                      v.systolicBpMmHg == null || v.diastolicBpMmHg == null ? 'text-[var(--arogya-warning-text)]' : ''
                    }`}
                  >
                    {v.systolicBpMmHg != null && v.diastolicBpMmHg != null
                      ? `${v.systolicBpMmHg}/${v.diastolicBpMmHg}`
                      : 'MISSING'}
                  </td>
                  <td className={`px-3 py-2.5 ${v.bodyTempC == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.bodyTempC != null ? `${v.bodyTempC.toFixed(1)} °C` : 'MISSING'}
                  </td>
                  <td className={`px-3 py-2.5 ${v.bloodGlucoseMgDl == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.bloodGlucoseMgDl != null
                      ? `${mgDlToMmolL(v.bloodGlucoseMgDl).toFixed(1)} mmol/L`
                      : 'MISSING'}
                  </td>
                  <td className={`px-3 py-2.5 ${v.bodyMassKg == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.bodyMassKg != null ? `${v.bodyMassKg.toFixed(1)} kg` : 'MISSING'}
                  </td>
                  <td className={`px-3 py-2.5 ${v.dailyRadiationMsv == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.dailyRadiationMsv != null ? `${v.dailyRadiationMsv.toFixed(2)} mSv` : 'MISSING'}
                  </td>
                  <td className={`px-3 py-2.5 ${v.cumulativeRadiationMsv == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.cumulativeRadiationMsv != null
                      ? `${v.cumulativeRadiationMsv.toFixed(2)} mSv`
                      : 'MISSING'}
                  </td>
                  <td className={`px-4 py-2.5 ${v.spo2Percent == null ? 'text-[var(--arogya-warning-text)]' : ''}`}>
                    {v.spo2Percent != null ? `${v.spo2Percent}%` : 'MISSING'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}
      <ResearchContextSection
        surface="vitals"
        headingId="vitals-research-context-heading"
        title="Research context for recorded vitals"
      />
      <NasaResearchDataPanel />
    </div>
  );
}
