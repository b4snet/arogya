import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '../ui';
import type { Astronaut, VitalReading } from '../../types';
import { CLINICAL_THRESHOLDS } from '../../engine/thresholds';
import { mgDlToMmolL } from '../../utils/unitConversions';
import {
  OBSERVATION_WINDOW_OPTIONS,
  buildDailySeries,
  computeObservationWindow,
  countObservedDays,
  describeWindowCoverage,
  filterByObservationWindow,
  type ObservationWindowDays,
} from '../../utils/observationWindow';

export type VitalsTimeWindow = ObservationWindowDays;

interface VitalsChartsGridProps {
  astronaut: Astronaut;
  allReadings: VitalReading[];
  currentMissionDay: number;
  timeWindow: VitalsTimeWindow;
  onTimeWindowChange: (win: VitalsTimeWindow) => void;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#CBD5E1',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#0F172A',
};

export function VitalsChartsGrid({
  astronaut,
  allReadings,
  currentMissionDay,
  timeWindow,
  onTimeWindowChange,
}: VitalsChartsGridProps) {
  // Real date window: the mission-day range the selector asks for, clamped to mission start.
  const window = computeObservationWindow(currentMissionDay, timeWindow);
  const windowData = filterByObservationWindow(allReadings, window);
  const coverageNotice = describeWindowCoverage(window, countObservedDays(windowData));

  // One slot per day of the window keeps missing days visible as gaps (never interpolated).
  const chartData = buildDailySeries(windowData, window).map(({ missionDay, item }) => ({
    missionDay: `D${missionDay}`,
    heartRateBpm: item?.heartRateBpm ?? null,
    systolicBpMmHg: item?.systolicBpMmHg ?? null,
    diastolicBpMmHg: item?.diastolicBpMmHg ?? null,
    spo2Percent: item?.spo2Percent ?? null,
    bodyTemp: item?.bodyTempC ?? null,
    bloodGlucose: item?.bloodGlucoseMgDl != null ? mgDlToMmolL(item.bloodGlucoseMgDl) : null,
    bodyMass: item?.bodyMassKg ?? null,
    dailyRadiationMsv: item?.dailyRadiationMsv ?? null,
    cumulativeRadiationMsv: item?.cumulativeRadiationMsv ?? null,
  }));

  const tempUnit = '°C';
  const tempBaseline = astronaut.baseline.bodyTempC;
  const tempGenMin = CLINICAL_THRESHOLDS.generalTempMinC;
  const tempGenMax = CLINICAL_THRESHOLDS.generalTempMaxC;

  const glucoseUnit = 'mmol/L';
  const glucoseBaseline = mgDlToMmolL(astronaut.baseline.fastingGlucoseMgDl);
  const glucoseGenMin = mgDlToMmolL(CLINICAL_THRESHOLDS.generalGlucoseMinMgDl);
  const glucoseGenMax = mgDlToMmolL(CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl);

  const massUnit = 'kg';
  const massBaseline = astronaut.baseline.bodyMassKg ?? null;

  const latestChart = chartData[chartData.length - 1];
  const latestDay = latestChart?.missionDay ?? 'N/A';

  const cvAriaLabel = `Cardiovascular trend chart over ${chartData.length} mission days ending ${latestDay}. Latest resting heart rate: ${latestChart?.heartRateBpm ?? 'missing'} bpm (personal baseline ${astronaut.baseline.restingHeartRateBpm} bpm). Latest blood pressure: ${latestChart?.systolicBpMmHg ?? 'missing'}/${latestChart?.diastolicBpMmHg ?? 'missing'} mmHg (personal baseline ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg).`;
  const thermoAriaLabel = `Thermoregulation and oxygenation trend chart over ${chartData.length} mission days ending ${latestDay}. Latest temperature: ${latestChart?.bodyTemp != null ? `${latestChart.bodyTemp.toFixed(1)} ${tempUnit}` : 'missing'} (personal baseline ${tempBaseline.toFixed(1)} ${tempUnit}). Latest SpO2: ${latestChart?.spo2Percent != null ? `${latestChart.spo2Percent}%` : 'missing'} (personal baseline ${astronaut.baseline.spo2Percent}%).`;
  const metabolicAriaLabel = `Metabolic and mass trend chart over ${chartData.length} mission days ending ${latestDay}. Latest blood glucose: ${latestChart?.bloodGlucose != null ? `${latestChart.bloodGlucose} ${glucoseUnit}` : 'missing'} (personal baseline ${glucoseBaseline} ${glucoseUnit}). Latest body mass: ${latestChart?.bodyMass != null ? `${latestChart.bodyMass.toFixed(1)} ${massUnit}` : 'missing'}.`;
  const radAriaLabel = `Ionizing radiation dosimetry chart over ${chartData.length} mission days ending ${latestDay}. Latest daily dose: ${latestChart?.dailyRadiationMsv != null ? `${latestChart.dailyRadiationMsv} mSv/day` : 'missing'}. Cumulative dose: ${latestChart?.cumulativeRadiationMsv != null ? `${latestChart.cumulativeRadiationMsv} mSv` : 'missing'} against ${astronaut.baseline.radiationBudgetMsv} mSv ALARA mission budget.`;

  return (
    <section aria-labelledby="vitals-trends-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="vitals-trends-heading" className="arogya-h2 text-[var(--arogya-text-primary)]">
            Physiological Trend Visualizations
          </h2>
          <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
            Dashed horizontal lines indicate {astronaut.callSign} personal baselines; shaded bands and dotted bounds indicate general adult reference ranges.
            <span className="ml-1 font-mono-tabular text-[var(--arogya-text-muted)]">
              (D{window.startDay}–D{window.endDay} window)
            </span>
          </p>
          {coverageNotice && (
            <p
              role="status"
              className="mt-1 inline-flex items-center rounded-md border border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-2 py-1 text-[11px] font-medium text-[var(--arogya-warning-text)]"
            >
              {coverageNotice}
            </p>
          )}
        </div>

        <div
          role="group"
          aria-label="Trend chart time window"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)] p-1"
        >
          {OBSERVATION_WINDOW_OPTIONS.map((win) => {
            const active = timeWindow === win;
            return (
              <button
                key={win}
                type="button"
                onClick={() => onTimeWindowChange(win)}
                aria-pressed={active}
                /* Constant weight/width: activating a period must not resize or move the group. */
                className={`min-h-[40px] min-w-[76px] whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                }`}
              >
                {win} Days
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Chart 1: Resting HR + Systolic & Diastolic BP */}
        <ChartContainer
          title="Cardiovascular: Heart Rate & Blood Pressure"
          subtitle={`Personal baseline: HR ${astronaut.baseline.restingHeartRateBpm} bpm · BP ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg | Gen ref: HR 50–90 · BP 95–130 / 60–85`}
          isEmpty={chartData.length === 0}
          heightClass="h-64"
        >
          <div role="img" aria-label={cvAriaLabel} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} domain={[40, 165]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* General Adult Systolic Reference Band */}
              <ReferenceArea
                y1={CLINICAL_THRESHOLDS.generalSystolicMin}
                y2={CLINICAL_THRESHOLDS.generalSystolicMax}
                fill="#1D4ED8"
                fillOpacity={0.07}
                ifOverflow="extendDomain"
              />
              {/* Personal Baselines */}
              <ReferenceLine
                y={astronaut.baseline.restingHeartRateBpm}
                stroke="#0E7490"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{ value: 'Personal HR', position: 'insideBottomRight', fill: '#0E7490', fontSize: 10 }}
              />
              <ReferenceLine
                y={astronaut.baseline.systolicBpMmHg}
                stroke="#C2410C"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{ value: 'Personal Sys', position: 'insideTopRight', fill: '#C2410C', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="systolicBpMmHg"
                name="Systolic BP (mmHg)"
                stroke="#C2410C"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="diastolicBpMmHg"
                name="Diastolic BP (mmHg)"
                stroke="#1D4ED8"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="heartRateBpm"
                name="Resting HR (bpm)"
                stroke="#0E7490"
                strokeWidth={2.2}
                strokeDasharray="2 2"
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* Chart 2: Temperature & SpO2 */}
        <ChartContainer
          title={`Thermoregulation & Oxygenation (Temp ${tempUnit} · SpO₂ %)`}
          subtitle={`Personal baseline: ${tempBaseline.toFixed(1)} ${tempUnit} · SpO₂ ${astronaut.baseline.spo2Percent}% | Gen ref: ${tempGenMin.toFixed(1)}–${tempGenMax.toFixed(1)} ${tempUnit} · SpO₂ >= 95%`}
          isEmpty={chartData.length === 0}
          heightClass="h-64"
        >
          <div role="img" aria-label={thermoAriaLabel} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#64748B" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#B45309"
                fontSize={11}
                domain={[35.5, 39.5]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#0E7490"
                fontSize={11}
                domain={[88, 102]}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* Personal Temp Baseline */}
              <ReferenceLine
                yAxisId="left"
                y={tempBaseline}
                stroke="#A16207"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: 'Personal Temp', position: 'insideTopLeft', fill: '#B45309', fontSize: 10 }}
              />
              {/* General Adult SpO2 Threshold */}
              <ReferenceLine
                yAxisId="right"
                y={CLINICAL_THRESHOLDS.generalSpo2Min}
                stroke="#64748B"
                strokeDasharray="2 3"
                label={{ value: 'Gen SpO₂ 95%', position: 'insideBottomRight', fill: '#64748B', fontSize: 10 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bodyTemp"
                name={`Temperature (${tempUnit})`}
                stroke="#A16207"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spo2Percent"
                name="SpO₂ (%)"
                stroke="#0E7490"
                strokeWidth={2.2}
                strokeDasharray="5 3"
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* Chart 3: Blood Glucose & Body Mass */}
        <ChartContainer
          title={`Metabolic & Mass: Blood Glucose (${glucoseUnit}) & Body Mass (${massUnit})`}
          subtitle={`Personal baseline: ${glucoseBaseline} ${glucoseUnit} · ${massBaseline != null ? `${massBaseline.toFixed(1)} ${massUnit}` : 'Mass N/A'} | Gen ref: ${glucoseGenMin}–${glucoseGenMax} ${glucoseUnit}`}
          isEmpty={chartData.length === 0}
          heightClass="h-64"
        >
          <div role="img" aria-label={metabolicAriaLabel} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#64748B" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#1D4ED8"
                fontSize={11}
                domain={[3, 11]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#15803D"
                fontSize={11}
                domain={['auto', 'auto']}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* General Adult Fasting Glucose Range */}
              <ReferenceArea
                yAxisId="left"
                y1={glucoseGenMin}
                y2={glucoseGenMax}
                fill="#1D4ED8"
                fillOpacity={0.07}
              />
              {/* Personal Fasting Glucose Baseline */}
              <ReferenceLine
                yAxisId="left"
                y={glucoseBaseline}
                stroke="#1D4ED8"
                strokeDasharray="4 4"
                strokeOpacity={0.75}
                label={{ value: 'Personal Glucose', position: 'insideTopLeft', fill: '#1D4ED8', fontSize: 10 }}
              />
              {massBaseline != null && (
                <ReferenceLine
                  yAxisId="right"
                  y={massBaseline}
                  stroke="#15803D"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
              )}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bloodGlucose"
                name={`Blood Glucose (${glucoseUnit})`}
                stroke="#1D4ED8"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bodyMass"
                name={`Body Mass (${massUnit})`}
                stroke="#15803D"
                strokeWidth={2.2}
                strokeDasharray="5 3"
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* Chart 4: Radiation Dosimetry */}
        <ChartContainer
          title="Ionizing Radiation Dosimetry (Daily & Cumulative)"
          subtitle={`Personal mission budget: ${astronaut.baseline.radiationBudgetMsv} mSv ALARA | Gen cruise watch threshold: < 1.20 mSv/day`}
          isEmpty={chartData.length === 0}
          heightClass="h-64"
        >
          <div role="img" aria-label={radAriaLabel} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#64748B" fontSize={11} />
              <YAxis yAxisId="left" stroke="#C2410C" fontSize={11} domain={[0, 'auto']} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748B"
                fontSize={11}
                domain={[0, 'auto']}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <ReferenceLine
                yAxisId="left"
                y={CLINICAL_THRESHOLDS.dailyRadiationWatchMsv}
                stroke="#A16207"
                strokeDasharray="4 4"
                label={{ value: '1.20 mSv/d Watch', position: 'insideTopRight', fill: '#B45309', fontSize: 10 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dailyRadiationMsv"
                name="Daily Dose (mSv/d)"
                stroke="#C2410C"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeRadiationMsv"
                name="Cumulative Dose (mSv)"
                stroke="#64748B"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 2 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>
    </section>
  );
}
