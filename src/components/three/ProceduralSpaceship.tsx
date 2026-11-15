import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural deep-space transfer vehicle used when no spaceship GLB is present.
 *
 * Built only from Three.js primitives: no downloaded textures, no external assets.
 * It is a placeholder for the focal model and stays clearly labelled as such.
 */
export function ProceduralSpaceship({ accent = '#7dd3fc' }: { accent?: string }) {
  const radiatorPositions = useMemo(() => [-0.62, 0.62] as const, []);

  return (
    <group>
      {/* Main hull */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 2.6, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.42} metalness={0.55} />
      </mesh>

      {/* Forward nose section */}
      <mesh position={[0, 0, -1.68]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.42, 0.76, 24]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.38} metalness={0.6} />
      </mesh>

      {/* Flight-deck window band */}
      <mesh position={[0, 0.22, -1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 20, 1, true, -0.9, 1.8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.85}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Habitat ring */}
      <mesh>
        <torusGeometry args={[0.86, 0.11, 12, 40]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.86, 0.035, 8, 40]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} roughness={0.25} />
      </mesh>

      {/* Solar arrays */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.45, 0, 0.35]}>
          <mesh>
            <boxGeometry args={[1.7, 0.04, 0.9]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.35} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[1.62, 0.01, 0.04]} />
            <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0.03, 0.3]}>
            <boxGeometry args={[1.62, 0.01, 0.04]} />
            <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0.03, -0.3]}>
            <boxGeometry args={[1.62, 0.01, 0.04]} />
            <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Radiator panels */}
      {radiatorPositions.map((x) => (
        <mesh key={x} position={[x, -0.42, 0.9]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.06, 0.5, 1.2]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}

      {/* Service module + engine cluster */}
      <mesh position={[0, 0, 1.36]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.46, 0.34, 0.34, 20]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.6} />
      </mesh>
      {[
        [0, 0],
        [0.24, 0.2],
        [-0.24, 0.2],
        [0.24, -0.2],
        [-0.24, -0.2],
      ].map(([x, y], index) => (
        <mesh key={index} position={[x, y, 1.56]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.13, 0.16, 14]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#38bdf8"
            emissiveIntensity={index === 0 ? 1.4 : 0.7}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      ))}

      {/* Communications dish */}
      <mesh position={[0, 0.72, 0.55]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.26, 0.16, 20, 1, true]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.4}
          metalness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
