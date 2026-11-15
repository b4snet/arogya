import { useEffect, useMemo, useRef, useState } from 'react';
import posterFallbackImg from '../../assets/images/dashboard_poster_1794643417554.jpg';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { setBackdropPlaying, useBackdropMotion } from '../../hooks/useBackdropMotion';
import { useArogyaStore } from '../../store/useArogyaStore';
import { getBundledDashboardVideos } from '../../utils/localAssets';

const MAX_RECOMMENDED_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB safety cap

/**
 * Page-level space backdrop for the whole Dashboard content area.
 *
 * One video element only: it is mounted here and veiled towards white so the white-first
 * interface, navy text and opaque cards stay readable over it. The accessible pause/resume
 * control lives in the hero (`BackdropMotionControl`) and drives this element through
 * `useBackdropMotion`, so there is one motion state and one video.
 */
export function VideoBackground() {
  const media = useDriveMedia();
  const releaseBuild = import.meta.env.MODE === 'release';
  const videoUrl = releaseBuild ? null : media.videoUrl;
  const videoAsset = releaseBuild ? null : media.videoAsset;
  const imageAssets = releaseBuild ? [] : media.imageAssets;
  const reducedMotion = useReducedMotion();
  const enableVideo = useArogyaStore((s) => s.preferences.enableVideoBackdrop);
  const { paused } = useBackdropMotion();

  const localVideos = useMemo(() => getBundledDashboardVideos(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVisibleInViewport, setIsVisibleInViewport] = useState(false);
  const [readyToLazyLoad, setReadyToLazyLoad] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);

  const staticPoster = releaseBuild ? null : imageAssets[0]?.objectUrl ?? posterFallbackImg;

  const hasLocalVideo = !releaseBuild && Boolean(localVideos.webmUrl || localVideos.mp4Url);
  const hasAnyVideoSource = Boolean(videoUrl) || hasLocalVideo;

  const isWithinSizeBudget = videoUrl
    ? videoAsset?.sizeBytes == null || videoAsset.sizeBytes <= MAX_RECOMMENDED_VIDEO_BYTES
    : true;

  const shouldRenderVideo =
    hasAnyVideoSource &&
    enableVideo &&
    !reducedMotion &&
    !videoErrored &&
    !paused &&
    isWithinSizeBudget &&
    isVisibleInViewport &&
    readyToLazyLoad;

  const isVideoPlaying = shouldRenderVideo && videoLoaded;

  const sourceKey = `${videoUrl ?? ''}|${localVideos.webmUrl ?? ''}|${localVideos.mp4Url ?? ''}`;

  useEffect(() => {
    setVideoErrored(false);
    setVideoLoaded(false);
  }, [sourceKey]);

  // Publish the real playback state for the separate, labelled hero control.
  useEffect(() => {
    setBackdropPlaying(isVideoPlaying);
  }, [isVideoPlaying]);

  useEffect(() => {
    return () => setBackdropPlaying(false);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisibleInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisibleInViewport(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisibleInViewport) return;
    const timer = window.setTimeout(() => setReadyToLazyLoad(true), 200);
    return () => window.clearTimeout(timer);
  }, [isVisibleInViewport]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.visibilityState === 'hidden') {
        video.pause();
      } else if (shouldRenderVideo) {
        void video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [shouldRenderVideo]);

  return (
    // Viewport-sized layer: the video is decoded at screen size once and the whole content
    // area scrolls over it, instead of stretching one playing video down a very tall page.
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Decorative background layers only — hidden from assistive technology */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#040812]"
        style={releaseBuild ? {
          backgroundImage: [
            'radial-gradient(1px 1px at 9% 18%, rgba(255,255,255,.68) 50%, transparent 100%)',
            'radial-gradient(1px 1px at 23% 72%, rgba(191,219,254,.58) 50%, transparent 100%)',
            'radial-gradient(1px 1px at 38% 34%, rgba(255,255,255,.45) 50%, transparent 100%)',
            'radial-gradient(1px 1px at 62% 15%, rgba(255,255,255,.55) 50%, transparent 100%)',
            'radial-gradient(1px 1px at 79% 63%, rgba(191,219,254,.5) 50%, transparent 100%)',
            'radial-gradient(1px 1px at 92% 39%, rgba(255,255,255,.62) 50%, transparent 100%)',
            'radial-gradient(ellipse at 50% 112%, rgba(40,76,112,.75), transparent 58%)',
            'linear-gradient(180deg, #07111f 0%, #101d30 55%, #182941 100%)',
          ].join(', '),
        } : undefined}
      >
        {/* 1. Base static poster: starfield & orbital horizon image */}
        {staticPoster && <img
          src={staticPoster}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-50"
        />}

        {/* 2. Muted, looping background video layer */}
        {shouldRenderVideo && (
          <video
            ref={videoRef}
            key={sourceKey}
            poster={staticPoster ?? undefined}
            preload="none"
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
            onError={() => setVideoErrored(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              videoLoaded ? 'opacity-35' : 'opacity-0'
            }`}
          >
            {videoUrl && <source src={videoUrl} />}
            {!videoUrl && localVideos.webmUrl && (
              <source src={localVideos.webmUrl} type="video/webm" />
            )}
            {!videoUrl && localVideos.mp4Url && (
              <source src={localVideos.mp4Url} type="video/mp4" />
            )}
          </video>
        )}

        {/* 3. Near-white veil: keeps the whole content area readable as a light interface */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(248, 250, 252, 0.88) 0%, rgba(248, 250, 252, 0.66) 36%, rgba(241, 245, 249, 0.84) 100%)',
          }}
        />
      </div>
    </div>
  );
}
