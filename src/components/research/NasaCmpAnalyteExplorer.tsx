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
import { Download } from 'lucide-react';
import {
  buildNasaCmpChartData,
  describeNasaSourceInterval,
  type NasaCmpDataset,
} from '../../data/nasaOsd575';
import { getNasaSampleRows, getNasaSamplesForSubject } from '../../data/researchLibrary';

interface NasaCmpAnalyteExplorerProps {
  dataset: NasaCmpDataset;
  initialSubjectId?: string;
  initialAnalyteId?: string;
}

function downloadSubset(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'arogya-nasa-osd-575-research-subset.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function NasaCmpAnalyteExplorer({
  dataset,
  initialSubjectId,
  initialAnalyteId,
}: NasaCmpAnalyteExplorerProps) {
  const subjectIds = useMemo(
    () => [...new Set(dataset.samples.map((sample) => sample.subjectId))].sort(),
    [dataset]
  );
  const defaultAnalyte =
    dataset.analytes.find((analyte) => analyte.id === initialAnalyteId) ??
    dataset.analytes.find((analyte) => analyte.id === 'glucose') ??
    dataset.analytes[0] ??
    { id: '', label: 'No analyte', unit: '' };

  const [subjectId, setSubjectId] = useState(initialSubjectId ?? subjectIds[0] ?? '');
  const [analyteId, setAnalyteId] = useState(defaultAnalyte.id);
  const analyte = dataset.analytes.find((item) => item.id === analyteId) ?? defaultAnalyte;

  const samples = useMemo(
    () => getNasaSamplesForSubject(dataset, subjectId),
    [dataset, subjectId]
  );
  const rows = useMemo(
    () => getNasaSampleRows(dataset, subjectId, analyte.id),
    [dataset, subjectId, analyte.id]
  );
  const chartData = useMemo(
    () => buildNasaCmpChartData(samples, analyte.id),
    [samples, analyte.id]
  );

  const observedCount = rows.filter((row) => row.result.value != null).length;
  const missingCount = rows.length - observedCount;

  const handleDownload = () => {
    downloadSubset({
      provenance: dataset.provenance,
      selectedSubjectId: subjectId,
      selectedAnalyte: analyte,
      sampleCount: rows.length,
      observedCount,
      missingCount,
      samples: rows.map((row) => ({
        sampleName: row.sampleName,
        timepoint: row.timepoint,
        result: row.result,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium text-[var(--arogya-text-secondary)]">
          Source subject
          <select
            aria-label="NASA source subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="min-h-10 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-sm text-[var(--arogya-text-primary)]"
          >
            {subjectIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
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
            {dataset.analytes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.unit})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-xs font-semibold text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download filtered JSON + provenance
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-[var(--arogya-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--arogya-text-primary)]">
            {analyte.label} trend · {subjectId}
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--arogya-text-muted)]">
            Observed {observedCount} · Missing {missingCount} · Relative sample times only ·{' '}
            {analyte.unit}
          </p>
          <div
            role="img"
            aria-label={`${analyte.label} research results by relative sample timepoint for source subject ${subjectId}`}
            className="mt-2 h-56 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 2, left: 0 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="timepoint" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} width={52} />
                <Tooltip />
                <Line
                  type="linear"
                  dataKey="value"
                  name={`${analyte.label} (${analyte.unit})`}
                  stroke="#1E3A5F"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--arogya-border)]">
          <table className="w-full min-w-[440px] border-collapse text-left text-xs">
            <caption className="sr-only">
              NASA OSD-575 {analyte.label} results for source subject {subjectId}.
            </caption>
            <thead>
              <tr className="border-b border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] font-semibold text-[var(--arogya-text-secondary)]">
                <th scope="col" className="px-3 py-2.5">
                  Sample
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Relative time
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Result
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Source interval
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--arogya-border)] font-mono-tabular text-[var(--arogya-text-primary)]">
              {rows.map((row) => (
                <tr key={row.sampleName}>
                  <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium">
                    {row.sampleName}
                  </th>
                  <td className="whitespace-nowrap px-3 py-2.5">{row.timepoint}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {row.result.value == null ? 'Missing' : `${row.result.value} ${analyte.unit}`}
                  </td>
                  <td className="min-w-44 px-3 py-2.5 font-sans text-[11px] text-[var(--arogya-text-secondary)]">
                    {describeNasaSourceInterval(row.result, analyte.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
        Source intervals are shown as supplied and are not interpreted. Missing values remain
        missing; no value is imputed.
      </p>
    </div>
  );
}
