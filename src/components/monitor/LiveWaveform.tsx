import { useEffect, useMemo, useRef } from 'react';
import {
  clampWaveformRate,
  waveformSample,
  type WaveformKind,
} from '../../engine/vitalWaveforms';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LiveWaveformProps {
  kind: WaveformKind;
  ratePerMinute: number;
  active: boolean;
  accent: string;
  label: string;
  height?: number;
  className?: string;
}

/**
 * Canvas trace for the hospital-style monitor. The geometry is derived from the current
 * rate only; it is never a recorded ECG or plethysmograph and is not persisted.
 */
export function LiveWaveform({
  kind,
  ratePerMinute,
  active,
  accent,
  label,
  height = 64,
  className,
}: LiveWaveformProps) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const rateRef = useRef(ratePerMinute);
  const activeRef = useRef(active);
  const accentRef = useRef(accent);
  const reducedRef = useRef(reducedMotion);

  rateRef.current = ratePerMinute;
  activeRef.current = active;
  accentRef.current = accent;
  reducedRef.current = reducedMotion;

  const staticPhase = useMemo(() => (kind === 'ecg' ? 0.12 : 0.2), [kind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let width = 0;
    let devicePixelRatio = 1;
    let lastTime = 0;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      const pixelHeight = Math.max(1, rect.height);
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(pixelHeight * devicePixelRatio);
    };

    const draw = () => {
      if (!width) return;
      const pixelHeight = canvas.height / devicePixelRatio;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, pixelHeight);

      context.lineWidth = 1;
      context.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      const grid = kind === 'ecg' ? 14 : 18;
      for (let x = 0; x <= width; x += grid) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, pixelHeight);
        context.stroke();
      }
      for (let y = 0; y <= pixelHeight; y += grid) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const color = accentRef.current;
      const rateHz = clampWaveformRate(rateRef.current);
      const secondsVisible = kind === 'ecg' ? 4 : 4.5;
      const phase = phaseRef.current;

      context.beginPath();
      for (let x = 0; x <= width; x += 1) {
        const secondsAgo = ((width - x) / width) * secondsVisible;
        const value = waveformSample(kind, phase - secondsAgo * rateHz);
        const y =
          kind === 'ecg'
            ? pixelHeight * 0.58 - value * pixelHeight * 0.34
            : pixelHeight * 0.82 - value * pixelHeight * 0.62;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineWidth = 1.9;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 7;
      context.stroke();
      context.shadowBlur = 0;

      // A dim leading edge keeps the trace readable against the monitor grid.
      context.fillStyle = color;
      const leadValue = waveformSample(kind, phase);
      const leadY =
        kind === 'ecg'
          ? pixelHeight * 0.58 - leadValue * pixelHeight * 0.34
          : pixelHeight * 0.82 - leadValue * pixelHeight * 0.62;
      context.beginPath();
      context.arc(width - 1, leadY, 2.1, 0, Math.PI * 2);
      context.fill();
    };

    const loop = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const deltaSeconds = Math.min(0.08, (time - lastTime) / 1000);
      lastTime = time;
      if (visible && activeRef.current && !reducedRef.current) {
        phaseRef.current += deltaSeconds * clampWaveformRate(rateRef.current);
      }
      draw();
      frame = window.requestAnimationFrame(loop);
    };

    resize();
    draw();

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            resize();
            draw();
          });
    observer?.observe(canvas);

    const intersection =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              visible = entries.some((entry) => entry.isIntersecting);
              if (visible) draw();
            },
            { threshold: 0.01 }
          );
    intersection?.observe(canvas);

    if (active && !reducedMotion) {
      frame = window.requestAnimationFrame(loop);
    } else {
      phaseRef.current = staticPhase;
      draw();
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      intersection?.disconnect();
    };
  }, [active, kind, reducedMotion, staticPhase]);

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative w-full overflow-hidden rounded-md ${className ?? ''}`}
      style={{ height }}
      data-waveform-kind={kind}
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
    </div>
  );
}
