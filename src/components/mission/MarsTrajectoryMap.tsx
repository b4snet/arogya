import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { CalculatedMissionTelemetry } from '../../engine/missionOrbitEngine';

interface MarsTrajectoryMapProps {
  telemetry: CalculatedMissionTelemetry;
  vehicleName: string;
}

const VIEW_SIZE = 400;
const CENTER = VIEW_SIZE / 2;
const AU_SCALE = 110; // 1.524 AU -> ~168px radius inside 200px half-width

function toSvg(xAu: number, yAu: number): { x: number; y: number } {
  // Invert Y so counter-clockwise prograde orbital motion goes up/counter-clockwise
  return {
    x: CENTER + xAu * AU_SCALE,
    y: CENTER - yAu * AU_SCALE,
  };
}

export function MarsTrajectoryMap({ telemetry, vehicleName }: MarsTrajectoryMapProps) {
  const reducedMotion = useReducedMotion();

  const earth = toSvg(telemetry.earthPosAu.x, telemetry.earthPosAu.y);
  const mars = toSvg(telemetry.marsPosAu.x, telemetry.marsPosAu.y);
  const craft = toSvg(telemetry.craftPosAu.x, telemetry.craftPosAu.y);

  const arcPath = telemetry.transferArcPointsAu
    .map((pt, idx) => {
      const p = toSvg(pt.x, pt.y);
      return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');

  // Traveled portion of transfer arc
  const traveledCount = Math.max(
    2,
    Math.round((telemetry.progressPercent / 100) * telemetry.transferArcPointsAu.length)
  );
  const traveledPath = telemetry.transferArcPointsAu
    .slice(0, traveledCount)
    .map((pt, idx) => {
      const p = toSvg(pt.x, pt.y);
      return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center rounded-xl border border-[var(--arogya-border)] bg-[#060B14] p-4">
      <div className="mb-2 flex w-full items-center justify-between text-[11px] font-mono-tabular text-[var(--arogya-text-secondary)]">
        <span>Heliocentric Transfer Model (AU Scale)</span>
        <span>r = {telemetry.heliocentricRadiusAu.toFixed(3)} AU</span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="h-auto w-full max-w-[360px]"
        role="img"
        aria-label={`Simulated Mars transfer orbit map showing ${vehicleName} at Day ${telemetry.missionDay} of ${telemetry.totalDurationDays}, ${(telemetry.currentDistanceToMarsKm / 1_000_000).toFixed(1)} million km from Mars.`}
      >
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle reference crosshair */}
        <line
          x1={20}
          y1={CENTER}
          x2={VIEW_SIZE - 20}
          y2={CENTER}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
        <line
          x1={CENTER}
          y1={20}
          x2={CENTER}
          y2={VIEW_SIZE - 20}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />

        {/* Earth Orbit (1.00 AU) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={1.0 * AU_SCALE}
          fill="none"
          stroke="rgba(56,189,248,0.28)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />

        {/* Mars Orbit (1.524 AU) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={1.524 * AU_SCALE}
          fill="none"
          stroke="rgba(249,115,22,0.3)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />

        {/* Full Planned Transfer Trajectory */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Completed Transfer Arc */}
        <path
          d={traveledPath}
          fill="none"
          stroke="#22D3EE"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Earth-to-Spacecraft RF Communication Link */}
        <line
          x1={earth.x}
          y1={earth.y}
          x2={craft.x}
          y2={craft.y}
          stroke="#22D3EE"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        >
          {!reducedMotion && (
            <animate
              attributeName="stroke-dashoffset"
              from="16"
              to="0"
              dur="1.8s"
              repeatCount="indefinite"
            />
          )}
        </line>

        {/* Sun */}
        <circle cx={CENTER} cy={CENTER} r={22} fill="url(#sunGlow)" />
        <circle cx={CENTER} cy={CENTER} r={7} fill="#FACC15" />
        <text
          x={CENTER}
          y={CENTER + 18}
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="10"
          fontFamily="IBM Plex Mono, monospace"
        >
          Sun
        </text>

        {/* Earth */}
        <circle cx={earth.x} cy={earth.y} r={5.5} fill="#38BDF8" stroke="#060B14" strokeWidth="1.5" />
        <text
          x={earth.x}
          y={earth.y + 16}
          textAnchor="middle"
          fill="#BAE6FD"
          fontSize="10"
          fontFamily="IBM Plex Mono, monospace"
        >
          Earth
        </text>

        {/* Mars */}
        <circle cx={mars.x} cy={mars.y} r={5} fill="#F97316" stroke="#060B14" strokeWidth="1.5" />
        <text
          x={mars.x}
          y={mars.y - 10}
          textAnchor="middle"
          fill="#FED7AA"
          fontSize="10"
          fontFamily="IBM Plex Mono, monospace"
        >
          Mars
        </text>

        {/* Spacecraft Beacon */}
        {!reducedMotion && (
          <circle
            cx={craft.x}
            cy={craft.y}
            r={9}
            fill="none"
            stroke="#22D3EE"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          >
            <animate attributeName="r" values="6;13;6" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.8s" repeatCount="indefinite" />
          </circle>
        )}
        <circle cx={craft.x} cy={craft.y} r={4.5} fill="#22D3EE" stroke="#060B14" strokeWidth="1.5" />
        <text
          x={craft.x}
          y={craft.y - 11}
          textAnchor="middle"
          fill="#22D3EE"
          fontSize="10"
          fontWeight="600"
          fontFamily="IBM Plex Mono, monospace"
        >
          {vehicleName}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[var(--arogya-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#38BDF8]" aria-hidden="true" />
          Earth (1.00 AU)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F97316]" aria-hidden="true" />
          Mars (1.52 AU)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#22D3EE]" aria-hidden="true" />
          Transit Craft & RF Link
        </span>
      </div>
    </div>
  );
}
