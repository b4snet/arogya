import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  HeartPulse,
  Info,
  ShieldAlert,
  User,
  Wind,
} from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { HealthAtlasCanvas } from '../components/three/HealthAtlasCanvas';
import { AtlasControlDock } from '../components/three/AtlasControlDock';
import { OrganDetailPanel } from '../components/atlas/OrganDetailPanel';
import { AstronautSelector } from '../components/dashboard/AstronautSelector';
import { getOrganSelectorStatus } from '../engine/atlasPanelBuilder';
import { STATUS_META } from '../engine/thresholds';
import type { HealthStatusLevel, OrganTarget } from '../types';
import { ORGAN_TO_PRESET } from '../config/atlasAnatomyConfig';

function AccessibleStatusBadge({ status }: { status: HealthStatusLevel }) {
  const meta = STATUS_META[status];
  const Icon =
    status === 'red'
      ? ShieldAlert
      : status === 'orange'
        ? AlertTriangle
        : status === 'yellow'
          ? AlertCircle
          : CheckCircle2;

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{meta.shortLabel}</span>
    </span>
  );
}

export function AtlasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { astronaut, vitals14d, checkIns14d, assessment } = useActiveAssessment();

  const atlasState = useArogyaStore((s) => s.atlasState);
  const selectOrgan = useArogyaStore((s) => s.selectOrgan);
  const setAtlasState = useArogyaStore((s) => s.setAtlasState);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    const param = searchParams.get('organ') as OrganTarget | null;
    if (param && ['brain', 'heart', 'lungs', 'full_body'].includes(param)) {
      selectOrgan(param);
    }
  }, [searchParams, selectOrgan]);

  useEffect(() => {
    if (!mobilePanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobilePanelOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobilePanelOpen]);

  const handleSelectOrgan = (organ: OrganTarget) => {
    selectOrgan(organ);
    setAtlasState({ cameraPreset: ORGAN_TO_PRESET[organ] });
    setSearchParams({ organ });
    setMobilePanelOpen(true);
  };

  const handleResetView = () => {
    setAtlasState({
      cameraPreset: 'overview',
      showSuitShell: true,
      showOrgans: true,
      showSkeleton: false,
      showOrgansOnly: false,
    });
    setResetToken((n) => n + 1);
  };

  const accessibleSystems: Array<{
    id: OrganTarget;
    label: string;
    panelName: string;
    icon: typeof Brain;
    status: HealthStatusLevel;
  }> = [
      {
        id: 'brain',
        label: 'Brain',
        panelName: 'Mind, Sleep & Behavior',
        icon: Brain,
        status: getOrganSelectorStatus('brain', assessment),
      },
      {
        id: 'heart',
        label: 'Heart',
        panelName: 'Cardiovascular Health',
        icon: HeartPulse,
        status: getOrganSelectorStatus('heart', assessment),
      },
      {
        id: 'lungs',
        label: 'Lungs',
        panelName: 'Respiratory Health',
        icon: Wind,
        status: getOrganSelectorStatus('lungs', assessment),
      },
      {
        id: 'full_body',
        label: 'Full Body',
        panelName: 'Full-Body Health Overview',
        icon: User,
        status: getOrganSelectorStatus('full_body', assessment),
      },
    ];

  const activePanelMeta =
    accessibleSystems.find((item) => item.id === atlasState.selectedOrgan) ?? accessibleSystems[3];

  return (
    <div className="flex min-h-[calc(100vh-116px)] w-full flex-col lg:h-[calc(100vh-116px)] lg:flex-row">
      {/* Main 3D Atlas Viewport & Accessible System Strip */}
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        {/* Accessible Crew & Organ Switcher Bar (works without 3D clicking) */}
        <AstronautSelector id="atlas-crew-selector" variant="bar" showDemoReset />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-3.5 py-2.5">
          <span className="text-xs text-[var(--arogya-text-secondary)]">
            Active Crew:{' '}
            <strong className="text-[var(--arogya-text-primary)]">{astronaut.fullName}</strong>{' '}
            <span className="font-mono-tabular">({astronaut.callSign})</span>
          </span>

          <nav aria-label="Accessible anatomical system selector" className="flex flex-wrap items-center gap-1.5">
            {accessibleSystems.map((item) => {
              const Icon = item.icon;
              const active = atlasState.selectedOrgan === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectOrgan(item.id)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${active
                      ? 'border-[#22D3EE]/50 bg-[#121C2B] text-white'
                      : 'border-[var(--arogya-border)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)] hover:border-[var(--arogya-border-strong)] hover:text-[var(--arogya-text-primary)]'
                    }`}
                >
                  <Icon className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                  <span>{item.label}</span>
                  <AccessibleStatusBadge status={item.status} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* 3D Canvas Container */}
        <div className="relative min-h-[460px] flex-1">
          <div
            className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-white/15 bg-[#0B1120]/90 px-3 py-2"
            aria-live="polite"
          >
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              3D Health Atlas · {astronaut.fullName}
            </p>
            <p className="text-xs font-semibold text-white">
              Inspecting:{' '}
              <span className="text-[#22D3EE]">{activePanelMeta.panelName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobilePanelOpen(true)}
            className="absolute right-4 bottom-20 z-10 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B1120]/90 px-3.5 py-2 text-xs font-medium text-white lg:hidden"
          >
            <Info className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
            <span>Open Health Panel</span>
          </button>

          <HealthAtlasCanvas
            assessment={assessment}
            selectedOrgan={atlasState.selectedOrgan}
            showSuitShell={atlasState.showSuitShell}
            showOrgans={atlasState.showOrgans}
            showSkeleton={atlasState.showSkeleton}
            cameraPreset={atlasState.cameraPreset}
            resetToken={resetToken}
            onSelectOrgan={handleSelectOrgan}
          />

          <AtlasControlDock
            atlasState={atlasState}
            assessment={assessment}
            onSelectOrgan={handleSelectOrgan}
            onUpdateAtlas={setAtlasState}
            onResetView={handleResetView}
          />
        </div>
      </div>

      {/* Right-Side Organ Health Panel (Desktop permanent, Mobile slide-over) */}
      <div className="hidden w-[420px] shrink-0 xl:w-[460px] lg:block">
        <OrganDetailPanel
          organ={atlasState.selectedOrgan}
          assessment={assessment}
          vitals14d={vitals14d}
          checkIns14d={checkIns14d}
          onSelectOrgan={handleSelectOrgan}
        />
      </div>

      {mobilePanelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="System health panel"
          className="fixed inset-0 z-50 flex justify-end bg-black/75 lg:hidden"
          onClick={() => setMobilePanelOpen(false)}
        >
          <div
            className="h-full w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <OrganDetailPanel
              organ={atlasState.selectedOrgan}
              assessment={assessment}
              vitals14d={vitals14d}
              checkIns14d={checkIns14d}
              onSelectOrgan={handleSelectOrgan}
              onCloseMobile={() => setMobilePanelOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
