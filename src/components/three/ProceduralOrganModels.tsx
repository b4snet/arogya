import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { HealthStatusLevel, OrganTarget } from '../../types';

function statusEmissiveColor(status: HealthStatusLevel): string {
  switch (status) {
    case 'red':
      return '#ef4444';
    case 'orange':
      return '#f97316';
    case 'yellow':
      return '#eab308';
    default:
      return '#22d3ee';
  }
}

interface OrganModelProps {
  status: HealthStatusLevel;
  selected?: boolean;
  hovered?: boolean;
  reducedMotion?: boolean;
  onSelect?: (organ: OrganTarget) => void;
  onHoverChange?: (hovered: boolean) => void;
}

export function ProceduralBrainModel({
  status,
  selected = false,
  hovered = false,
  reducedMotion = false,
  onSelect,
  onHoverChange,
}: OrganModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const accent = statusEmissiveColor(status);
  const emissiveIntensity = selected ? 0.36 : hovered ? 0.24 : status === 'green' ? 0.08 : 0.16;

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 1.4) * 0.008;
  });

  const sulcusCurveA = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.04, 0.04, 0.06),
        new THREE.Vector3(-0.07, 0.06, 0.0),
        new THREE.Vector3(-0.05, 0.04, -0.06),
      ]),
    []
  );
  const sulcusCurveB = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.04, 0.04, 0.06),
        new THREE.Vector3(0.07, 0.06, 0.0),
        new THREE.Vector3(0.05, 0.04, -0.06),
      ]),
    []
  );

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.('brain');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHoverChange?.(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        onHoverChange?.(false);
      }}
    >
      {/* Left Hemisphere */}
      <mesh position={[-0.042, 0.01, 0]} scale={[0.9, 0.82, 1.15]} castShadow>
        <sphereGeometry args={[0.068, 24, 24]} />
        <meshPhysicalMaterial
          color="#cbd5e1"
          roughness={0.42}
          metalness={0.05}
          clearcoat={0.35}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Right Hemisphere */}
      <mesh position={[0.042, 0.01, 0]} scale={[0.9, 0.82, 1.15]} castShadow>
        <sphereGeometry args={[0.068, 24, 24]} />
        <meshPhysicalMaterial
          color="#cbd5e1"
          roughness={0.42}
          metalness={0.05}
          clearcoat={0.35}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Cerebellum */}
      <mesh position={[0, -0.045, -0.045]} scale={[1.2, 0.68, 0.85]} castShadow>
        <sphereGeometry args={[0.045, 20, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.55} metalness={0.1} />
      </mesh>
      {/* Brainstem */}
      <mesh position={[0, -0.075, -0.02]} rotation={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.013, 0.065, 16]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Neural Pathways */}
      <mesh>
        <tubeGeometry args={[sulcusCurveA, 20, 0.008, 8, false]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={selected ? 1.2 : 0.6}
          roughness={0.25}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[sulcusCurveB, 20, 0.008, 8, false]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={selected ? 1.2 : 0.6}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

export function ProceduralHeartModel({
  status,
  selected = false,
  hovered = false,
  reducedMotion = false,
  onSelect,
  onHoverChange,
}: OrganModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const accent = statusEmissiveColor(status);
  const emissiveIntensity = selected ? 0.36 : hovered ? 0.24 : status === 'green' ? 0.08 : 0.16;

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 3.8)), 4) * 0.045;
    groupRef.current.scale.setScalar(beat);
  });

  const aortaCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.01, 0.04, 0),
        new THREE.Vector3(-0.01, 0.11, 0.01),
        new THREE.Vector3(0.03, 0.13, -0.01),
        new THREE.Vector3(0.05, 0.05, -0.03),
      ]),
    []
  );

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.('heart');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHoverChange?.(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        onHoverChange?.(false);
      }}
    >
      {/* Left Ventricle */}
      <mesh position={[0.018, -0.02, 0.01]} rotation={[0.1, 0, -0.28]} scale={[0.85, 1.25, 0.88]} castShadow>
        <sphereGeometry args={[0.062, 24, 24]} />
        <meshPhysicalMaterial
          color="#b91c1c"
          roughness={0.34}
          metalness={0.08}
          clearcoat={0.45}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Right Ventricle / Atrium */}
      <mesh position={[-0.028, 0.005, 0.006]} scale={[0.82, 1.05, 0.8]} castShadow>
        <sphereGeometry args={[0.054, 20, 20]} />
        <meshPhysicalMaterial
          color="#991b1b"
          roughness={0.38}
          metalness={0.08}
          clearcoat={0.35}
          emissive={accent}
          emissiveIntensity={emissiveIntensity * 0.8}
        />
      </mesh>
      {/* Aortic Arch */}
      <mesh castShadow>
        <tubeGeometry args={[aortaCurve, 24, 0.016, 12, false]} />
        <meshStandardMaterial color="#dc2626" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* Superior Vena Cava */}
      <mesh position={[-0.042, 0.075, -0.012]}>
        <cylinderGeometry args={[0.014, 0.015, 0.09, 14]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} metalness={0.15} />
      </mesh>
      {/* Coronary Telemetry Ring */}
      <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0.25, 0]}>
        <torusGeometry args={[0.078, 0.0035, 10, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={selected ? 1.4 : 0.7} />
      </mesh>
    </group>
  );
}

