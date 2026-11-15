import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '../ui';
import nasaCmpDataset from '../../data/nasaOsd575Cmp.json';
import {
  buildNasaCmpChartData,
  compareNasaRelativeTimepoints,
  describeNasaSourceInterval,
  type NasaCmpDataset,
} from '../../data/nasaOsd575';

const dataset = nasaCmpDataset as NasaCmpDataset;

function downloadSubset(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'arogya-nasa-osd-575-research-subset.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function NasaResearchDataPanel() {
  const [subjectId, setSubjectId] = useState(dataset.samples[0]?.subjectId ?? '');
  const [analyteId, setAnalyteId] = useState(
    dataset.analytes.find((analyte) => analyte.id === 'glucose')?.id ?? dataset.analytes[0]?.id ?? ''
  );

  const analyte = dataset.analytes.find((item) => item.id === analyteId) ?? dataset.analytes[0];
  const samples = useMemo(
    () => dataset.samples
      .filter((sample) => sample.subjectId === subjectId)
      .sort((a, b) => compareNasaRelativeTimepoints(a.timepoint, b.timepoint)),
    [subjectId]
  );
  const chartData = buildNasaCmpChartData(samples, analyte.id);

  const handleDownload = () => downloadSubset({
    provenance: dataset.provenance,
    selectedSubjectId: subjectId,
    selectedAnalyte: analyte,
    samples: samples.map((sample) => ({
      sampleName: sample.sampleName,
      timepoint: sample.timepoint,
      result: sample.results[analyte.id],
    })),
  });

  return (
    <section aria-label="NASA OSD-575 research data" className="space-y-3">
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

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-medium text-[var(--arogya-text-secondary)]">
            Source subject
            <select
              aria-label="NASA source subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="min-h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-sm text-[var(--arogya-text-primary)]"
            >
              {[...new Set(dataset.samples.map((sample) => sample.subjectId))].sort().map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--arogya-text-secondary)]">
            Analyte
            <select
              aria-label="NASA CMP analyte"
              value={analyte.id}
              onChange={(event) => setAnalyteId(event.target.value)}
              className="min-h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-sm text-[var(--arogya-text-primary)]"
            >
              {dataset.analytes.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.unit})</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-xs font-semibold text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download filtered JSON + provenance
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-[var(--arogya-border)] p-3">
            <h3 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
              {analyte.label} trend · {subjectId}
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--arogya-text-muted)]">Relative sample times only · {analyte.unit}</p>
            <div role="img" aria-label={`${analyte.label} research results by relative sample timepoint for source subject ${subjectId}`} className="mt-2 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 2, left: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="timepoint" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} width={52} />
                  <Tooltip />
                  <Line type="linear" dataKey="value" name={`${analyte.label} (${analyte.unit})`} stroke="#1E3A5F" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--arogya-border)]">
            <table className="w-full min-w-[440px] border-collapse text-left text-xs">
              <caption className="sr-only">NASA OSD-575 {analyte.label} results for source subject {subjectId}.</caption>
              <thead>
                <tr className="border-b border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] font-semibold text-[var(--arogya-text-secondary)]">
                  <th scope="col" className="px-3 py-2.5">Sample</th>
                  <th scope="col" className="px-3 py-2.5">Relative time</th>
                  <th scope="col" className="px-3 py-2.5">Result</th>
                  <th scope="col" className="px-3 py-2.5">Source interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--arogya-border)] font-mono-tabular text-[var(--arogya-text-primary)]">
                {samples.map((sample) => {
                  const result = sample.results[analyte.id];
                  return (
                    <tr key={sample.sampleName}>
                      <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium">{sample.sampleName}</th>
                      <td className="whitespace-nowrap px-3 py-2.5">{sample.timepoint}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{result.value == null ? 'Missing' : `${result.value} ${analyte.unit}`}</td>
                      <td className="min-w-44 px-3 py-2.5 font-sans text-[11px] text-[var(--arogya-text-secondary)]">
                        {describeNasaSourceInterval(result, analyte.unit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

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
