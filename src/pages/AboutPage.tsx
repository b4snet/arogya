import {
  BookOpen,
  Code2,
  Database,
  ExternalLink,
  Film,
  Lock,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  HEALTH_INDICATORS_GROUPS,
  HOW_IT_WORKS_STEPS,
  NASA_FIVE_HAZARDS,
  OPEN_SOURCE_LICENSES,
  SPACEFLIGHT_REFERENCES,
  THIRD_PARTY_ASSET_ATTRIBUTIONS,
} from '../data/references';
import { SAFETY_DISCLAIMER } from '../engine/thresholds';
import { useDriveMedia } from '../hooks/useDriveMedia';
import { Card, CardHeader } from '../components/ui';
import { getResourceUrls, HEALTH_CONTENT } from '../content/healthContent';
import { MarkdownContent } from '../content/MarkdownContent';

const TEAM_MEMBERS = [
  {
    name: 'Dibyan Basnet',
    role: 'Project Lead · Full-Stack & Systems Engineer',
    focus: 'Clinical safety architecture, rule-based health engine, offline-first persistence, and 3D anatomical integration.',
    contact: 'basnetdibyan9@gmail.com',
  },
  {
    name: 'Arogya Space Health Working Group',
    role: 'Human Factors, Aerospace Telemetry & Visualization Design',
    focus: 'NASA HRP hazard mapping, SBAR flight-surgeon reporting structure, and low-light accessible mission UI.',
    contact: 'NASA Space Apps Challenge 2026 · Team Arogya',
  },
];

const GITHUB_REPO_URL = 'https://github.com/b4snet/arogya';
const DEMO_VIDEO_FALLBACK_URL = 'https://www.spaceappschallenge.org/';

