import { useSyncExternalStore } from 'react';

/**
 * Shared motion state for the Dashboard backdrop video.
 *
 * The video element lives once at page level, while the accessible pause/resume control
 * sits in the hero. This tiny store is the single source of truth for both, so the control
 * reports what the video is actually doing instead of guessing.
 */

interface BackdropMotionState {
  paused: boolean;
  playing: boolean;
}

let state: BackdropMotionState = { paused: false, playing: false };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): BackdropMotionState {
  return state;
}

function update(patch: Partial<BackdropMotionState>): void {
  const next = { ...state, ...patch };
  if (next.paused === state.paused && next.playing === state.playing) return;
  state = next;
  listeners.forEach((listener) => listener());
}

export function setBackdropPaused(paused: boolean): void {
  update({ paused });
}

export function toggleBackdropPaused(): void {
  update({ paused: !state.paused });
}

export function setBackdropPlaying(playing: boolean): void {
  update({ playing });
}

export function useBackdropMotion(): BackdropMotionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
