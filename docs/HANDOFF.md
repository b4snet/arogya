# Arogya Coding Agent Handoff

Last inspected: 2026-11-15. This handoff records the working tree as observed locally; it is not a deployment report.

## Repository and Git state

- Root: `C:\Users\dipso\OneDrive\Desktop\Arogya`
- Branch: `main`
- Origin: `https://github.com/b4snet/arogya.git` (`origin/main`); branch was reported clean relative to the remote commit, but the working tree contains substantial unstaged local work.
- Nothing was staged, committed, pushed, or deployed during this handoff. Preserve all existing modifications and untracked files.
- No `AGENTS.md` or prior `docs/HANDOFF.md` was present when this file was created.

### Tracked modified files

`.env.example`, `.gitignore`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`; `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`; dashboard: `src/components/dashboard/ActiveAlerts.tsx`, `AstronautSelector.tsx`, `Small3DAstronautPreview.tsx`, `VideoBackground.tsx`; layout: `src/components/layout/AppShell.tsx`, `DriveSyncModal.tsx`, `SidebarNav.tsx`, `TopTelemetryBar.tsx`; report/UI/vitals/Three components: `src/components/reports/HealthReportCard.tsx`, `src/components/three/AstronautPreviewCanvas.tsx`, `ProceduralOrganModels.tsx`, `src/components/ui/AstronautAvatar.tsx`, `Button.tsx`, `Card.tsx`, `ErrorState.tsx`, `FormControls.tsx`, `Skeleton.tsx`, `StatusPill.tsx`, `src/components/vitals/ManualVitalsPanel.tsx`, `VitalsChartsGrid.tsx`, `VitalsReferenceTable.tsx`; `src/content/MarkdownContent.tsx`; `src/data/references.ts`; `src/engine/reportGenerator.ts`, `reportGenerator.test.ts`; pages: `src/pages/AboutPage.tsx`, `CheckInPage.tsx`, `DashboardPage.tsx`, `MissionPage.tsx`, `ReportsPage.tsx`, `SettingsPage.tsx`, `VitalsPage.tsx`; `src/types/report.ts`, `src/utils/localAssets.ts`.

### Untracked files and directories to preserve

- Deployment/release and NASA sources: `vercel.json`, `public/_redirects`, `scripts/prepare-release.mjs`, `scripts/import-nasa-osd575.ts`, `data/` (NASA OSD-575 source files and provenance).
- NASA runtime data/tests: `src/data/nasaOsd575.ts`, `src/data/nasaOsd575.test.ts`, `src/data/nasaOsd575Cmp.json`.
- Dashboard: `src/components/dashboard/BackdropMotionControl.tsx`, `DashboardMetricGrid.tsx`, `DashboardMissionStrip.tsx`, `DashboardProfileTodayCard.tsx`, `DashboardVitalsOverview.tsx`, `SimulatedTelemetryChart.tsx`, `SimulatedTelemetryPanel.tsx`, `src/hooks/useBackdropMotion.ts`, `src/store/useSimulatedTelemetryStore.ts`, `useSimulatedTelemetryStore.test.ts`, `src/utils/simulatedTelemetry.ts`, `simulatedTelemetry.test.ts`.
- Mission and organ motion: `src/components/mission/MissionFlightScene.tsx`, `MissionSceneFallback.tsx`, `MissionSceneFallback.test.tsx`, `src/components/three/ProceduralSpaceship.tsx`, `VehicleGltfModel.tsx`, `src/components/vitals/OrganMotionPanel.tsx`, `src/engine/missionScene.ts`, `missionScene.test.ts`, `organMotion.ts`, `organMotion.test.ts`.
- Reports and Drive: `src/components/reports/ReportBarcode.tsx`, `ReportReferenceMatrix.tsx`, `ReportTrendCharts.tsx`, `ReportVitalSignsTable.tsx`, `src/engine/reportSnapshot.ts`, `reportSnapshot.test.ts`, `src/services/driveExportPayload.ts`, `driveExportState.ts`, `driveExportState.test.ts`, `driveExportStore.ts`, `driveExportStore.test.ts`, `googleDriveExport.ts`, `googleDriveExport.test.ts`, all files under `src/components/drive/`, and `src/test-utils/`.
- More tests/helpers: `src/components/vitals/NasaResearchDataPanel.tsx`, `NasaResearchDataPanel.test.tsx`, `src/utils/observationWindow.ts`, `observationWindow.test.ts`, `src/utils/noPosterImage.ts`, `localAssets.test.ts`.
- Local assets/screenshots: `3d-models/need_some_space.glb`, `3d-models/programme_erizon.glb`, `3d-models/sci-fi_space_station.glb`, `public/models/programme_erizon.glb`, `dashboard-glass.png`, `drive-export-setup.png`, `mission-scene-desktop.png`, `mission-scene-mobile.png`, `organ-motion-panel.png`, `report-page-full.png`, and `screenshots/`.

The generated `dist-release/` is ignored and is not a source/staging file. The media files under `3d-models/`, `public/models/`, `public/videos/`, and `src/assets/images/` include already tracked originals/copies; do not delete or overwrite them as part of routine release work. `public/models/programme_erizon.glb` is now a required release input but remains untracked until it is explicitly staged with the approved commit.

## Package scripts and npm

Use npm and retain `package-lock.json`. Current scripts from `package.json`:

| Script | Command / purpose |
| --- | --- |
| `npm run dev` | `vite --port=3000 --host=0.0.0.0` |
| `npm run build` | `vite build` (local-development behavior) |
| `npm run build:release` | `vite build --mode release && node scripts/prepare-release.mjs` |
| `npm run preview` | `vite preview` |
| `npm test` | `vitest run` |
| `npm run lint` | `tsc --noEmit` (TypeScript check; not ESLint) |
| `npm run clean` | `rm -rf dist server.js` (destructive; do not run without explicit need/approval) |

## Architecture and deployment

- The application is a static React/Vite/TypeScript SPA with client-side React Router. There is no runtime backend/server implementation in the current application code. `express` is listed as a dependency, but that alone does not constitute a backend. Bundled NASA research data needs no runtime API.
- Zustand stores app/mission data in browser IndexedDB; check-in drafts use localStorage. Browser-origin storage is local: laptop records do not transfer to the production origin. New visitors get bundled demo and research data. Personal check-ins remain in that browser unless the user explicitly exports/uploads them.
- Root `vercel.json` selects Vite, `npm ci` as the install command, `npm run build:release`, output `dist-release`, and rewrites `/(.*)` to `/index.html` for SPA refresh/deep routes. This supports routes including `/check-in`, `/vitals`, `/reports`, `/mission`, `/settings`, and `/about`. Vercel checks the filesystem before applying rewrites, so emitted `/assets/*` files are still served normally. This file is currently untracked locally, so it is not present on `origin/main`.
- `npm ci` is explicit in `vercel.json` because the repository also tracks a stale `bun.lock` (`name: react-example`, no `jsbarcode`). Without an override, Vercel may detect Bun from that lockfile; `npm ci` installs from the current `package-lock.json`.
- The public `https://arogya-rosy.vercel.app/` currently serves the older `origin/main` application. Vercel project/dashboard settings are not accessible from this checkout; the production URL was inspected directly. Its root HTML and all preloaded JS/CSS returned 200, but React never mounted. The first fatal error was `Uncaught TypeError: n is not a function` at `/assets/three-vendor-xF-xQxpw.js:1:8215`; the failing expression is `a=e(n(),1)` calling an imported binding from a mutually importing vendor chunk pair. `#root` stayed empty, and direct `/about` returned Vercel 404 because no SPA rewrite was deployed. The current release artifact has no static chunk-import cycles and mounts successfully (see validation below).
- `README.md` documents the Vercel install/build/output/rewrite configuration. `vercel.json` does not configure the dashboard production branch or automatic deployment behavior; do not change either without authorization.

## Release versus local-development visuals and assets

- Release mode (`vite.config.ts`, `src/utils/localAssets.ts`, `src/components/dashboard/VideoBackground.tsx`, `src/components/dashboard/BackdropMotionControl.tsx`, `src/components/mission/MissionFlightScene.tsx`) avoids the unverified supplied poster, dashboard video, and all other supplied GLBs. It loads only the unmodified, provenance-verified Programme ERIZON GLB for the Mission scene, with the authored procedural spacecraft as fallback, and uses the procedural astronaut, procedural organ illustration, and CSS starfield/backdrop. NASA OSD-575 JSON is bundled into app code.
- Local ordinary Vite development can load supplied local media through `public/models/`, `public/videos/`, and the existing poster import. Release build uses `publicDir: false`; `scripts/prepare-release.mjs` has a one-entry allowlist for `public/models/programme_erizon.glb`, verifies its exact 32,025,228-byte size and SHA-256 before and after copying, and still applies the 25 MiB per-file guard to every other file. It checks the 100 MB Vercel Hobby static-file limit, excluded asset URL patterns, bundled NASA data marker, intended procedural/CSS fallbacks, and absence of static chunk-import cycles. The 25 MiB bound remains an extra artifact guard for non-ERIZON files.
- The original `3d-models/sci-fi_space_station.glb` is about 154,230,500 bytes (about 147 MiB) and is unused/excluded. Programme ERIZON originals/copy are each 32,025,228 bytes (about 30.5 MiB); the `public/models/programme_erizon.glb` copy is the release input and must remain byte-identical. Its embedded metadata and the official Sketchfab source page (verified 2026-11-15) state CC BY-NC-ND 4.0; creator is `nejenabinupa`, title Programme ERIZON. The release intentionally serves it unchanged for non-commercial use with visible attribution on Mission and About; it is not covered by MIT. Commercial use and derivative distribution require separate permission. Other supplied media/model redistribution permissions remain unverified and are excluded. Preserve all local originals.

## NASA OSD-575 data and provenance

- Runtime import: `src/data/nasaOsd575.ts` imports `./nasaOsd575Cmp.json` and supplies typed parsing/chart helpers; `src/components/vitals/NasaResearchDataPanel.tsx` presents the separately labeled archived research view.
- Generated artifact: `src/data/nasaOsd575Cmp.json` (28 source samples, 19 analytes, 532 sample/analyte records). It is bundled at build time; visitors do not access laptop files or run the importer.
- Importer: `scripts/import-nasa-osd575.ts`. It parses `data/nasa/osd-575/source/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` and regenerates the JSON and `data/nasa/osd-575/provenance.json`.
- Source-side metadata/manifest: `data/nasa/osd-575/source/OSD-575_metadata.json`, `OSD-575_files_manifest.json`; provenance records OSDR study/version, DOI `10.26030/mc5d-p710`, source/download/metadata URLs, checksum, retrieval time, transformation, units, and limitations. The provenance file says CC0-1.0 and records verification against the official OSDR study listing; the local importer noted that its direct HTML response did not expose page content. Treat this as recorded provenance, not a fresh independent verification in this handoff.
- These are archived serum CMP observations from Inspiration4 pseudonymous subjects C001–C004, not imported live NASA telemetry, not linked to Arogya astronauts, not clinical validation/training, and not synthetic demo observations. Source relative timepoint labels are retained; no exact dates or daily cadence is inferred. Missing values remain null.

## Recorded and simulated data boundaries

- Recorded check-ins/vitals and assessment inputs are in the persistent Arogya store. Assessment thresholds/escalation operate on recorded data. Do not change those thresholds or urgent escalation without explicit scope.
- The separate Zustand `useSimulatedTelemetryStore` is volatile and has one module-owned timer; it is not persisted and does not write into recorded vitals or medical reports. `SimulatedTelemetryPanel` starts/pauses/stops it and ties it to the selected subject. Simulated HR/SpO2 chart points and intermittent BP samples are demonstrations only; BP sampling is not continuous. Mission progress/space distances and decorative star/planet/rock motion are ARES-7 simulation/illustration, not measured spacecraft telemetry or ephemeris-backed positions.
- Heart motion can use simulated HR only in explicit running simulation mode; otherwise it uses recorded HR with its timestamp or a labeled illustrative fallback. Do not infer respiratory rate from oxygen saturation. NASA research data stays separate from synthetic crew data.

## Prepared report lifecycle and privacy

- `src/pages/ReportsPage.tsx` memoizes one structured report snapshot from recorded data and the selected subject, mission, period, report format, recipient, private-note option, and concise mode. Report ID/timestamp/metadata/values/charts/recommendations derive from that prepared object. Display, print, Markdown clipboard/download, JSON download, and Drive payload use the same displayed report version; rerenders/live simulated ticks do not inject data into it. Changing options rebuilds the snapshot. Existing saved reports are not exposed through snapshot-management UI and should remain preserved.
- `includePrivateNotes` defaults to `false`; turning it off removes private notes from the newly prepared report. Keep private notes excluded by default.
- `src/engine/reportSnapshot.test.ts`, `src/engine/reportGenerator.test.ts`, and Drive payload tests cover preparation/export consistency. Browser printing and visual print output have not been manually inspected in this handoff.

## Google Drive

- Report upload is optional and user initiated. Local Markdown, JSON, and print remain available. `src/services/googleDriveExport.ts` uses Google Identity Services and narrow `drive.file` scope. Access token is in memory only, not localStorage/sessionStorage; no automatic OAuth/upload occurs.
- Build-time public configuration names: `VITE_GOOGLE_OAUTH_CLIENT_ID` and optional `VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID`. They are public client configuration, not secrets. The folder ID is passed as Drive file `parents` metadata when configured; otherwise export targets the user's Drive root. Invalid/inaccessible configured destination is an error, not a silent alternate destination. `.env.example` is only a local template and does not configure Vercel.
- Without OAuth client ID the UI explicitly shows “Google Drive setup required” and blocks connect/export. Actual Vercel configuration, OAuth, account consent, and real upload have not been verified. Never perform OAuth or upload without the user's participation/approval; do not put secrets or tokens in Vite variables.

## Latest validation and unverified checks

Actual commands run in this checkout on 2026-11-15:

- `npm run lint` — passed (`tsc --noEmit`).
- `npm test` — passed: 21 test files, 113 tests.
- `npm run build:release` — passed after adding the chunk-cycle guard. `dist-release` contains 38 files, 2.45 MiB total; no public runtime assets were copied; all files were below 25 MiB; the static chunk-import graph has 0 cycles. Vite emitted a non-fatal warning that the 524.63 kB main JS chunk exceeds its 500 kB advisory threshold.
- Browser checks on the live public URL: root HTML returned 200; its JS/CSS assets returned 200 with JavaScript/CSS content types and no failed network requests. The browser reported `TypeError: n is not a function` at `/assets/three-vendor-xF-xQxpw.js:1:8215`; `#root` stayed empty. The published chunk pair imports each other, and the failing expression calls one of those cyclic bindings. No error boundary could render because React never mounted. Direct `/about` returned Vercel 404. The deployed page reflects the tracked `main` version, not the current uncommitted release sources.
- Browser checks on a locally built release preview (`http://127.0.0.1:4180`, built from the current working tree): Dashboard mounted with `#root` populated and the procedural astronaut/CSS backdrop. Direct URL loads rendered all active routes (`/`, `/check-in`, `/vitals`, `/reports`, `/mission`, `/settings`, `/about`) with no uncaught errors; only two non-fatal Three.js deprecation warnings (Clock, PCFSoftShadowMap) appeared. No `/models/` or `/videos/` requests were made. The NASA OSD-575 table rendered seven data rows for source subject C001. The simulated live stream advanced from 15:01:39 to 15:01:50 (11 samples over 10.5 s). The JSON export produced a valid 23,446-byte Blob with `includePrivateNotes: false`, and the private-notes checkbox was off by default. The preview viewport was approximately 537–626 CSS px wide; document width matched the viewport with no horizontal overflow, but an exact 390 px viewport was not reproduced in this session.
- With `HTMLCanvasElement.getContext` forced to return null for WebGL, the release dashboard rendered `3D Preview Unavailable` with no canvas, navigation and the Vitals link intact, and no fatal errors; Vitals still rendered and the NASA table remained available.
- Not verified: production deployment of the local sources/configuration, Vercel dashboard settings, exact 390 px layout, print/PDF rendering, an actual browser file-save dialog beyond the generated Blob, real Drive OAuth/upload, GPU/WebGL animation quality, or NASA live connection. No backend/NASA live connection exists to verify.

## Prioritized remaining work

1. Review and approve the proposed source checkpoint; stage/commit/push only after approval.
2. Verify Vercel dashboard build/output/production-branch/auto-deployment settings without changing branch or deployment behavior unless separately approved; then deploy the approved commit and recheck root and direct SPA routes.
3. Configure Google OAuth public client ID and allowed origins only if Drive export is desired; user must test consent and manually confirm a real upload. Keep Drive optional.
4. Resolve third-party asset rights/provenance before considering any other supplied GLB, poster, or video for public use. Programme ERIZON is cleared only for the current non-commercial, unmodified release; obtain separate permission for commercial use or any derivative. Its GLB must remain byte-identical.
5. Inspect report print output and any actual browser download behavior after deployment. Avoid expanding scope into redesign or new features.
