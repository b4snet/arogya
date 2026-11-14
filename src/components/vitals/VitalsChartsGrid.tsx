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
import { celsiusToFahrenheit, kgToLb, mgDlToMmolL } from '../../utils/unitConversions';

export type VitalsTimeWindow = 7 | 14 | 30;

interface VitalsChartsGridProps {
  astronaut: Astronaut;
  allReadings: VitalReading[];
  timeWindow: VitalsTimeWindow;
  onTimeWindowChange: (win: VitalsTimeWindow) => void;
  units: 'metric' | 'imperial';
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0D1522',
  borderColor: 'rgba(255,255,255,0.16)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#E6EDF6',
};

export function VitalsChartsGrid({
  astronaut,
  allReadings,
  timeWindow,
  onTimeWindowChange,
  units,
}: VitalsChartsGridProps) {
  const isImperial = units === 'imperial';
  const sorted = [...allReadings].sort((a, b) => a.missionDay - b.missionDay);
  const windowData = sorted.slice(-timeWindow);

  const chartData = windowData.map((v) => ({
    missionDay: `D${v.missionDay}`,
    heartRateBpm: v.heartRateBpm,
    systolicBpMmHg: v.systolicBpMmHg,
    diastolicBpMmHg: v.diastolicBpMmHg,
    spo2Percent: v.spo2Percent,
    bodyTemp:
      v.bodyTempC != null
        ? isImperial
          ? celsiusToFahrenheit(v.bodyTempC)
          : v.bodyTempC
        : null,
    bloodGlucose:
      v.bloodGlucoseMgDl != null
        ? isImperial
          ? mgDlToMmolL(v.bloodGlucoseMgDl)
          : v.bloodGlucoseMgDl
        : null,
    bodyMass:
      v.bodyMassKg != null
        ? isImperial
          ? kgToLb(v.bodyMassKg)
          : v.bodyMassKg
        : null,
    dailyRadiationMsv: v.dailyRadiationMsv,
    cumulativeRadiationMsv: v.cumulativeRadiationMsv,
  }));

  const tempUnit = isImperial ? '°F' : '°C';
  const tempBaseline = isImperial
    ? celsiusToFahrenheit(astronaut.baseline.bodyTempC)
    : astronaut.baseline.bodyTempC;
  const tempGenMin = isImperial
    ? celsiusToFahrenheit(CLINICAL_THRESHOLDS.generalTempMinC)
    : CLINICAL_THRESHOLDS.generalTempMinC;
  const tempGenMax = isImperial
    ? celsiusToFahrenheit(CLINICAL_THRESHOLDS.generalTempMaxC)
    : CLINICAL_THRESHOLDS.generalTempMaxC;

  const glucoseUnit = isImperial ? 'mmol/L' : 'mg/dL';
  const glucoseBaseline = isImperial
    ? mgDlToMmolL(astronaut.baseline.fastingGlucoseMgDl)
    : astronaut.baseline.fastingGlucoseMgDl;
  const glucoseGenMin = isImperial
    ? mgDlToMmolL(CLINICAL_THRESHOLDS.generalGlucoseMinMgDl)
    : CLINICAL_THRESHOLDS.generalGlucoseMinMgDl;
  const glucoseGenMax = isImperial
    ? mgDlToMmolL(CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl)
    : CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl;

  const massUnit = isImperial ? 'lb' : 'kg';
  const massBaseline =
    astronaut.baseline.bodyMassKg != null
      ? isImperial
        ? kgToLb(astronaut.baseline.bodyMassKg)
        : astronaut.baseline.bodyMassKg
      : null;

  const hasFewerDaysThanWindow = sorted.length < timeWindow;
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
            {hasFewerDaysThanWindow && (
              <span className="ml-1 text-[var(--arogya-text-muted)]">
                (Showing {sorted.length} logged mission days within {timeWindow}-day window.)
              </span>
            )}
          </p>
        </div>

        <div
          role="group"
          aria-label="Trend chart time window"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)] p-1"
        >
          {([7, 14, 30] as const).map((win) => {
            const active = timeWindow === win;
            return (
              <button
                key={win}
                type="button"
                onClick={() => onTimeWindowChange(win)}
                aria-pressed={active}
                className={`min-h-[40px] whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#22D3EE] text-[#060B14] font-semibold'
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
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} domain={[40, 165]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* General Adult Systolic Reference Band */}
              <ReferenceArea
                y1={CLINICAL_THRESHOLDS.generalSystolicMin}
                y2={CLINICAL_THRESHOLDS.generalSystolicMax}
                fill="#38BDF8"
                fillOpacity={0.07}
                ifOverflow="extendDomain"
              />
              {/* Personal Baselines */}
              <ReferenceLine
                y={astronaut.baseline.restingHeartRateBpm}
                stroke="#22D3EE"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{ value: 'Personal HR', position: 'insideBottomRight', fill: '#22D3EE', fontSize: 10 }}
              />
              <ReferenceLine
                y={astronaut.baseline.systolicBpMmHg}
                stroke="#F97316"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{ value: 'Personal Sys', position: 'insideTopRight', fill: '#FB923C', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="systolicBpMmHg"
                name="Systolic BP (mmHg)"
                stroke="#F97316"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="diastolicBpMmHg"
                name="Diastolic BP (mmHg)"
                stroke="#38BDF8"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="heartRateBpm"
                name="Resting HR (bpm)"
                stroke="#22D3EE"
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
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#94A3B8" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#FACC15"
                fontSize={11}
                domain={isImperial ? [95, 103] : [35.5, 39.5]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#22D3EE"
                fontSize={11}
                domain={[88, 102]}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* Personal Temp Baseline */}
              <ReferenceLine
                yAxisId="left"
                y={tempBaseline}
                stroke="#EAB308"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: 'Personal Temp', position: 'insideTopLeft', fill: '#FACC15', fontSize: 10 }}
              />
              {/* General Adult SpO2 Threshold */}
              <ReferenceLine
                yAxisId="right"
                y={CLINICAL_THRESHOLDS.generalSpo2Min}
                stroke="#94A3B8"
                strokeDasharray="2 3"
                label={{ value: 'Gen SpO₂ 95%', position: 'insideBottomRight', fill: '#94A3B8', fontSize: 10 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bodyTemp"
                name={`Temperature (${tempUnit})`}
                stroke="#EAB308"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spo2Percent"
                name="SpO₂ (%)"
                stroke="#22D3EE"
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
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#94A3B8" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#38BDF8"
                fontSize={11}
                domain={isImperial ? [3, 11] : [60, 180]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#22C55E"
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
                fill="#38BDF8"
                fillOpacity={0.07}
              />
              {/* Personal Fasting Glucose Baseline */}
              <ReferenceLine
                yAxisId="left"
                y={glucoseBaseline}
                stroke="#38BDF8"
                strokeDasharray="4 4"
                strokeOpacity={0.75}
                label={{ value: 'Personal Glucose', position: 'insideTopLeft', fill: '#38BDF8', fontSize: 10 }}
              />
              {massBaseline != null && (
                <ReferenceLine
                  yAxisId="right"
                  y={massBaseline}
                  stroke="#22C55E"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
              )}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bloodGlucose"
                name={`Blood Glucose (${glucoseUnit})`}
                stroke="#38BDF8"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bodyMass"
                name={`Body Mass (${massUnit})`}
                stroke="#22C55E"
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
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="missionDay" stroke="#94A3B8" fontSize={11} />
              <YAxis yAxisId="left" stroke="#F97316" fontSize={11} domain={[0, 'auto']} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94A3B8"
                fontSize={11}
                domain={[0, 'auto']}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <ReferenceLine
                yAxisId="left"
                y={CLINICAL_THRESHOLDS.dailyRadiationWatchMsv}
                stroke="#EAB308"
                strokeDasharray="4 4"
                label={{ value: '1.20 mSv/d Watch', position: 'insideTopRight', fill: '#FACC15', fontSize: 10 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dailyRadiationMsv"
                name="Daily Dose (mSv/d)"
                stroke="#F97316"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeRadiationMsv"
                name="Cumulative Dose (mSv)"
                stroke="#94A3B8"
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
