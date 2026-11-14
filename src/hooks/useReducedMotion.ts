import { useEffect, useState } from 'react';
import { useArogyaStore } from '../store/useArogyaStore';

export function useReducedMotion(): boolean {
  const override = useArogyaStore((s) => s.preferences.reducedMotionOverride);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return override || systemReduced;
}
