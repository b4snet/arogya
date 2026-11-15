/**
 * Poster frame for the dashboard backdrop video. It is generated in code so the release
 * artifact needs no extra image file, and it doubles as the static fallback when the video
 * cannot play or motion is reduced.
 */
const POSTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#02060f"/>
      <stop offset="58%" stop-color="#071426"/>
      <stop offset="100%" stop-color="#0b1c31"/>
    </linearGradient>
    <radialGradient id="limb" cx="50%" cy="112%" r="70%">
      <stop offset="0%" stop-color="#1e5a86" stop-opacity="0.75"/>
      <stop offset="55%" stop-color="#0e3a5c" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#02060f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sun" cx="82%" cy="12%" r="30%">
      <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect width="1600" height="900" fill="url(#limb)"/>
  <rect width="1600" height="900" fill="url(#sun)"/>
  <g fill="#e2e8f0">
    <circle cx="120" cy="140" r="1.6" opacity=".8"/><circle cx="260" cy="320" r="1.1" opacity=".55"/>
    <circle cx="410" cy="90" r="1.8" opacity=".75"/><circle cx="520" cy="420" r="1.2" opacity=".5"/>
    <circle cx="690" cy="180" r="1.4" opacity=".7"/><circle cx="840" cy="70" r="1.1" opacity=".6"/>
    <circle cx="980" cy="300" r="1.7" opacity=".8"/><circle cx="1120" cy="140" r="1.2" opacity=".55"/>
    <circle cx="1290" cy="250" r="1.5" opacity=".7"/><circle cx="1440" cy="90" r="1.1" opacity=".6"/>
    <circle cx="1520" cy="380" r="1.6" opacity=".75"/><circle cx="180" cy="520" r="1.2" opacity=".5"/>
    <circle cx="320" cy="640" r="1.4" opacity=".6"/><circle cx="470" cy="560" r="1" opacity=".45"/>
    <circle cx="620" cy="700" r="1.5" opacity=".65"/><circle cx="760" cy="520" r="1.1" opacity=".5"/>
    <circle cx="900" cy="640" r="1.3" opacity=".6"/><circle cx="1050" cy="470" r="1" opacity=".45"/>
    <circle cx="1210" cy="600" r="1.6" opacity=".7"/><circle cx="1370" cy="520" r="1.1" opacity=".5"/>
    <circle cx="70" cy="760" r="1.3" opacity=".55"/><circle cx="560" cy="800" r="1" opacity=".4"/>
    <circle cx="820" cy="780" r="1.2" opacity=".5"/><circle cx="1180" cy="800" r="1.4" opacity=".6"/>
    <circle cx="1460" cy="720" r="1.1" opacity=".45"/>
  </g>
</svg>`;

export const STARFIELD_POSTER_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(POSTER_SVG)}`;

export const STARFIELD_BACKDROP_STYLE = {
  backgroundColor: '#02060f',
  backgroundImage: [
    'radial-gradient(1.5px 1.5px at 8% 18%, rgba(255,255,255,.85) 50%, transparent 100%)',
    'radial-gradient(1.2px 1.2px at 21% 62%, rgba(191,219,254,.7) 50%, transparent 100%)',
    'radial-gradient(1.6px 1.6px at 36% 27%, rgba(255,255,255,.7) 50%, transparent 100%)',
    'radial-gradient(1.1px 1.1px at 54% 74%, rgba(255,255,255,.6) 50%, transparent 100%)',
    'radial-gradient(1.4px 1.4px at 68% 38%, rgba(191,219,254,.75) 50%, transparent 100%)',
    'radial-gradient(1.2px 1.2px at 84% 66%, rgba(255,255,255,.65) 50%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 94% 22%, rgba(255,255,255,.75) 50%, transparent 100%)',
    'radial-gradient(ellipse 74% 52% at 50% 114%, rgba(30,90,134,.62), transparent 68%)',
    'radial-gradient(ellipse 38% 26% at 84% 6%, rgba(125,211,252,.16), transparent 70%)',
    'linear-gradient(180deg, #02060f 0%, #071426 58%, #0b1c31 100%)',
  ].join(', '),
} as const;
