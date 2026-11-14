import type { HealthStatusLevel } from '../../types';
import { AstronautPreviewCanvas } from '../three/AstronautPreviewCanvas';

interface Small3DAstronautPreviewProps {
  status: HealthStatusLevel;
  astronautName: string;
}

export function Small3DAstronautPreview({
  status,
  astronautName,
}: Small3DAstronautPreviewProps) {
  return (
    <section
      aria-label="Interactive 3D astronaut preview"
      className="h-[310px] sm:h-[340px] xl:h-[370px]"
    >
      <AstronautPreviewCanvas status={status} astronautName={astronautName} />
    </section>
  );
}
