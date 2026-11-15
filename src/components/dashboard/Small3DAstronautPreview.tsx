import type { HealthStatusLevel } from '../../types';
import { AstronautPreviewCanvas } from '../three/AstronautPreviewCanvas';

interface Small3DAstronautPreviewProps {
  status: HealthStatusLevel;
  astronautName: string;
}

/**
 * Single responsive sizing contract for the dashboard hero: the section owns the
 * height and the canvas fills it, so the parent never needs a competing min-height.
 */
export function Small3DAstronautPreview({
  status,
  astronautName,
}: Small3DAstronautPreviewProps) {
  return (
    <section
      aria-label="Interactive 3D astronaut preview"
      className="h-[420px] w-full sm:h-[500px] xl:h-[560px]"
    >
      <AstronautPreviewCanvas status={status} astronautName={astronautName} />
    </section>
  );
}
