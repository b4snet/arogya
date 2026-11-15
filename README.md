# Arogya — Astronaut Health Monitoring System

**NASA Space Apps Challenge 2026** — *Create Health Monitoring Software for Astronauts on Space Missions*

## Overview

Arogya is an offline-first astronaut health-monitoring and early-warning decision-support companion. It helps crew members notice physiological and behavioral drift during long-duration missions, understand spaceflight-hazard context, take preventive countermeasures, and prepare structured SBAR briefings for a crew medical officer or ground flight surgeon.

> **Safety Boundary:** Arogya is strictly decision support, never diagnosis. It does not diagnose medical conditions, prescribe medication, or replace professional medical guidance.

## Key Capabilities

1. **Live Mission Monitor (`/`)**: The default view is a mission-style observation layout: the astronaut in the foreground with the unmodified Programme ERIZON mission model behind it over a CSS space backdrop, beside a simulated-live physiological monitor (moving ECG/pleth waveforms, pulsing numerics, intermittent cuff blood pressure, a rolling 120-second trend, and scenario chips for Nominal, Exercise, Sleep, High workload, and Synthetic anomaly). A prominent `SIMULATED LIVE` badge and pause/resume controls keep the boundary explicit. A recorded-review display mode switches the same page to stored check-ins and vitals only; escalated observations surface as a banner linking to Reports.
2. **Guided Check-In (`/check-in`)**: Fast offline logging of sleep, mood, stress, cognitive focus, fatigue, hydration, countermeasure exercise, pain score, symptoms, and crew notes.
3. **Vitals Monitor (`/vitals`)**: Recorded vital-sign snapshot cards in standard biological units (°C, mmol/L, kg, mSv/d, bpm, mmHg, %), expandable personal baseline and reference detail, cardiovascular, respiratory, radiation, and cabin CO₂ trend charts with personal baseline thresholds, and a separately labeled NASA OSD-575 archived serum CMP research view. No anatomical 3D organ model is rendered on this page; values are clearly labeled observations, never diagnosis or localization.
4. **Research Context (`/research`, secondary)**: A reference view of the bundled OSD-575 cohort coverage, searchable analyte explorer, source-subject pseudonyms, provenance, and a separate NASA reference catalog, plus a live metadata catalog of related open datasets from data.nasa.gov. OSD-575 is a SpaceX Inspiration4 pre-flight/post-flight serum metabolic-panel and cytokine study used for context and reference tables; Arogya is not trained on it. The live catalog is metadata only and is served through the app's backend proxy.
5. **Structured Briefings (`/reports`)**: One-click SBAR Flight Surgeon brief generator with offline Markdown, JSON, and Print export.
6. **Mission Command Center (`/mission`)**: Programme ERIZON as the primary spacecraft with an explicit model loading status, mission phase, Mars distance travel and communication light-delay context, crew status, event feed, health panels, solar particle drill, and synced Google Drive files viewer.
7. **Settings & Profile (`/settings`)**: Personal baseline calibration, display/reduced-motion preferences, and offline cache management.
8. **About, Sources & Licenses (`/about`)**: Safety policy, NASA HRP references, asset inventory, and open-source licenses.

### Simulation boundaries

Every stream produced by the simulation store is explicitly labeled as simulated demonstration data. It is generated deterministically in the browser, never persisted, and never written into recorded observations, assessments, medical reports, Drive exports, or the bundled NASA OSD-575 research data. The scenario engine adds a bounded circadian cycle, smoothed scenario transitions, and intermittent cuff samples; none of these values represents live astronaut monitoring, real sensor telemetry, model training, or clinical validation.

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

Use the repository root as the Vercel project root. The root `vercel.json` configures the Vite framework, `npm ci` as the install command, `npm run build:release` build command, `dist-release` output directory, and a catch-all rewrite to `/index.html` for client-side routes and direct route refreshes. `npm ci` is explicit because the repository also contains a stale tracked `bun.lock`; npm installs from the current `package-lock.json`. The release build disables Vite's automatic `public/` copy and uses a non-code asset allowlist containing only the unmodified Programme ERIZON GLB, with its exact byte size and SHA-256 checked; all other supplied media remains local-only. `scripts/prepare-release.mjs` verifies the procedural/CSS fallbacks, bundled NASA artifact marker, absence of excluded model/video URLs, static chunk-import cycles (the failure mode behind the earlier blank deployment), the exact ERIZON asset hash/size, and the per-file release size guard (25 MiB for other files; the ERIZON asset is checked against the 100 MB Vercel Hobby static-file limit). Build locally with `npm run build:release`; deploy the generated `dist-release/` output. The ordinary `npm run build` remains the local development build and retains local media behavior. Vercel dashboard settings such as the production branch and automatic deployment behavior are not configured by `vercel.json` and must be verified separately.

