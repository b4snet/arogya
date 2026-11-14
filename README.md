# Arogya — Astronaut Health Monitoring System

**NASA Space Apps Challenge 2026** — *Create Health Monitoring Software for Astronauts on Space Missions*

## Overview

Arogya is an offline-first astronaut health-monitoring and early-warning decision-support companion. It helps crew members notice physiological and behavioral drift during long-duration missions, understand spaceflight-hazard context, take preventive countermeasures, and prepare structured SBAR briefings for a crew medical officer or ground flight surgeon.

> **Safety Boundary:** Arogya is strictly decision support, never diagnosis. It does not diagnose medical conditions, prescribe medication, or replace professional medical guidance.

## Key Capabilities

1. **Mission-Control Dashboard (`/`)**: Crew selector, overall health-readiness score, active alerts, next best action, interactive 3D astronaut preview, today's check-in status, 6 compact trend tiles, Mars transit/comms-delay widget, and an MP4 video backdrop synced from Google Drive.
2. **3D Health Atlas (`/atlas`)**: Full astronaut suit layer plus individually clickable 3D Brain, Heart, and Lungs models with orbit/zoom/reset controls, layer toggles, and a right-side organ inspection panel.
3. **Daily Check-In (`/check-in`)**: Fast offline logging of sleep, mood, stress, cognitive focus, fatigue, hydration, countermeasure exercise, pain score, symptoms, and crew notes.
4. **Biometric Vitals (`/vitals`)**: 14-day cardiovascular, respiratory, radiation, and cabin CO₂ trend charts with personal baseline thresholds.
5. **Structured Briefings (`/reports`)**: One-click SBAR Flight Surgeon brief generator with offline Markdown, JSON, and Print export.
6. **Mission & Environment (`/mission`)**: Mars distance, remaining travel time, communication light-delay context, solar particle drill, and synced Google Drive files viewer.
7. **Settings & Profile (`/settings`)**: Personal baseline calibration, display/reduced-motion preferences, and offline cache management.
8. **About, Sources & Licenses (`/about`)**: Safety policy, NASA HRP references, asset inventory, and open-source licenses.

## Google Drive Asset Integration

Arogya connects with read-only Google Drive permission (`drive.readonly`) via Firebase Auth to download and cache all 3D models (`.glb`/`.gltf`), the dashboard `.mp4` video backdrop, and supplementary files from the shared mission folder into **IndexedDB** for true offline deep-space playback, with multi-part procedural Three.js models built in as a zero-dependency baseline.

## Local Development

```bash
npm install
npm run dev
npm run build
```
