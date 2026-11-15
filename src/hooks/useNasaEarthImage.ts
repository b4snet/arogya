import { useEffect, useState } from 'react';
import type { NasaEarthImage } from '../../shared/nasa';
import { fetchEarthImage } from '../services/nasaApi';

export function useNasaEarthImage(): NasaEarthImage | null {
  const [image, setImage] = useState<NasaEarthImage | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);

    fetchEarthImage(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setImage(result);
      })
      .catch(() => {
        // The CSS starfield remains the offline fallback.
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return image;
}