The public release uses the authored procedural astronaut, organ illustrations, CSS starfield, and the unmodified Programme ERIZON mission model with a procedural fallback. Other supplied GLBs, the dashboard poster, and the MP4 remain local-development-only because their redistribution permissions have not been independently established; their embedded metadata and verification status are itemized in About. The public build does not request or include those other files.

This is a static Vite frontend plus two read-only serverless routes for optional NASA data. Configure optional Google Drive export in the Vercel project settings with `VITE_GOOGLE_OAUTH_CLIENT_ID`; optionally set `VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID`. Add the NASA key as `NASA_API_KEY` (never `VITE_…`) in Vercel Project Settings so it stays server-side. Without the OAuth client ID, the app displays “Google Drive setup required.” `.env.example` is a local template and does not configure Vercel. Drive connection and each report upload require the user's action; access tokens are held for the active session and are not persisted to local storage.

App state is stored in browser IndexedDB, and unfinished check-in drafts use localStorage. Existing records from a laptop's origin do not appear automatically at the deployed origin. New visitors receive the bundled demonstration and research experience; personal check-ins remain in that browser unless the user explicitly exports or uploads them.

## Local Content and Assets

The health-reference panels load their Markdown directly from `health-content/`; keep those source documents in place. Local development can use the model and background-video copies in `public/models/` and `public/videos/`; the Vercel release copies only the allowlisted Programme ERIZON model and otherwise selects the procedural/CSS fallbacks, so it does not copy the other media files. Originals remain untouched in their source locations.

The Zustand mission store persists through IndexedDB. Browser storage errors are reported in the console; the store uses in-memory persistence only in non-browser test/server environments. Browser storage is origin-specific and is not synchronized to a new production origin.

### NASA backend routes

The browser never holds a NASA API key. Two read-only routes are implemented once in `server/nasa.ts` and exposed both as Vercel Functions (`api/nasa/earth.ts`, `api/nasa/datasets.ts`) and as Vite dev/preview middleware from `vite/nasaApiPlugin.ts`:

- `GET /api/nasa/earth` returns the latest natural-colour NASA EPIC frame (image URL, date, NASA/NOAA attribution), cached in memory for three hours. The dashboard astronaut keeps its CSS starfield fallback when unavailable.
- `GET /api/nasa/datasets?topic=radiation|cognitive|microgravity|cardiovascular` returns metadata for nine matching datasets from the data.nasa.gov CKAN catalog for a fixed allowlist of searches, cached in memory for six hours. The Research Context page renders titles, descriptions, formats, organization, and source links.

`NASA_API_KEY` is read only from the server environment (`.env.local` for local `vite dev`/`vite preview`; Vercel Project Settings in production) and falls back to NASA's rate-limited `DEMO_KEY`. Route responses are metadata only: Arogya does not download dataset files, bundle them, train on them, or treat them as clinical validation.

### NASA OSD-575 Research Data Import

The Vitals research view and the secondary Research Context page use a local processed artifact generated from the NASA OSDR OSD-575 transformed CMP CSV. OSD-575 is a SpaceX Inspiration4 pre-flight/post-flight serum metabolic-panel and cytokine study; the artifact is used for context and reference tables only, and no model is trained on it. `src/data/researchLibrary.ts` provides the typed dataset summary, source-subject coverage, analyte coverage/search, and reference catalog selectors. The bundled subset itself needs no network access; the separate open-data catalog section fetches only metadata through the backend routes above. The source CSV, OSDR metadata and file manifest are preserved under `data/nasa/osd-575/source/`, with checksum and transformation details in `data/nasa/osd-575/provenance.json`. Rebuild the artifact with `npx tsx scripts/import-nasa-osd575.ts` after obtaining/verifying the source file. Source values, physical units, missing values, and relative timepoint labels are retained; the data is not clinical advice and is not connected to Arogya's demo subjects or simulated stream. The bundled NASA reference catalog informs hazard framing but is not part of the dataset and does not validate the application. The official OSDR study page lists CC0-1.0; this was verified against the official OSD-575 listing.

### Third-Party Mission Model

The public release includes the unmodified `Programme ERIZON` model by `nejenabinupa`, sourced from [Sketchfab](https://sketchfab.com/3d-models/programme-erizon-1dfbae39ee674334848da02301b77d68) and licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). The source-page license and creator were verified on 2026-11-15. The original 32,025,228-byte GLB is served byte-for-byte unchanged (SHA-256 `18eb843221274f7ed97fe89ffc25f1ed562fff7dcd720531ad28db9316578725`); it has not been re-exported, decimated, retopologized, or otherwise modified. This separately licensed asset is not covered by Arogya's MIT code license. The CC license permits non-commercial sharing of the unmodified model with attribution; commercial use and distribution of derivatives require separate permission from the creator. Attribution with the creator, title, source URL, license, and license URL appears on the Mission and About pages. No copyright notice was supplied in the embedded metadata.

## Safety Scope

Arogya is a demonstration decision-support tool. The displayed thresholds are not validated for operational use, and any urgent or worsening symptoms must follow mission medical escalation procedures.