export function AboutPage() {
  const { allAssets, videoUrl, videoAsset } = useDriveMedia();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <header className="border-b border-[var(--arogya-border)] pb-5">
        <p className="text-xs font-medium text-[var(--arogya-info)]">
          NASA Space Apps Challenge 2026 · Create Health Monitoring Software for Astronauts on Space Missions
        </p>
        <h1 className="arogya-display mt-1 text-[var(--arogya-text-primary)]">
          About Arogya, Sources & Open-Source Licenses
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--arogya-text-secondary)]">
          Arogya is an offline-first astronaut health-monitoring and early-warning decision-support system built for long-duration orbital and Mars transit missions.
        </p>
      </header>

      {/* Mandatory Safety Boundary */}
      <Card variant="alert" padding="md">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arogya-critical-text)]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--arogya-critical-text)]">
              Safety Limitations & Non-Diagnostic Decision-Support Boundary
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--arogya-text-primary)]">
              {SAFETY_DISCLAIMER}
            </p>
            <ul className="mt-2.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              <li>
                All alerts and system statuses use deterministic, inspectable threshold rules rather than opaque clinical inference.
              </li>
              <li>
                Missing sensor readings or skipped check-ins are explicitly labeled <strong className="text-[var(--arogya-warning-text)]">MISSING</strong> and are never treated as normal.
              </li>
              <li>
                Personal pre-flight baselines are displayed separately from general adult educational reference ranges, as spaceflight adaptation alters normal ground physiology.
              </li>
              <li>
                High-concern indicators (chest discomfort, severe shortness of breath, fever with systemic symptoms, or repeated abnormal vital signs) immediately recommend contacting the crew medical officer or flight surgeon.
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Project Overview & Challenge Alignment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="md" className="space-y-3">
          <CardHeader
            title="Project Overview"
            subtitle="Autonomous onboard health awareness under communication delay"
          />
          <p className="text-sm leading-relaxed text-[var(--arogya-text-secondary)]">
            Long-duration missions beyond Low Earth Orbit face up to 44-minute round-trip communication delays with Earth. Arogya equips crew members with a calm, low-light mission console to log daily physical and behavioral shifts in under 90 seconds, visualize affected organ systems in 3D, track longitudinal vitals against personal baselines, and export structured SBAR briefings.
          </p>
        </Card>

        <Card padding="md" className="space-y-3">
          <CardHeader
            title="Challenge Alignment"
            subtitle="Addressing NASA Space Apps Challenge 2026 requirements"
          />
          <ul className="space-y-2 text-sm leading-relaxed text-[var(--arogya-text-secondary)]">
            <li>
              <strong className="text-[var(--arogya-text-primary)]">Early Drift Detection:</strong> Flags multi-day sleep debt, exercise deficits, blood pressure shifts, and radiation budget consumption before acute issues escalate.
            </li>
            <li>
              <strong className="text-[var(--arogya-text-primary)]">Spaceflight Context:</strong> Maps every finding directly to microgravity fluid shifts, cabin pCO₂, solar particle events, and countermeasure adherence.
            </li>
            <li>
              <strong className="text-[var(--arogya-text-primary)]">Offline Continuity:</strong> Uses browser-local IndexedDB and localStorage; records are origin-specific and do not automatically transfer from a laptop to a deployed site.
            </li>
          </ul>
        </Card>
      </div>

      {/* Team Members, Demo Video & GitHub Repository */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Team & Project Links"
          subtitle="Contributors, source repository, and mission demonstration walkthrough"
          action={<Users className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
            >
              <p className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                {member.name}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[var(--arogya-info)]">{member.role}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {member.focus}
              </p>
              <p className="mt-2 font-mono-tabular text-[11px] text-[var(--arogya-text-muted)]">
                {member.contact}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] p-4 transition-colors hover:border-[#1E3A5F]/45"
          >
            <div className="flex items-start gap-3">
              <Code2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                  GitHub Repository
                </p>
                <p className="mt-0.5 font-mono-tabular text-xs text-[var(--arogya-text-secondary)]">
                  github.com/dibyanbasnet/arogya-space-health
                </p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--arogya-text-muted)]" aria-hidden="true" />
          </a>

          <a
            href={videoUrl ?? DEMO_VIDEO_FALLBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] p-4 transition-colors hover:border-[#1E3A5F]/45"
          >
            <div className="flex items-start gap-3">
              <Film className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                  Demo Video Link
                </p>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
                  {videoAsset
                    ? `Synced Drive media: ${videoAsset.name}`
                    : 'NASA Space Apps 2026 Project Submission & Walkthrough'}
                </p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--arogya-text-muted)]" aria-hidden="true" />
          </a>
        </div>
      </Card>

      {/* How It Works */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="How Arogya Works"
          subtitle="End-to-end local decision-support workflow"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
            >
              <span className="font-mono-tabular text-xs font-semibold text-[var(--arogya-info)]">
                Step {item.step}
              </span>
              <h3 className="mt-1.5 text-sm font-semibold text-[var(--arogya-text-primary)]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Health Indicators Used */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Health Indicators Evaluated"
          subtitle="Tracked physiological, behavioral, and habitat telemetry inputs"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {HEALTH_INDICATORS_GROUPS.map((grp) => (
            <div
              key={grp.group}
              className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
            >
              <h3 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                {grp.group}
              </h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {grp.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* NASA Five Spaceflight Hazards */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="NASA Five Spaceflight Hazards"
          subtitle="Aligned with NASA Human Research Program (HRP) hazard classifications"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {NASA_FIVE_HAZARDS.map((hazard) => (
            <article
              key={hazard.id}
              className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
            >
              <h3 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                {hazard.name}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-[var(--arogya-info)]">{hazard.nasaCategory}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {hazard.physiologicalImpact}
              </p>
              <p className="mt-2 border-t border-[var(--arogya-border)] pt-2 text-xs leading-relaxed text-[var(--arogya-text-primary)]">
                <strong className="font-medium text-[var(--arogya-info)]">Arogya integration:</strong>{' '}
                {hazard.arogyaMonitoring}
              </p>
            </article>
          ))}
        </div>
      </Card>

      {/* Data Privacy Approach & Mock-Data Disclosure */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="md" className="space-y-3">
          <CardHeader
            title="Data Privacy Approach"
            subtitle="Local-first storage with user-controlled read-only media sync"
            action={<Lock className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />}
          />
          <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            <li>
              <strong className="text-[var(--arogya-text-primary)]">On-Device Persistence:</strong> Crew check-ins, vital entries, personal baselines, and generated SBAR reports remain strictly inside your browser’s localStorage (<span className="font-mono-tabular">arogya-mission-store-v2</span>) and local draft storage.
            </li>
            <li>
              <strong className="text-[var(--arogya-text-primary)]">No Unsolicited Cloud Uploads:</strong> Arogya does not transmit personal health logs to external analytics trackers or third-party servers.
            </li>
            <li>
              <strong className="text-[var(--arogya-text-primary)]">Read-Only Drive Media Sync:</strong> Optional Google Drive authentication requests only <span className="font-mono-tabular">drive.readonly</span> permission to download mission media assets into local IndexedDB for offline playback.
            </li>
          </ul>
        </Card>

        <Card padding="md" className="space-y-3">
          <CardHeader
            title="Mock-Data & Simulation Disclosure"
            subtitle="Synthetic datasets for demonstration and validation"
            action={<Database className="h-4 w-4 text-[var(--arogya-warning-text)]" aria-hidden="true" />}
          />
          <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            All preloaded astronaut profiles (Commander Aarav Sharma, Flight Engineer Maya Patel, and Mission Specialist Daniel Kim), their 14-day synthetic check-in and vital-sign telemetry series, and the ARES-7 Transit Mars orbital calculations are <strong className="text-[var(--arogya-text-primary)]">simulated datasets</strong> created solely to demonstrate and test software behavior.
          </p>
          <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            Intentional missing values (such as Day 11 blood glucose and Day 7 body mass on AST-02) are included in the demonstration dataset to verify missing-data safety rules. Arogya does not claim live connectivity to NASA flight hardware or real-time spacecraft telemetry.
          </p>
        </Card>

        <Card padding="md" className="space-y-3">
          <CardHeader
            title="NASA Research Data Disclosure"
            subtitle="Bundled OSDR-575 Inspiration4 serum comprehensive metabolic panel"
            action={<Database className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />}
          />
          <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            Vitals includes 28 archived sample rows from NASA OSDR study OSD-575 (Version 3, DOI 10.26030/mc5d-p710), covering 19 CMP analytes and four source pseudonyms. These research results remain separate from fictional crew records and simulated telemetry; the application does not link or re-identify participants.
          </p>
          <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            The selected transformed CSV and import provenance are bundled locally; page loading does not depend on NASA availability. Source units and relative timepoint labels are retained, missing values remain missing, and no diagnostic interpretation is applied. The official OSDR OSD-575 Version 3 study page lists CC0-1.0; this license was verified against the official study listing.
          </p>
        </Card>
      </div>

      {/* NASA & Partner-Source Citations */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="NASA & Partner-Source Citations"
          subtitle="Authoritative spaceflight biomedical references informing threshold design"
          action={<BookOpen className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />}
        />
        <div className="divide-y divide-[var(--arogya-border)]">
          {SPACEFLIGHT_REFERENCES.map((ref) => (
            <article key={ref.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                    {ref.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--arogya-info)]">
                    {ref.organization} · {ref.topic}
                  </p>
                </div>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--arogya-info)] hover:underline"
                >
                  <span>Source</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {ref.summary}
              </p>
            </article>
          ))}
        </div>
        <div className="border-t border-[var(--arogya-border)] pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Supplied Resource Lists
          </h3>
          <ul className="mt-2 space-y-2 text-xs">
            {[...getResourceUrls('nasaResources'), ...getResourceUrls('partnerResources')].map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[var(--arogya-info)] underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Health Content & Safety References"
          subtitle="Rendered directly from the project health-content Markdown files."
        />
        <div className="space-y-3">
          {[
            ['Alert messages', HEALTH_CONTENT.alerts],
            ['Body-system explanations', HEALTH_CONTENT.bodySystems],
            ['Disclaimers', HEALTH_CONTENT.disclaimers],
            ['Glossary', HEALTH_CONTENT.glossary],
            ['Health indicators', HEALTH_CONTENT.healthIndicators],
            ['Safe actions', HEALTH_CONTENT.safeActions],
            ['Spaceflight hazards', HEALTH_CONTENT.spaceflightHazards],
          ].map(([title, content]) => (
            <details
              key={title}
              className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
            >
              <summary className="cursor-pointer font-semibold text-[var(--arogya-text-primary)] focus-visible:outline">
                {title}
              </summary>
              <div className="mt-3 border-t border-[var(--arogya-border)] pt-3">
                <MarkdownContent content={content} />
              </div>
            </details>
          ))}
        </div>
      </Card>

      {/* Third-Party Asset Attribution & Synced Inventory */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Third-Party Asset Attribution & Media Inventory"
          subtitle={`Public procedural visuals, local-only media records, typography, and ${allAssets.length} synced Google Drive item(s)`}
        />

        <div className="space-y-3">
          {THIRD_PARTY_ASSET_ATTRIBUTIONS.map((asset) => (
            <div
              key={asset.id}
              className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5 text-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-[var(--arogya-text-primary)]">
                  {asset.assetName}
                </span>
                <span className="font-mono-tabular text-[var(--arogya-info)]">
                  {asset.type} · {asset.license}
                </span>
              </div>
              <p className="mt-1 text-[var(--arogya-text-secondary)]">
                <strong className="text-[var(--arogya-text-primary)]">Source:</strong>{' '}
                {asset.sourceUrl ? (
                  <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[var(--arogya-info)] underline">
                    {asset.source}
                  </a>
                ) : asset.source}
              </p>
              {asset.creator && (
                <p className="mt-1 text-[var(--arogya-text-secondary)]">
                  <strong className="text-[var(--arogya-text-primary)]">Creator:</strong> {asset.creator}
                </p>
              )}
              {asset.licenseUrl && (
                <p className="mt-1 text-[var(--arogya-text-secondary)]">
                  <strong className="text-[var(--arogya-text-primary)]">License:</strong>{' '}
                  <a href={asset.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--arogya-info)] underline">
                    {asset.license}
                  </a>
                </p>
              )}
              {asset.id === 'asset-programme-erizon' && (
                <p className="mt-1 font-semibold text-amber-800">
                  Separately licensed third-party model; not covered by Arogya’s MIT code license.
                </p>
              )}
              <p className="mt-1 text-[var(--arogya-text-muted)]">{asset.notes}</p>
            </div>
          ))}
        </div>

        {allAssets.length > 0 && (
          <div className="border-t border-[var(--arogya-border)] pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Currently Cached Google Drive Assets ({allAssets.length})
            </h3>
            <ul className="mt-2 divide-y divide-[var(--arogya-border)] text-xs">
              {allAssets.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-[var(--arogya-text-primary)]">{item.name}</span>
                  <span className="font-mono-tabular text-[var(--arogya-text-secondary)]">
                    {item.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Open-Source Software Licenses */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Open-Source Software & Font Licenses"
          subtitle="Libraries, charting engines, 3D frameworks, icon sets, and typefaces bundled in Arogya"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs">
            <caption className="sr-only">
              Open-source libraries, versions, and licenses used in Arogya.
            </caption>
            <thead>
              <tr className="border-b border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[11px] font-semibold text-[var(--arogya-text-secondary)]">
                <th scope="col" className="px-3 py-2.5">Package / Font</th>
                <th scope="col" className="px-3 py-2.5">Category</th>
                <th scope="col" className="px-3 py-2.5">Version / Source</th>
                <th scope="col" className="px-3 py-2.5">License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--arogya-border)]">
              {OPEN_SOURCE_LICENSES.map((lib) => (
                <tr key={lib.name} className="hover:bg-[var(--arogya-bg)]">
                  <th scope="row" className="px-3 py-2.5 font-medium text-[var(--arogya-text-primary)]">
                    {lib.name}
                  </th>
                  <td className="px-3 py-2.5 text-[var(--arogya-text-secondary)]">
                    {lib.category}
                  </td>
                  <td className="px-3 py-2.5 font-mono-tabular text-[var(--arogya-text-secondary)]">
                    {lib.versionOrSource}
                  </td>
                  <td className="px-3 py-2.5 font-mono-tabular text-[var(--arogya-info)]">
                    {lib.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
