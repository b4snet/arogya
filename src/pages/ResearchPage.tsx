import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  Database,
  ExternalLink,
  FlaskConical,
  ShieldAlert,
  Table2,
  Users,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui';
import { NasaOpenDataCatalog } from '../components/research/NasaOpenDataCatalog';
import { NasaCmpAnalyteExplorer } from '../components/research/NasaCmpAnalyteExplorer';
import {
  NASA_CMP_DATASET,
  buildNasaAnalyteCoverage,
  buildNasaSubjectSummaries,
  buildResearchLibraryCatalog,
  searchNasaAnalytes,
  summarizeNasaCmpDataset,
} from '../data/researchLibrary';

function formatUtcDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function ResearchPage() {
  const dataset = NASA_CMP_DATASET;
  const provenance = dataset.provenance;
  const [analyteQuery, setAnalyteQuery] = useState('');
  const { hash } = useLocation();

  // Context cards deep-link to sections that render after the initial route paint.
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    const frame = window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);

  const summary = useMemo(() => summarizeNasaCmpDataset(dataset), [dataset]);
  const catalog = useMemo(() => buildResearchLibraryCatalog(dataset), [dataset]);
  const subjects = useMemo(() => buildNasaSubjectSummaries(dataset), [dataset]);
  const analyteCoverage = useMemo(() => buildNasaAnalyteCoverage(dataset), [dataset]);
  const visibleAnalytes = useMemo(() => {
    const matchIds = new Set(searchNasaAnalytes(dataset, analyteQuery).map((analyte) => analyte.id));
    return analyteCoverage.filter((analyte) => matchIds.has(analyte.id));
  }, [analyteCoverage, dataset, analyteQuery]);

  const retrievedDate = formatUtcDate(provenance.retrievedAt);

  const metrics = [
    { label: 'Source samples', value: summary.sampleCount, unit: 'relative-time rows', icon: Database },
    { label: 'Source subjects', value: summary.subjectCount, unit: 'pseudonymous IDs', icon: Users },
    { label: 'CMP analytes', value: summary.analyteCount, unit: 'laboratory measures', icon: FlaskConical },
    { label: 'Measurements', value: summary.measurementCount, unit: 'sample × analyte', icon: Table2 },
    { label: 'Missing values', value: summary.missingMeasurementCount, unit: 'left missing, not imputed', icon: AlertCircle },
    { label: 'Relative timepoints', value: summary.timepointCount, unit: 'source labels', icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="border-b border-[var(--arogya-border)] pb-5">
        <p className="text-xs font-medium text-[var(--arogya-info)]">
          NASA OSDR · Archived research context
        </p>
        <h1 className="arogya-display mt-1 text-[var(--arogya-text-primary)]">
          Research Context
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--arogya-text-secondary)]">
          A secondary reference view of the bundled OSD-575 Inspiration4 serum comprehensive
          metabolic panel and the NASA references that frame Arogya&apos;s monitoring questions.
          The OSD-575 dataset provides context and reference ranges only; no model is trained on
          it. Its files are bundled at build time, while the open-data catalog below fetches
          metadata from data.nasa.gov through Arogya&apos;s backend; no dataset files are downloaded
          or used for training.
        </p>
      </header>

      <Card
        padding="md"
        className="border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)]"
        role="note"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
              Research boundaries
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              This is a source-traceable view of archived research observations, not a clinical tool
              or a validation set for Arogya&apos;s rules.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              {catalog.boundaries.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <section aria-label="NASA research context summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map(({ label, value, unit, icon: Icon }) => (
          <Card key={label} padding="sm" className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-[var(--arogya-text-secondary)]">{label}</p>
              <Icon className="h-4 w-4 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
            </div>
            <p className="mt-2 font-mono-tabular text-2xl font-semibold text-[var(--arogya-text-primary)]">
              {value.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-[var(--arogya-text-muted)]">{unit}</p>
          </Card>
        ))}
      </section>

      <Card id="nasa-osd575" padding="md" className="scroll-mt-24 space-y-4">
        <CardHeader
          title="OSD-575 · Inspiration4 serum CMP"
          subtitle={summary.shortTitle}
          action={
            <span className="rounded-md border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--arogya-info)]">
              Archived dataset
            </span>
          }
        />
        <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">{summary.title}</p>
        <div className="grid gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <strong className="text-[var(--arogya-text-primary)]">Study:</strong> OSD-575 · Version{' '}
            {summary.version}
          </p>
          <p>
            <strong className="text-[var(--arogya-text-primary)]">DOI:</strong>{' '}
            <span className="font-mono">{summary.doi}</span>
          </p>
          <p>
            <strong className="text-[var(--arogya-text-primary)]">License:</strong> {summary.license}
          </p>
          <p>
            <strong className="text-[var(--arogya-text-primary)]">Retrieved:</strong> {retrievedDate}
          </p>
          <p>
            <strong className="text-[var(--arogya-text-primary)]">Source rows:</strong>{' '}
            {summary.sampleCount}
          </p>
          <p>
            <strong className="text-[var(--arogya-text-primary)]">Subjects:</strong>{' '}
            {summary.subjectCount} pseudonyms
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <a
            href={provenance.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--arogya-info)] underline underline-offset-2"
          >
            Official OSDR study <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <a
            href={provenance.metadataUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--arogya-info)] underline underline-offset-2"
          >
            OSDR metadata <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <a
            href={provenance.manifestUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--arogya-info)] underline underline-offset-2"
          >
            File manifest <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <a
            href={provenance.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--arogya-info)] underline underline-offset-2"
          >
            Source CSV <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <Link
            to="/vitals#nasa-research"
            className="inline-flex items-center gap-1 font-semibold text-[var(--arogya-text-primary)] underline underline-offset-2"
          >
            Open Vitals view <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
          Bundled source file: <span className="font-mono">{provenance.filename}</span> · SHA-256:{' '}
          <span className="font-mono break-all">{provenance.sha256}</span>. Metadata and the source
          export are bundled locally; page load does not call NASA.
        </p>
      </Card>

      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Analyte explorer"
          subtitle="One source subject and one CMP analyte at a time; relative sample labels only"
        />
        <NasaCmpAnalyteExplorer dataset={dataset} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md" className="space-y-4">
          <CardHeader
            title="Source subject coverage"
            subtitle="Pseudonymous study subjects; not linked to Arogya crew records"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {subjects.map((subject) => (
              <article
                key={subject.subjectId}
                className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono-tabular text-sm font-semibold text-[var(--arogya-text-primary)]">
                    {subject.subjectId}
                  </h3>
                  <span className="rounded border border-[var(--arogya-border)] px-1.5 py-0.5 text-[10px] text-[var(--arogya-text-muted)]">
                    Source pseudonym
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                  {subject.sampleCount} samples · {subject.observedMeasurementCount} observed ·{' '}
                  {subject.missingMeasurementCount} missing
                </p>
                <p className="mt-2 font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
                  {subject.timepoints.join(' · ')}
                </p>
              </article>
            ))}
          </div>
        </Card>

        <Card padding="md" className="space-y-4">
          <CardHeader
            title="Analyte coverage"
            subtitle="Observed and missing results across all source samples"
          />
          <label className="grid gap-1 text-xs font-medium text-[var(--arogya-text-secondary)]">
            Search analytes
            <input
              type="search"
              value={analyteQuery}
              onChange={(event) => setAnalyteQuery(event.target.value)}
              placeholder="glucose, eGFR, mg/dL"
              className="min-h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-sm text-[var(--arogya-text-primary)]"
            />
          </label>
          <div className="max-h-96 overflow-auto rounded-lg border border-[var(--arogya-border)]">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <caption className="sr-only">
                OSD-575 analyte coverage across all source samples.
              </caption>
              <thead className="sticky top-0 bg-[var(--arogya-surface-elevated)]">
                <tr className="border-b border-[var(--arogya-border)] font-semibold text-[var(--arogya-text-secondary)]">
                  <th scope="col" className="px-3 py-2.5">
                    Analyte
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Unit
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Observed
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Missing
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Subjects
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--arogya-border)] text-[var(--arogya-text-primary)]">
                {visibleAnalytes.map((analyte) => (
                  <tr key={analyte.id}>
                    <th scope="row" className="px-3 py-2.5 font-medium">
                      {analyte.label}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono-tabular">{analyte.unit}</td>
                    <td className="px-3 py-2.5 font-mono-tabular">{analyte.observedCount}</td>
                    <td className="px-3 py-2.5 font-mono-tabular">{analyte.missingCount}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono-tabular">
                      {analyte.subjectCount} / {summary.subjectCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleAnalytes.length === 0 && (
              <p className="px-3 py-4 text-xs text-[var(--arogya-text-secondary)]">
                No analytes match this search.
              </p>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
            Coverage counts are descriptive only. They do not classify results, establish clinical
            significance, or replace the source-reported intervals.
          </p>
        </Card>
      </div>

      <NasaOpenDataCatalog />

      <Card id="nasa-reference-library" padding="md" className="scroll-mt-24 space-y-4">
        <CardHeader
          title="NASA reference library"
          subtitle="Sources that frame monitoring questions; separate from the OSD-575 observations"
          action={<BookOpen className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />}
        />
        <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          These references inform Arogya&apos;s hazard framing and monitoring prompts. They are not
          part of the bundled CMP dataset and do not validate the app, its thresholds, or its
          decision-support output.
        </p>
        <div className="divide-y divide-[var(--arogya-border)]">
          {catalog.references.map((reference) => (
            <article key={reference.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
                    {reference.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--arogya-info)]">
                    {reference.organization} · {reference.topic}
                  </p>
                </div>
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--arogya-info)] hover:underline"
                >
                  <span>Source</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {reference.summary}
              </p>
            </article>
          ))}
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Provenance, transformation & limitations"
          subtitle="Source traceability for the bundled OSD-575 subset"
        />
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--arogya-text-primary)]">Source file</dt>
            <dd className="mt-0.5 break-all font-mono text-[var(--arogya-text-secondary)]">
              {provenance.filename}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--arogya-text-primary)]">SHA-256</dt>
            <dd className="mt-0.5 break-all font-mono text-[var(--arogya-text-secondary)]">
              {provenance.sha256}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--arogya-text-primary)]">Retrieved</dt>
            <dd className="mt-0.5 text-[var(--arogya-text-secondary)]">{retrievedDate}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--arogya-text-primary)]">License</dt>
            <dd className="mt-0.5 text-[var(--arogya-text-secondary)]">
              {provenance.license}{' '}
              <a
                href={provenance.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--arogya-info)] underline underline-offset-2"
              >
                License text
              </a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold text-[var(--arogya-text-primary)]">Transformation</dt>
            <dd className="mt-0.5 leading-relaxed text-[var(--arogya-text-secondary)]">
              {provenance.transformDescription}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold text-[var(--arogya-text-primary)]">
              Units and normalization
            </dt>
            <dd className="mt-0.5 leading-relaxed text-[var(--arogya-text-secondary)]">
              {provenance.unitsAndNormalization}
            </dd>
          </div>
        </dl>
        <div>
          <h3 className="text-xs font-semibold text-[var(--arogya-text-primary)]">
            Source limitations
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            {provenance.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
          {provenance.licenseVerification}
        </p>
      </Card>
    </div>
  );
}
