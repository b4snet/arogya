import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  Radiation,
  Smile,
} from 'lucide-react';
import type { Astronaut, CheckIn, Vitals } from '../../types';
import { Card } from '../ui';
import { MiniTrendChart } from './MiniTrendChart';

export { HealthReadinessCard } from './HealthReadinessCard';
export { ActiveAlerts } from './ActiveAlerts';
export { NextBestAction } from './NextBestAction';
export { MissionProgressWidget } from './MissionProgressWidget';
export { AstronautSelector } from './AstronautSelector';

export function AstronautProfileCard({ astronaut }: { astronaut: Astronaut }) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Active Crew Profile
          </p>
          <h2 className="mt-1 text-base font-semibold text-[var(--arogya-text-primary)]">
            {astronaut.fullName}
          </h2>
          <p className="text-xs text-[var(--arogya-text-secondary)]">
            {astronaut.role} · Call Sign {astronaut.callSign}
          </p>
        </div>
        <span className="rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-2 py-1 font-mono-tabular text-xs font-semibold text-[#22D3EE]">
          {astronaut.id}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--arogya-border)] pt-3 text-xs">
        <div>
          <dt className="text-[11px] text-[var(--arogya-text-secondary)]">Base HR</dt>
          <dd className="mt-0.5 font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">
            {astronaut.baseline.restingHeartRateBpm} bpm
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--arogya-text-secondary)]">Sleep Goal</dt>
          <dd className="mt-0.5 font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">
            {astronaut.baseline.sleepTargetHours.toFixed(1)} h
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--arogya-text-secondary)]">EVA Total</dt>
          <dd className="mt-0.5 font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">
            {astronaut.evaHoursTotal} h
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function CheckInStatusCard({
  latestCheckIn,
  missionDay,
}: {
  latestCheckIn?: CheckIn;
  missionDay: number;
}) {
  const completedToday = latestCheckIn?.missionDay === missionDay;

  return (
    <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            completedToday
              ? 'border-[#22C55E]/35 bg-[#22C55E]/10 text-[#4ADE80]'
              : 'border-[#EAB308]/35 bg-[#EAB308]/10 text-[#FACC15]'
          }`}
        >
          <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--arogya-text-primary)]">
            {completedToday ? "Today's Check-In Complete" : "Today's Check-In Pending"}
          </p>
          <p className="text-xs text-[var(--arogya-text-secondary)]">
            {completedToday
              ? `Sol ${missionDay} sleep, mood, hydration & exercise logged.`
              : `Log Sol ${missionDay} behavioral & recovery metrics.`}
          </p>
        </div>
      </div>

      <Link
        to="/check-in"
        className="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-lg bg-[#22D3EE] px-4 text-xs font-semibold text-[#060B14] transition-colors hover:bg-[#38BDF8]"
      >
        {completedToday ? 'Update Log' : 'Start Check-In'}
      </Link>
    </Card>
  );
}

export function MiniTrendGrid({
  vitals14d,
  checkIns14d,
  astronaut,
}: {
  vitals14d: Vitals[];
  checkIns14d: CheckIn[];
  astronaut: Astronaut;
}) {
  const latestVital = vitals14d[vitals14d.length - 1];
  const latestCheckIn = checkIns14d[checkIns14d.length - 1];

  const tiles = [
    {
      label: 'Sleep',
      value: latestCheckIn ? `${latestCheckIn.sleepHours.toFixed(1)} h` : 'MISSING',
      unit: 'h',
      targetHint: `Goal ${astronaut.baseline.sleepTargetHours.toFixed(1)}h`,
      isMissing: !latestCheckIn,
      icon: Moon,
      color: '#38BDF8',
      data: checkIns14d.slice(-7).map((c) => ({ day: String(c.missionDay), v: c.sleepHours })),
    },
    {
      label: 'Mood',
      value: latestCheckIn ? `${latestCheckIn.moodScore} / 5` : 'MISSING',
      unit: '/5',
      targetHint: 'Scale 1–5',
      isMissing: !latestCheckIn,
      icon: Smile,
      color: '#22D3EE',
      data: checkIns14d.slice(-7).map((c) => ({ day: String(c.missionDay), v: c.moodScore })),
    },
    {
      label: 'Exercise',
      value: latestCheckIn ? `${latestCheckIn.exerciseMinutes} min` : 'MISSING',
      unit: 'min',
      targetHint: `Goal ${astronaut.baseline.exerciseTargetMinutes}m`,
      isMissing: !latestCheckIn,
      icon: Dumbbell,
      color: '#22C55E',
      data: checkIns14d.slice(-7).map((c) => ({ day: String(c.missionDay), v: c.exerciseMinutes })),
    },
    {
      label: 'Hydration',
      value: latestCheckIn ? `${latestCheckIn.hydrationLiters.toFixed(1)} L` : 'MISSING',
      unit: 'L',
      targetHint: `Goal ${astronaut.baseline.hydrationTargetLiters.toFixed(1)}L`,
      isMissing: !latestCheckIn,
      icon: Droplets,
      color: '#38BDF8',
      data: checkIns14d.slice(-7).map((c) => ({ day: String(c.missionDay), v: c.hydrationLiters })),
    },
    {
      label: 'Radiation',
      value:
        latestVital?.dailyRadiationMsv != null
          ? `${latestVital.dailyRadiationMsv.toFixed(2)} mSv`
          : 'MISSING',
      unit: 'mSv',
      targetHint: `Cum ${(latestVital?.cumulativeRadiationMsv ?? 0).toFixed(1)} mSv`,
      isMissing: latestVital?.dailyRadiationMsv == null,
      icon: Radiation,
      color: '#EAB308',
      data: vitals14d.slice(-7).map((v) => ({ day: String(v.missionDay), v: v.dailyRadiationMsv })),
    },
    {
      label: 'Heart Rate',
      value:
        latestVital?.heartRateBpm != null ? `${latestVital.heartRateBpm} bpm` : 'MISSING',
      unit: 'bpm',
      targetHint: `Base ${astronaut.baseline.restingHeartRateBpm} bpm`,
      isMissing: latestVital?.heartRateBpm == null,
      icon: HeartPulse,
      color: '#EF4444',
      data: vitals14d.slice(-7).map((v) => ({ day: String(v.missionDay), v: v.heartRateBpm })),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
      {tiles.map((tile) => (
        <MiniTrendChart
          key={tile.label}
          label={tile.label}
          value={tile.value}
          unit={tile.unit}
          targetHint={tile.targetHint}
          isMissing={tile.isMissing}
          icon={tile.icon}
          color={tile.color}
          data={tile.data}
        />
      ))}
    </div>
  );
}
