import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Compass,
  FileText,
  HeartPulse,
  HelpCircle,
  Info,
  Minus,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  User,
  Wind,
  X,
  XCircle,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CheckIn, HealthAssessment, OrganTarget, VitalReading } from '../../types';
import {
  buildAtlasPanelViewModel,
  type AtlasIndicatorItem,
  type IndicatorAttentionLevel,
  type IndicatorTrendDirection,
} from '../../engine/atlasPanelBuilder';
import { useArogyaStore } from '../../store/useArogyaStore';
import { StatusPill, healthStatusToTone } from '../ui';

interface OrganDetailPanelProps {
  organ: OrganTarget;
  assessment: HealthAssessment;
  vitals14d: VitalReading[];
  checkIns14d: CheckIn[];
  onSelectOrgan?: (organ: OrganTarget) => void;
  onCloseMobile?: () => void;
}

const SYSTEM_ICONS: Record<OrganTarget, typeof Brain> = {
  brain: Brain,
  heart: HeartPulse,
  lungs: Wind,
  full_body: User,
};

const LINK_ICONS: Record<string, typeof Activity> = {
  '/check-in': ClipboardCheck,
  '/vitals': Activity,
  '/reports': FileText,
  '/mission': Compass,
};

const STATUS_BANNER_CLASSES = {
  green: 'border-[#22C55E]/35 bg-[#22C55E]/10 text-[#4ADE80]',
  yellow: 'border-[#EAB308]/35 bg-[#EAB308]/10 text-[#FACC15]',
  orange: 'border-[#F97316]/40 bg-[#F97316]/12 text-[#FB923C]',
  red: 'border-[#EF4444]/45 bg-[#EF4444]/15 text-[#F87171]',
} as const;

function IndicatorAttentionBadge({ level }: { level: IndicatorAttentionLevel }) {
  if (level === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FACC15]">
        <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>Missing</span>
      </span>
    );
  }
  if (level === 'caution') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FB923C]">
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>Review</span>
      </span>
    );
  }
  if (level === 'watch') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FACC15]">
        <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>Watch</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4ADE80]">
      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>Nominal</span>
    </span>
  );
}

function TrendIcon({ direction }: { direction: IndicatorTrendDirection }) {
  if (direction === 'rising') {
    return <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#38BDF8]" aria-hidden="true" />;
  }
  if (direction === 'falling') {
    return <TrendingDown className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" aria-hidden="true" />;
  }
  if (direction === 'stable') {
    return <Minus className="h-3.5 w-3.5 shrink-0 text-[#4ADE80]" aria-hidden="true" />;
  }
  return <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[var(--arogya-text-muted)]" aria-hidden="true" />;
}

