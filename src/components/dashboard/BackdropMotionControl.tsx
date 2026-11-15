import { Pause, Play } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { toggleBackdropPaused, useBackdropMotion } from '../../hooks/useBackdropMotion';

/**
 * Accessible motion control for the page-wide backdrop video.
 * Reports the real state of the video, not an assumed one, and stays out of the
 * decorative layer so assistive technology can reach it.
 */
export function BackdropMotionControl() {
  const reducedMotion = useReducedMotion();
  const { paused, playing } = useBackdropMotion();

  if (reducedMotion) {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#060B14]/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-lg"
      >
        <Pause className="h-3 w-3 text-slate-400" aria-hidden="true" />
        <span>Motion off (reduced motion)</span>
      </span>
    );
  }

  if (import.meta.env.MODE === 'release') {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#060B14]/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-lg"
      >
        <span>Static CSS background · no video motion</span>
      </span>
    );
  }

  const label = paused ? 'Motion paused' : playing ? 'Motion playing' : 'Motion idle';

  return (
    <button
      type="button"
      onClick={toggleBackdropPaused}
      aria-pressed={paused}
      aria-label={paused ? 'Resume background video motion' : 'Pause background video motion'}
      className="pointer-events-auto inline-flex min-h-[32px] min-w-[132px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-[#060B14]/85 px-2.5 py-1 text-[11px] font-medium text-slate-200 shadow-lg transition-colors hover:border-white/40 hover:text-white"
    >
      {paused ? (
        <Play className="h-3 w-3 text-[#93C5FD]" aria-hidden="true" />
      ) : (
        <Pause className="h-3 w-3 text-slate-400" aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
}
