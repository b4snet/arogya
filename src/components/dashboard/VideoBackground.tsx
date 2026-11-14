import { useEffect, useMemo, useRef, useState } from 'react';
import posterFallbackImg from '../../assets/images/dashboard_poster_1794643417554.jpg';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useArogyaStore } from '../../store/useArogyaStore';
import { getBundledDashboardVideos } from '../../utils/localAssets';

const MAX_RECOMMENDED_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB safety cap for smooth playback

export function VideoBackground() {
  const { videoUrl, videoAsset, imageAssets } = useDriveMedia();
  const reducedMotion = useReducedMotion();
  const enableVideo = useArogyaStore((s) => s.preferences.enableVideoBackdrop);

  const localVideos = useMemo(() => getBundledDashboardVideos(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVisibleInViewport, setIsVisibleInViewport] = useState(false);
  const [readyToLazyLoad, setReadyToLazyLoad] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);

  const staticPoster = imageAssets[0]?.objectUrl ?? posterFallbackImg;

  const hasLocalVideo = Boolean(localVideos.webmUrl || localVideos.mp4Url);
  const hasAnyVideoSource = Boolean(videoUrl) || hasLocalVideo;

  const isWithinSizeBudget =
    videoUrl
      ? videoAsset?.sizeBytes == null || videoAsset.sizeBytes <= MAX_RECOMMENDED_VIDEO_BYTES
      : true;

  const shouldRenderVideo =
    hasAnyVideoSource &&
    enableVideo &&
    !reducedMotion &&
    !videoErrored &&
    isWithinSizeBudget &&
    isVisibleInViewport &&
    readyToLazyLoad;

  const sourceKey = `${videoUrl ?? ''}|${localVideos.webmUrl ?? ''}|${localVideos.mp4Url ?? ''}`;

  // Reset loading/error flags if a new video source becomes available
  useEffect(() => {
    setVideoErrored(false);
    setVideoLoaded(false);
  }, [sourceKey]);

  // Lazy-load video only after dashboard mounts & is visible in viewport
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
    const timer = window.setTimeout(() => setReadyToLazyLoad(true), 250);
    return () => window.clearTimeout(timer);
  }, [isVisibleInViewport]);

  // Pause background video whenever the browser tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.visibilityState === 'hidden') {
        video.pause();
      } else if (shouldRenderVideo) {
        void video.play().catch(() => {
          // Ignore browser autoplay policy rejection on focus return
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [shouldRenderVideo]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#060B14]"
      aria-hidden="true"
    >
      {/* Static fallback orbital horizon image (always rendered for reduced-motion & pre-load) */}
      <img
        src={staticPoster}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover opacity-35"
      />

      {/* Muted, looping, lazy-loaded background video when motion & preferences allow */}
      {shouldRenderVideo && (
        <video
          ref={videoRef}
          key={sourceKey}
          poster={staticPoster}
          preload="none"
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setVideoLoaded(true)}
          onError={() => setVideoErrored(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            videoLoaded ? 'opacity-25' : 'opacity-0'
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

      {/* High-opacity dark contrast scrim (84%-94%) guaranteeing readable telemetry contrast */}
      <div className="absolute inset-0 bg-[#060B14]/75" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,11,20,0.88) 0%, rgba(6,11,20,0.80) 45%, rgba(6,11,20,0.94) 100%)',
        }}
      />
    </div>
  );
}
