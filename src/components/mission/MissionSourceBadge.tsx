import type { MissionDataSource } from '../../engine/missionStatus';

const SOURCE_META: Record<
  MissionDataSource,
  { label: string; title: string; className: string }
> = {
  simulated: {
    label: 'Simulated',
    title: 'In-memory demonstration data, not a recorded measurement',
    className: 'border-[#B45309]/30 bg-[#FFFBEB] text-[#92400E]',
  },
  recorded: {
    label: 'Recorded',
    title: 'Browser-local recorded observation',
    className: 'border-[#1E3A5F]/25 bg-[#EFF6FF] text-[#1E3A5F]',
  },
  research: {
    label: 'Research observation',
    title: 'Archived NASA OSD-575 research context, not this crew',
    className: 'border-[#6B21A8]/25 bg-[#FAF5FF] text-[#6B21A8]',
  },
};

export function MissionSourceBadge({
  source,
  className = '',
}: {
  source: MissionDataSource;
  className?: string;
}) {
  const meta = SOURCE_META[source];
  return (
    <span
      data-mission-source={source}
      title={meta.title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}