export function ProceduralLungsModel({
  status,
  selected = false,
  hovered = false,
  reducedMotion = false,
  onSelect,
  onHoverChange,
}: OrganModelProps) {
  const leftRef = useRef<THREE.Mesh>(null);
  const rightRef = useRef<THREE.Mesh>(null);
  const accent = statusEmissiveColor(status);
  const emissiveIntensity = selected ? 0.34 : hovered ? 0.22 : status === 'green' ? 0.08 : 0.15;

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();
    const breath = 1 + Math.sin(t * 1.5) * 0.035;
    if (leftRef.current) leftRef.current.scale.set(0.82 * breath, 1.35, 0.72 * breath);
    if (rightRef.current) rightRef.current.scale.set(0.86 * breath, 1.4, 0.74 * breath);
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.('lungs');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHoverChange?.(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        onHoverChange?.(false);
      }}
    >
      {/* Trachea */}
      <mesh position={[0, 0.125, -0.01]} castShadow>
        <cylinderGeometry args={[0.016, 0.017, 0.12, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Left Bronchus */}
      <mesh position={[-0.036, 0.065, -0.008]} rotation={[0, 0, 0.75]}>
        <cylinderGeometry args={[0.011, 0.011, 0.075, 12]} />
        <meshStandardMaterial color="#64748b" roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Right Bronchus */}
      <mesh position={[0.036, 0.065, -0.008]} rotation={[0, 0, -0.75]}>
        <cylinderGeometry args={[0.011, 0.011, 0.075, 12]} />
        <meshStandardMaterial color="#64748b" roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Right Lung Lobe */}
      <mesh ref={rightRef} position={[0.095, -0.01, -0.005]} scale={[0.86, 1.4, 0.74]} castShadow>
        <capsuleGeometry args={[0.075, 0.11, 12, 20]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          roughness={0.36}
          metalness={0.06}
          clearcoat={0.25}
          transparent
          opacity={0.78}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Left Lung Lobe */}
      <mesh ref={leftRef} position={[-0.095, -0.01, -0.005]} scale={[0.82, 1.35, 0.72]} castShadow>
        <capsuleGeometry args={[0.075, 0.105, 12, 20]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          roughness={0.36}
          metalness={0.06}
          clearcoat={0.25}
          transparent
          opacity={0.78}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}

interface AstronautSuitProps {
  visible?: boolean;
  transparentShell?: boolean;
  status?: HealthStatusLevel;
  onSelectBody?: () => void;
}

