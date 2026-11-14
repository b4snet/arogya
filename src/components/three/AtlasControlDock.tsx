import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bone,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  HeartPulse,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { HealthAssessment, HealthStatusLevel, OrganTarget } from '../../types';
import type { AtlasLayerState } from '../../store/useArogyaStore';
import { getOrganSelectorStatus } from '../../engine/atlasPanelBuilder';
import { STATUS_META } from '../../engine/thresholds';

interface AtlasControlDockProps {
  atlasState: AtlasLayerState;
  assessment: HealthAssessment;
  onSelectOrgan: (organ: OrganTarget) => void;
  onUpdateAtlas: (patch: Partial<AtlasLayerState>) => void;
  onResetView: () => void;
}

function StatusIcon({ status }: { status: HealthStatusLevel }) {
  if (status === 'red') return <ShieldAlert className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />;
  if (status === 'orange') return <AlertTriangle className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />;
  if (status === 'yellow') return <AlertCircle className="h-3.5 w-3.5 text-[#EAB308]" aria-hidden="true" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />;
}

export function AtlasControlDock({
  atlasState,
  assessment,
  onSelectOrgan,
  onUpdateAtlas,
  onResetView,
}: AtlasControlDockProps) {
  const [collapsed, setCollapsed] = useState(false);

  const organItems: Array<{
    id: OrganTarget;
    label: string;
    status: HealthStatusLevel;
  }> = [
    { id: 'brain', label: 'Brain', status: getOrganSelectorStatus('brain', assessment) },
    { id: 'heart', label: 'Heart', status: getOrganSelectorStatus('heart', assessment) },
    { id: 'lungs', label: 'Lungs', status: getOrganSelectorStatus('lungs', assessment) },
    { id: 'full_body', label: 'Full Body', status: getOrganSelectorStatus('full_body', assessment) },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center px-3">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="pointer-events-auto mb-1 inline-flex min-h-[36px] items-center gap-1.5 rounded-t-lg border border-b-0 border-white/15 bg-[#0B1120]/95 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:text-white"
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        <span>{collapsed ? 'Show 3D Controls' : 'Hide 3D Controls'}</span>
      </button>

      {!collapsed && (
        <div
          className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#0B1120]/95 px-3 py-2 shadow-2xl"
          role="toolbar"
          aria-label="3D Health Atlas Controls"
        >
          {/* Accessible Organ Selection Buttons (Icon + Name + Status Text) */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-1">
            {organItems.map((btn) => {
              const active = atlasState.selectedOrgan === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onSelectOrgan(btn.id)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#0B3D91] text-white ring-1 ring-[#22D3EE]/50'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <StatusIcon status={btn.status} />
                  <span>{btn.label}</span>
                  <span className="sr-only">({STATUS_META[btn.status].shortLabel})</span>
                </button>
              );
            })}
          </div>

          <div className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

          {/* Layer Toggles: Astronaut Body, Organs, Skeleton */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-pressed={atlasState.showSuitShell}
              onClick={() => onUpdateAtlas({ showSuitShell: !atlasState.showSuitShell })}
              className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                atlasState.showSuitShell
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Body</span>
            </button>

            <button
              type="button"
              aria-pressed={atlasState.showOrgans}
              onClick={() => onUpdateAtlas({ showOrgans: !atlasState.showOrgans })}
              className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                atlasState.showOrgans
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Organs</span>
            </button>

            <button
              type="button"
              aria-pressed={atlasState.showSkeleton}
              onClick={() => onUpdateAtlas({ showSkeleton: !atlasState.showSkeleton })}
              className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                atlasState.showSkeleton
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <Bone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Skeleton</span>
            </button>

            <button
              type="button"
              onClick={onResetView}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset View</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
