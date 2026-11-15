import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '../ui';
import { NASA_CMP_DATASET } from '../../data/researchLibrary';
import { NasaCmpAnalyteExplorer } from '../research/NasaCmpAnalyteExplorer';

const dataset = NASA_CMP_DATASET;

export function NasaResearchDataPanel() {
  return (
    <section id="nasa-research" aria-label="NASA OSD-575 research data" className="scroll-mt-24 space-y-3">
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="NASA Research Data · Inspiration4 Serum CMP"
          subtitle="Archived study laboratory results kept separate from Arogya crew records and simulated telemetry"
          action={<span className="rounded-md border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--arogya-info)]">Research data</span>}
        />

        <div className="grid gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <p><strong className="text-[var(--arogya-text-primary)]">Study:</strong> OSD-575 · Version 3</p>
          <p><strong className="text-[var(--arogya-text-primary)]">DOI:</strong> 10.26030/mc5d-p710</p>
          <p><strong className="text-[var(--arogya-text-primary)]">License:</strong> CC0-1.0 <span className="text-[var(--arogya-text-muted)]">(verified on OSDR page)</span></p>
          <a
            href={dataset.provenance.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--arogya-info)] underline underline-offset-2"
          >
            Official NASA OSDR study <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          Source: <span className="font-mono">{dataset.provenance.filename}</span> · Retrieved {new Date(dataset.provenance.retrievedAt).toLocaleDateString()} · SHA-256 <span className="font-mono">{dataset.provenance.sha256}</span>. {dataset.provenance.unitsAndNormalization}
        </p>

        <div role="note" className="rounded-lg border border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--arogya-warning-text)]">
          These are archived serum research measurements, not live sensor readings or medical advice. Source pseudonyms are not linked to Arogya demo astronauts. Relative sample labels are preserved as supplied; no daily values or diagnoses are inferred.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            This Vitals view shows one source subject at a time. The Research Library adds cohort
            coverage, analyte search, and NASA reference context.
          </p>
          <Link
            to="/research"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-3 text-xs font-semibold text-[var(--arogya-info)] hover:bg-white"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Open full research library
          </Link>
        </div>

        <NasaCmpAnalyteExplorer dataset={dataset} />

        <details className="text-xs text-[var(--arogya-text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--arogya-text-primary)]">Import provenance and limitations</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {dataset.provenance.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
            <li>{dataset.provenance.licenseVerification}</li>
            <li>NASA OSDR API metadata and file manifest are bundled locally; page load does not call NASA.</li>
          </ul>
        </details>
      </Card>
    </section>
  );
}