export function ProceduralAstronautSuit({
  visible = true,
  transparentShell = false,
  status = 'green',
  onSelectBody,
}: AstronautSuitProps) {
  if (!visible) return null;

  const shellOpacity = transparentShell ? 0.24 : 1;
  const shellTransparent = transparentShell;
  const statusAccent = status === 'green' ? '#22c55e' : statusEmissiveColor(status);

  return (
    <group
      onClick={(e) => {
        if (!transparentShell) {
          e.stopPropagation();
          onSelectBody?.();
        }
      }}
    >
      {/* Helmet Outer Dome */}
      <mesh position={[0, 1.56, 0]} castShadow={!transparentShell}>
        <sphereGeometry args={[0.205, 28, 28]} />
        <meshStandardMaterial
          color="#f1f5f9"
          roughness={0.25}
          metalness={0.18}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Gold/Navy Visor Shield */}
      <mesh position={[0, 1.56, 0.065]} scale={[0.92, 0.85, 0.88]}>
        <sphereGeometry args={[0.165, 24, 24]} />
        <meshPhysicalMaterial
          color="#0f172a"
          roughness={0.08}
          metalness={0.85}
          clearcoat={1}
          transparent={shellTransparent}
          opacity={transparentShell ? 0.35 : 0.96}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Helmet Collar Ring */}
      <mesh position={[0, 1.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.022, 12, 32]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.75} />
      </mesh>
      {/* Torso Hard Upper Suit */}
      <mesh position={[0, 1.07, 0]} scale={[1.08, 1.15, 0.72]} castShadow={!transparentShell}>
        <capsuleGeometry args={[0.22, 0.34, 14, 24]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.42}
          metalness={0.12}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Chest DCM Control Pack */}
      <mesh position={[0, 1.12, 0.165]} castShadow={!transparentShell}>
        <boxGeometry args={[0.22, 0.18, 0.07]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.35}
          metalness={0.65}
          transparent={shellTransparent}
          opacity={transparentShell ? 0.2 : 1}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Status-Reactive Suit Telemetry Trim Stripe */}
      <mesh position={[0, 1.19, 0.202]}>
        <boxGeometry args={[0.16, 0.022, 0.01]} />
        <meshStandardMaterial
          color={statusAccent}
          emissive={statusAccent}
          emissiveIntensity={transparentShell ? 0.35 : 0.75}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      {/* PLSS Backpack */}
      <mesh position={[0, 1.14, -0.22]} castShadow={!transparentShell}>
        <boxGeometry args={[0.34, 0.46, 0.16]} />
        <meshStandardMaterial
          color="#cbd5e1"
          roughness={0.48}
          metalness={0.25}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Left & Right Arms */}
      <mesh position={[-0.31, 1.06, 0.02]} rotation={[0, 0, 0.18]} castShadow={!transparentShell}>
        <capsuleGeometry args={[0.072, 0.44, 10, 16]} />
        <meshStandardMaterial
          color="#f1f5f9"
          roughness={0.5}
          metalness={0.08}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      <mesh position={[0.31, 1.06, 0.02]} rotation={[0, 0, -0.18]} castShadow={!transparentShell}>
        <capsuleGeometry args={[0.072, 0.44, 10, 16]} />
        <meshStandardMaterial
          color="#f1f5f9"
          roughness={0.5}
          metalness={0.08}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Pelvis & Lower Torso */}
      <mesh position={[0, 0.72, 0]} scale={[1.05, 0.7, 0.75]} castShadow={!transparentShell}>
        <cylinderGeometry args={[0.19, 0.17, 0.22, 20]} />
        <meshStandardMaterial
          color="#cbd5e1"
          roughness={0.5}
          metalness={0.12}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      {/* Left & Right Legs + Boots */}
      <mesh position={[-0.115, 0.36, 0]} castShadow={!transparentShell}>
        <capsuleGeometry args={[0.086, 0.48, 10, 16]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.55}
          metalness={0.08}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      <mesh position={[0.115, 0.36, 0]} castShadow={!transparentShell}>
        <capsuleGeometry args={[0.086, 0.48, 10, 16]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.55}
          metalness={0.08}
          transparent={shellTransparent}
          opacity={shellOpacity}
          depthWrite={!shellTransparent}
        />
      </mesh>
      <mesh position={[-0.115, 0.055, 0.04]} castShadow={!transparentShell}>
        <boxGeometry args={[0.13, 0.1, 0.23]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.25} />
      </mesh>
      <mesh position={[0.115, 0.055, 0.04]} castShadow={!transparentShell}>
        <boxGeometry args={[0.13, 0.1, 0.23]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.25} />
      </mesh>
    </group>
  );
}

export function TelemetryPedestal({ status = 'green' }: { status?: HealthStatusLevel }) {
  const ringAccent = status === 'green' ? '#22c55e' : statusEmissiveColor(status);
  return (
    <group position={[0, -0.02, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.05, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.32} metalness={0.78} />
      </mesh>
      <mesh position={[0, 0.028, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.64, 0.009, 10, 64]} />
        <meshStandardMaterial
          color={ringAccent}
          emissive={ringAccent}
          emissiveIntensity={0.85}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.026, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.005, 8, 64]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function ProceduralSkeletonLayer({ visible = false }: { visible?: boolean }) {
  if (!visible) return null;

  const ribYs = [1.28, 1.22, 1.16, 1.1, 1.04];

  return (
    <group>
      {/* Cranial Wireframe Ring */}
      <mesh position={[0, 1.56, 0]}>
        <sphereGeometry args={[0.125, 16, 12]} />
        <meshStandardMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>
      {/* Cervical & Thoracic Spine Column */}
      <mesh position={[0, 1.14, -0.1]}>
        <cylinderGeometry args={[0.022, 0.026, 0.68, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.1} transparent opacity={0.68} />
      </mesh>
      {/* Sternum */}
      <mesh position={[0, 1.17, 0.12]}>
        <boxGeometry args={[0.032, 0.24, 0.016]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} transparent opacity={0.62} />
      </mesh>
      {/* Thoracic Ribcage */}
      {ribYs.map((y, idx) => (
        <mesh key={y} position={[0, y, 0.01]} rotation={[Math.PI / 2, 0, 0]} scale={[1.28 - idx * 0.03, 0.92, 1]}>
          <torusGeometry args={[0.135, 0.009, 8, 28]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.45} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* Pelvic Girdle */}
      <mesh position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 0.85, 1]}>
        <torusGeometry args={[0.14, 0.018, 10, 24]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.55} transparent opacity={0.52} />
      </mesh>
    </group>
  );
}

