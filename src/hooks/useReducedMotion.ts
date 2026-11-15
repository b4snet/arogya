import { useEffect, useState } from 'react';
import { useArogyaStore } from '../store/useArogyaStore';

export function useReducedMotion(): boolean {
  const override = useArogyaStore((s) => s.preferences.reducedMotionOverride);
  // Read synchronously so motion-reducing users never mount animated media for a first frame.
  const [systemReduced, setSystemReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return override || systemReduced;
}
