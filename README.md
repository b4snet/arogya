# Arogya — Astronaut Health Monitoring System

**NASA Space Apps Challenge 2026** — *Create Health Monitoring Software for Astronauts on Space Missions*

## Overview

Arogya is an offline-first astronaut health-monitoring and early-warning decision-support companion. It helps crew members notice physiological and behavioral drift during long-duration missions, understand spaceflight-hazard context, take preventive countermeasures, and prepare structured SBAR briefings for a crew medical officer or ground flight surgeon.

> **Safety Boundary:** Arogya is strictly decision support, never diagnosis. It does not diagnose medical conditions, prescribe medication, or replace professional medical guidance.

## Key Capabilities

1. **Mission-Control Dashboard (`/`)**: Crew selector, overall health-readiness score, active alerts, next best action, interactive 3D astronaut preview, today's check-in status, compact trend tiles, and Mars transit/comms-delay widget. The public release uses a procedural astronaut and static CSS space backdrop; local development can still use the supplied GLBs and MP4.
2. **Guided Check-In (`/check-in`)**: Fast offline logging of sleep, mood, stress, cognitive focus, fatigue, hydration, countermeasure exercise, pain score, symptoms, and crew notes.
3. **Biometric Vitals (`/vitals`)**: Cardiovascular, respiratory, radiation, and cabin CO₂ trend charts with personal baseline thresholds, plus a separately labeled NASA OSD-575 archived serum CMP research view.
4. **Structured Briefings (`/reports`)**: One-click SBAR Flight Surgeon brief generator with offline Markdown, JSON, and Print export.
5. **Mission & Environment (`/mission`)**: Mars distance, remaining travel time, communication light-delay context, solar particle drill, and synced Google Drive files viewer.
6. **Settings & Profile (`/settings`)**: Personal baseline calibration, display/reduced-motion preferences, and offline cache management.
7. **About, Sources & Licenses (`/about`)**: Safety policy, NASA HRP references, asset inventory, and open-source licenses.

## Google Drive Asset Integration

Arogya can connect with read-only Google Drive permission (`drive.readonly`) via Firebase Auth to download and cache user-approved mission media and supplementary files into **IndexedDB** for offline use. These optional user-supplied files are not bundled. Project procedural Three.js geometry remains available as the app-authored fallback.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
npm run build:release
npm run preview -- --outDir dist-release --host 127.0.0.1
npx tsx scripts/import-nasa-osd575.ts
```

### Vercel release

Use the repository root as the Vercel project root. The root `vercel.json` configures the Vite framework, `npm ci` as the install command, `npm run build:release` build command, `dist-release` output directory, and a catch-all rewrite to `/index.html` for client-side routes and direct route refreshes. `npm ci` is explicit because the repository also contains a stale tracked `bun.lock`; npm installs from the current `package-lock.json`. The release build disables Vite's automatic `public/` copy and uses an empty non-code asset allowlist because supplied media remains local-only. `scripts/prepare-release.mjs` verifies the procedural/CSS fallbacks, bundled NASA artifact marker, absence of excluded model/video URLs and non-code assets, static chunk-import cycles (the failure mode behind the earlier blank deployment), and the per-file release size guard. Build locally with `npm run build:release`; deploy the generated `dist-release/` output. The ordinary `npm run build` remains the local development build and retains local media behavior. Vercel dashboard settings such as the production branch and automatic deployment behavior are not configured by `vercel.json` and must be verified separately.

The public release uses the authored procedural astronaut, organ illustrations, spacecraft, and CSS starfield. Supplied GLBs, dashboard poster and MP4 remain local-development-only because their redistribution permissions have not been independently established; their embedded metadata and verification status are itemized in About. The initial public build does not request or include those files.

This is a static Vite frontend; no runtime backend or NASA API call is required for the bundled research view. Configure optional Google Drive export in the Vercel project settings with `VITE_GOOGLE_OAUTH_CLIENT_ID`; optionally set `VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID`. Without the OAuth client ID, the app displays “Google Drive setup required.” `.env.example` is a local template and does not configure Vercel. Drive connection and each report upload require the user's action; access tokens are held for the active session and are not persisted to local storage.

App state is stored in browser IndexedDB, and unfinished check-in drafts use localStorage. Existing records from a laptop's origin do not appear automatically at the deployed origin. New visitors receive the bundled demonstration and research experience; personal check-ins remain in that browser unless the user explicitly exports or uploads them.

## Local Content and Assets

The health-reference panels load their Markdown directly from `health-content/`; keep those source documents in place. Local development can use the model and background-video copies in `public/models/` and `public/videos/`; the Vercel release intentionally selects the procedural/CSS fallbacks and does not copy these media files. Originals remain untouched in their source locations.

The Zustand mission store persists through IndexedDB. Browser storage errors are reported in the console; the store uses in-memory persistence only in non-browser test/server environments. Browser storage is origin-specific and is not synchronized to a new production origin.

### NASA OSD-575 Research Data Import

The Vitals research section uses a local processed artifact generated from the NASA OSDR OSD-575 transformed CMP CSV. Runtime remains a static Vite frontend; no NASA API request or backend is needed to view the bundled subset. The source CSV, OSDR metadata and file manifest are preserved under `data/nasa/osd-575/source/`, with checksum and transformation details in `data/nasa/osd-575/provenance.json`. Rebuild the artifact with `npx tsx scripts/import-nasa-osd575.ts` after obtaining/verifying the source file. Source values, physical units, missing values, and relative timepoint labels are retained; the data is not clinical advice and is not connected to Arogya's demo subjects or simulated stream. The official OSDR study page lists CC0-1.0; this was verified against the official OSD-575 listing.

### Third-Party Mission Model

The local Mission development build can load the unmodified `Programme ERIZON` model by `nejenabinupa`, sourced from [Sketchfab](https://sketchfab.com/3d-models/programme-erizon-1dfbae39ee674334848da02301b77d68) and identified in its embedded metadata as [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). This separately licensed asset is not covered by Arogya's MIT code license. It remains local and excluded from the public build. The source page could not be independently verified (HTTP 403); the NonCommercial and NoDerivatives restrictions remain a public-release review item. No copyright notice was supplied in the model metadata.

## Safety Scope

Arogya is a demonstration decision-support tool. The displayed thresholds are not validated for operational use, and any urgent or worsening symptoms must follow mission medical escalation procedures.
