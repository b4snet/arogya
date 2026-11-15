import { useEffect, useRef, useState } from 'react';
import { useArogyaStore } from '../../store/useArogyaStore';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { setBackdropPlaying, useBackdropMotion } from '../../hooks/useBackdropMotion';
import { getBundledDashboardVideos } from '../../utils/localAssets';
import { STARFIELD_BACKDROP_STYLE, STARFIELD_POSTER_DATA_URI } from '../../utils/starfieldPoster';

/**
 * Full-bleed dashboard backdrop: one muted looping video over a generated starfield and
 * Earth-limb gradient. The static layers stay visible when the video errors, when motion is
 * reduced, or when the preference is off, so the console never collapses to a flat page.
 */
export function DashboardVideoBackdrop() {
  const enableVideo = useArogyaStore((s) => s.preferences.enableVideoBackdrop);
  const media = useDriveMedia();
  const reducedMotion = useReducedMotion();
  const { paused } = useBackdropMotion();
  const videos = getBundledDashboardVideos();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);

  const videoUrl = media.videoUrl ?? videos.mp4Url;
  const shouldPlay = Boolean(videoUrl) && enableVideo && !reducedMotion && !paused && !errored;

  useEffect(() => {
    setErrored(false);
    setReady(false);
  }, [videoUrl]);

  useEffect(() => {
    setBackdropPlaying(ready && shouldPlay);
  }, [ready, shouldPlay]);

  useEffect(() => () => setBackdropPlaying(false), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') video.pause();
      else if (shouldPlay) void video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [shouldPlay, videoUrl]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0" style={STARFIELD_BACKDROP_STYLE} />

      {shouldPlay && (
        <video
          ref={videoRef}
          key={videoUrl ?? 'none'}
          src={videoUrl ?? undefined}
          poster={STARFIELD_POSTER_DATA_URI}
          preload="metadata"
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setReady(true)}
          onError={() => setErrored(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            ready ? 'opacity-70' : 'opacity-0'
          }`}
        />
      )}

      {/* Dark gradient veil keeps glass cards and white numerals legible over the footage. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 52% 44%, rgba(3,8,16,0.18) 0%, rgba(3,8,16,0.58) 58%, rgba(2,6,14,0.9) 100%), linear-gradient(180deg, rgba(2,6,14,0.86) 0%, rgba(3,9,18,0.3) 30%, rgba(3,9,18,0.55) 72%, rgba(2,6,14,0.94) 100%)',
        }}
      />
    </div>
  );
}
