import { RotateCcw } from 'lucide-react';
import type { MissionSceneOverlay } from '../../engine/missionScene';

export type MissionSceneFailure = 'webgl-unavailable' | 'context-lost';

export function missionSceneFailureMessage(failure: MissionSceneFailure): string {
  return failure === 'context-lost'
    ? 'The 3D view stopped because its WebGL context was lost. Mission simulation details remain available.'
    : '3D view unavailable in this browser. Mission simulation details remain available.';
}

export function MissionSceneFallback({
  failure,
  overlay,
  onRetry,
}: {
  failure: MissionSceneFailure;
  overlay: MissionSceneOverlay;
  onRetry: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col justify-center gap-4 overflow-auto bg-[#08111f] p-4 text-slate-100 sm:p-6"
    >
      <div>
        <h3 className="text-sm font-semibold">3D mission view unavailable</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          {missionSceneFailureMessage(failure)}
        </p>
      </div>
      <div className="grid gap-2 rounded-xl border border-white/15 bg-black/20 p-3 text-xs sm:grid-cols-2">
        <p><span className="text-slate-400">Mode:</span> Mission simulation · no ephemeris integration</p>
        <p><span className="text-slate-400">Simulation time:</span> {overlay.missionTimeLabel} · {overlay.dataTimestampLabel}</p>
        <p><span className="text-slate-400">Earth to spacecraft:</span> {overlay.earthDistanceLabel}</p>
        <p><span className="text-slate-400">Earth communication delay:</span> {overlay.earthDelayLabel}</p>
        <p><span className="text-slate-400">Spacecraft to Mars:</span> {overlay.marsDistanceLabel}</p>
        <p><span className="text-slate-400">Transit progress:</span> {overlay.progressLabel}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[38px] w-fit items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-semibold hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry 3D view
      </button>
    </div>
  );
}