function IndicatorRow({ item }: { item: AtlasIndicatorItem }) {
  return (
    <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[var(--arogya-text-primary)]">
              {item.label}
            </span>
            <IndicatorAttentionBadge level={item.attentionLevel} />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--arogya-text-secondary)]">
            <TrendIcon direction={item.trendDirection} />
            <span>{item.trendLabel}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`font-mono-tabular text-sm font-semibold ${
              item.isMissing ? 'text-[#FACC15]' : 'text-[var(--arogya-text-primary)]'
            }`}
          >
            {item.latestValue}
          </span>
          {!item.isMissing && item.unit && (
            <span className="ml-1 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
              {item.unit}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 space-y-1 border-t border-[var(--arogya-border)] pt-2 text-[11px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[var(--arogya-text-secondary)]">Personal baseline:</span>
          <span className="text-right font-mono-tabular text-[#22D3EE]">
            {item.personalBaseline}
          </span>
        </div>
        {item.generalReferenceRange && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--arogya-text-secondary)]">General reference:</span>
            <span className="text-right font-mono-tabular text-[var(--arogya-text-primary)]">
              {item.generalReferenceRange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrganDetailPanel({
  organ,
  assessment,
  vitals14d,
  checkIns14d,
  onSelectOrgan,
  onCloseMobile,
}: OrganDetailPanelProps) {
  const [explainOpen, setExplainOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const astronauts = useArogyaStore((s) => s.astronauts);
  const activeAstronautId = useArogyaStore((s) => s.activeAstronautId);
  const mission = useArogyaStore((s) => s.mission);
  const storeSelectOrgan = useArogyaStore((s) => s.selectOrgan);

  const astronaut = useMemo(
    () => astronauts.find((a) => a.id === activeAstronautId) ?? astronauts[0],
    [astronauts, activeAstronautId]
  );

  const panel = useMemo(
    () =>
      buildAtlasPanelViewModel({
        organ,
        astronaut,
        assessment,
        mission,
        vitals14d,
        checkIns14d,
        units: 'metric',
      }),
    [organ, astronaut, assessment, mission, vitals14d, checkIns14d]
  );

  useEffect(() => {
    setExplainOpen(false);
    setSelectedSeriesId(panel.trendSeries[0]?.id ?? null);
  }, [organ, panel.trendSeries]);

  const activeSeries =
    panel.trendSeries.find((s) => s.id === selectedSeriesId) ?? panel.trendSeries[0];

  const SystemIcon = SYSTEM_ICONS[organ];
  const tone = healthStatusToTone(panel.status);
  const handleOrganJump = onSelectOrgan ?? storeSelectOrgan;

  return (
    <aside
      aria-label={`${panel.title} Health Panel`}
      className="flex h-full flex-col overflow-y-auto border-l border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-5 text-[var(--arogya-text-primary)]"
    >
      {/* Header: System Icon, Title & Mobile Close */}
      <header className="flex items-start justify-between gap-3 border-b border-[var(--arogya-border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[#22D3EE]">
            <SystemIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              System Assessment · {astronaut.callSign}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold leading-snug text-[var(--arogya-text-primary)]">
              {panel.title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
              {panel.subtitle}
            </p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--arogya-text-secondary)] hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close system health panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </header>

      {/* Current Status Pill, Required Status Guidance, Score & Plain-Language Explanation */}
      <section
        aria-label="Current system status"
        className="mt-4 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[var(--arogya-text-secondary)]">{panel.scoreLabel}</p>
            <p className="font-mono-tabular text-2xl font-bold text-[var(--arogya-text-primary)]">
              {panel.score}
              <span className="ml-1 text-xs font-normal text-[var(--arogya-text-secondary)]">
                / 100
              </span>
            </p>
          </div>
          <StatusPill tone={tone} label={panel.statusPillLabel} size="md" />
        </div>

        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${STATUS_BANNER_CLASSES[panel.status]}`}
        >
          {panel.statusActionCopy}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
          {panel.plainLanguageSummary}
        </p>

        <button
          type="button"
          onClick={() => setExplainOpen((prev) => !prev)}
          aria-expanded={explainOpen}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#22D3EE]/35 bg-[#0D1522] px-3 py-2 text-xs font-medium text-[#22D3EE] transition-colors hover:border-[#22D3EE]/60 hover:bg-[#121C2B]"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Explain this status</span>
          </span>
          {explainOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
        </button>

        {explainOpen && (
          <div className="mt-2.5 space-y-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            <p className="text-[var(--arogya-text-primary)]">{panel.explainDetails.formulaNote}</p>

            {panel.explainDetails.findings.length > 0 ? (
              <div>
                <p className="font-medium text-[var(--arogya-text-primary)]">
                  Rule-based factors contributing to this status:
                </p>
                <ul className="mt-1 space-y-1 text-[#FACC15]">
                  {panel.explainDetails.findings.map((finding) => (
                    <li key={finding} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#FACC15]" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[#4ADE80]">
                All monitored indicators currently align with personal baselines and expected bounds.
              </p>
            )}

            {panel.explainDetails.missingIndicators.length > 0 && (
              <p className="text-[#FB923C]">
                Missing data flagged (never treated as normal):{' '}
                {panel.explainDetails.missingIndicators.join(', ')}.
              </p>
            )}

            <div className="flex items-center justify-between border-t border-[var(--arogya-border)] pt-2 text-[11px] text-[var(--arogya-text-muted)]">
              <span>Telemetry completeness: {panel.explainDetails.completenessPercent}%</span>
              <span>Non-diagnostic decision support</span>
            </div>
          </div>
        )}
      </section>

      {/* Full-Body Top Priorities & Completed/Missed Health Actions */}
      {panel.topPriorities && panel.topPriorities.length > 0 && (
        <section aria-label="Top health priorities" className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Top Priorities Today
          </h3>
          <ul className="mt-2 space-y-2 text-xs">
            {panel.topPriorities.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--arogya-text-primary)]">
                    {item.title}
                  </span>
                  <span className="font-mono-tabular text-[11px] uppercase text-[#22D3EE]">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1 text-[var(--arogya-text-secondary)]">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(panel.completedHealthActions || panel.missedHealthActions) && (
        <section aria-label="Completed and missed health actions" className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Completed & Missed Health Actions
          </h3>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {panel.completedHealthActions && panel.completedHealthActions.length > 0 && (
              <div className="rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/5 p-3 text-xs">
                <p className="font-medium text-[#4ADE80]">Completed</p>
                <ul className="mt-1.5 space-y-1 text-[var(--arogya-text-primary)]">
                  {panel.completedHealthActions.map((act) => (
                    <li key={act} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {panel.missedHealthActions && panel.missedHealthActions.length > 0 && (
              <div className="rounded-lg border border-[#EAB308]/30 bg-[#EAB308]/5 p-3 text-xs">
                <p className="font-medium text-[#FACC15]">Missed or Pending</p>
                <ul className="mt-1.5 space-y-1 text-[var(--arogya-text-primary)]">
                  {panel.missedHealthActions.map((act) => (
                    <li key={act} className="flex items-start gap-1.5">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FACC15]" aria-hidden="true" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full-Body 8-System Summary */}
      {panel.systemOverviewList && (
        <section aria-label="All body systems overview" className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Body Systems Readiness
          </h3>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {panel.systemOverviewList.map((row) => {
              const rowTone = healthStatusToTone(row.status);
              const canFocusOrgan = row.targetOrgan !== 'full_body';
              return (
                <button
                  key={row.systemId}
                  type="button"
                  disabled={!canFocusOrgan}
                  onClick={() => canFocusOrgan && handleOrganJump(row.targetOrgan)}
                  className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-2.5 py-2 text-left text-xs transition-colors ${
                    canFocusOrgan
                      ? 'hover:border-[#22D3EE]/45 hover:bg-[#162336]'
                      : 'cursor-default opacity-95'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--arogya-text-primary)]">
                      {row.label}
                    </p>
                    <p className="font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                      Score {row.score}/100
                    </p>
                  </div>
                  <StatusPill tone={rowTone} size="sm" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Relevant Indicators, Trends, Personal Baselines & General Reference Ranges */}
      <section aria-label="Relevant physiological indicators" className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
          Indicators, Baselines & Reference Ranges
        </h3>
        <div className="mt-2.5 space-y-2">
          {panel.indicators.map((ind) => (
            <IndicatorRow key={ind.id} item={ind} />
          ))}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
          {panel.referenceDistinctionNote}
        </p>
      </section>

      {/* Seven-Day Trend Chart (Recharts) */}
      {activeSeries && (
        <section aria-label="Seven-day physiological trend chart" className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              7-Day Trend
            </h3>
            {panel.trendSeries.length > 1 && (
              <div
                role="tablist"
                aria-label="Select 7-day trend metric"
                className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-0.5"
              >
                {panel.trendSeries.map((series, idx) => {
                  const active = series.id === activeSeries.id;
                  return (
                    <button
                      key={series.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedSeriesId(series.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          const next = panel.trendSeries[(idx + 1) % panel.trendSeries.length];
                          setSelectedSeriesId(next.id);
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          const prev =
                            panel.trendSeries[
                              (idx - 1 + panel.trendSeries.length) % panel.trendSeries.length
                            ];
                          setSelectedSeriesId(prev.id);
                        }
                      }}
                      className={`min-h-[36px] whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-[var(--arogya-surface-elevated)] text-[#22D3EE]'
                          : 'text-[var(--arogya-text-secondary)] hover:text-white'
                      }`}
                    >
                      {series.tabLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-2 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-[var(--arogya-text-primary)]">
                {activeSeries.title}
              </span>
              {activeSeries.baselineLabel && (
                <span className="font-mono-tabular text-[#22D3EE]">
                  {activeSeries.baselineLabel}
                </span>
              )}
            </div>

            <div
              role="img"
              aria-label={`7-day trend chart for ${activeSeries.title} (${activeSeries.primaryName}${activeSeries.secondaryName ? ` and ${activeSeries.secondaryName}` : ''}). ${activeSeries.baselineLabel ?? ''} Latest point: ${activeSeries.data[activeSeries.data.length - 1]?.day ?? 'N/A'} value ${activeSeries.data[activeSeries.data.length - 1]?.value ?? 'missing'}.`}
              className="h-44 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeSeries.data}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1522',
                      borderColor: 'rgba(255,255,255,0.16)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#E6EDF6',
                    }}
                  />
                  {activeSeries.secondaryName && (
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  )}
                  {typeof activeSeries.baselineValue === 'number' && (
                    <ReferenceLine
                      y={activeSeries.baselineValue}
                      stroke="#22D3EE"
                      strokeDasharray="4 4"
                      strokeOpacity={0.65}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={activeSeries.primaryName}
                    stroke={activeSeries.primaryColor}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  {activeSeries.secondaryName && activeSeries.secondaryColor && (
                    <Line
                      type="monotone"
                      dataKey="secondary"
                      name={activeSeries.secondaryName}
                      stroke={activeSeries.secondaryColor}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 2.5 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Why This Matters in Spaceflight & Related NASA Spaceflight Hazard */}
      <section aria-label="Spaceflight context and NASA hazard" className="mt-5 space-y-3 text-xs leading-relaxed">
        <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
          <h3 className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            <Info className="h-3.5 w-3.5 shrink-0 text-[#22D3EE]" aria-hidden="true" />
            <span>Why This Matters in Spaceflight</span>
          </h3>
          <ul className="mt-2 space-y-1.5 text-[var(--arogya-text-primary)]">
            {panel.spaceflightRelevancePoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38BDF8]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
          <h3 className="font-semibold uppercase tracking-wider text-[#38BDF8]">
            Related NASA Spaceflight Hazard
          </h3>
          <p className="mt-1 font-medium text-[var(--arogya-text-primary)]">
            {panel.relatedNasaHazardTitle}
          </p>
          <p className="mt-1 text-[var(--arogya-text-secondary)]">
            {panel.relatedNasaHazardDetail}
          </p>
        </div>
      </section>

      {/* Recommended Actions */}
      <section aria-label="Recommended preventive actions" className="mt-5 text-xs leading-relaxed">
        <h3 className="font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
          Recommended Actions
        </h3>
        <ul className="mt-2 space-y-2">
          {panel.recommendedActions.map((act) => (
            <li
              key={act}
              className="flex items-start gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3 py-2 text-[var(--arogya-text-primary)]"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22D3EE]" aria-hidden="true" />
              <span>{act}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Escalation Guidance */}
      <section
        aria-label="Escalation guidance"
        className="mt-5 rounded-xl border border-[#F97316]/35 bg-[#F97316]/10 p-3.5 text-xs leading-relaxed"
      >
        <h3 className="flex items-center gap-1.5 font-semibold text-[#FB923C]">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Escalation Guidance</span>
        </h3>
        <p className="mt-1.5 text-[var(--arogya-text-primary)]">{panel.escalationGuidance}</p>
      </section>

      {/* Relevant Section Links (Check-In, Vitals, Reports, Mission) */}
      <footer className="mt-5 grid grid-cols-2 gap-2 border-t border-[var(--arogya-border)] pt-4">
        {panel.quickLinks.map((linkItem) => {
          const Icon = LINK_ICONS[linkItem.to] ?? Activity;
          const isReports = linkItem.to === '/reports';
          const targetTo =
            isReports && panel.status === 'red' ? '/reports?escalate=1' : linkItem.to;
          return (
            <Link
              key={linkItem.to}
              to={targetTo}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isReports
                  ? 'bg-[#0B3D91] font-semibold text-white hover:bg-[#1D4ED8]'
                  : 'border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-primary)] hover:border-[#22D3EE]/50 hover:text-[#22D3EE]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{linkItem.label}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 opacity-75" aria-hidden="true" />
            </Link>
          );
        })}
      </footer>
    </aside>
  );
}
