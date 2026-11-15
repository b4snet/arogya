import { useState } from 'react';
import type { NasaEarthImage } from '../../engine/nasaEarth';

interface NasaEarthBackdropProps {
  image: NasaEarthImage | null;
  animate: boolean;
}

export function NasaEarthBackdrop({ image, animate }: NasaEarthBackdropProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  if (!image) return null;
  const loaded = loadedUrl === image.imageUrl;

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 ${animate ? 'earth-drift' : ''}`}
        aria-hidden="true"
      >
        <img
          src={image.imageUrl}
          alt=""
          decoding="async"
          onLoad={() => setLoadedUrl(image.imageUrl)}
          className={`absolute left-1/2 top-[62%] h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-[1400ms] ${
            loaded ? 'opacity-80' : 'opacity-0'
          }`}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 44%, rgba(2,6,23,.58) 0%, rgba(2,6,23,.22) 34%, transparent 60%), radial-gradient(ellipse 60% 48% at 50% 36%, rgba(56,189,248,.12), transparent 70%), linear-gradient(180deg, rgba(3,7,18,.72) 0%, rgba(3,7,18,.08) 42%, rgba(3,7,18,.88) 100%)',
        }}
        aria-hidden="true"
      />
      {loaded && (
        <p className="pointer-events-none absolute bottom-10 right-3 rounded border border-white/10 bg-[#050b18]/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 backdrop-blur-sm">
          Earth · {image.credit} · {image.date}
        </p>
      )}
    </>
  );
}
