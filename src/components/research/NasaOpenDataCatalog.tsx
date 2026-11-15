import { useEffect, useState } from 'react';
import { AlertCircle, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '../ui';
import { fetchNasaDatasets } from '../../services/nasaApi';
import {
  NASA_DATASET_TOPICS,
  type NasaDatasetTopicId,
  type NasaDatasetsResponse,
} from '../../../shared/nasa';

type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; payload: NasaDatasetsResponse }
  | { status: 'error'; offline: boolean };

function formatCatalogDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function NasaOpenDataCatalog() {
  const [topicId, setTopicId] = useState<NasaDatasetTopicId>('radiation');
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState({ status: 'error', offline: true });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetchNasaDatasets(topicId, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setState({ status: 'ready', payload });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', offline: false });
      });

    return () => controller.abort();
  }, [topicId, refreshKey]);

  const payload = state.status === 'ready' ? state.payload : null;

  return (
    <Card padding="md" className="space-y-4" aria-label="NASA open data catalog">
      <CardHeader
        title="NASA Open Data catalog"
        subtitle="Live metadata from data.nasa.gov, served through Arogya's backend"
        action={
          <span className="rounded-md border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--arogya-info)]">
            Metadata only
          </span>
        }
      />

      <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
        The backend holds the NASA API key and queries data.nasa.gov&apos;s public catalog on
        request; the key is never included in the browser bundle. Arogya does not download these
        dataset files, bundle them, or train on them. They are pointers to related open data, not a
        validation set for the app.
      </p>

      <div
        role="tablist"
        aria-label="NASA open-data topics"
        className="flex flex-wrap gap-2"
      >
        {NASA_DATASET_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            role="tab"
            aria-selected={topic.id === topicId}
            onClick={() => setTopicId(topic.id)}
            className={
              topic.id === topicId
                ? 'rounded-full border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--arogya-info)]'
                : 'rounded-full border border-[var(--arogya-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--arogya-text-secondary)] hover:border-[var(--arogya-info-border)] hover:text-[var(--arogya-text-primary)]'
            }
          >
            {topic.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="space-y-3">
        {state.status === 'loading' && (
          <p className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-3 py-4 text-xs text-[var(--arogya-text-secondary)]">
            Loading dataset metadata from data.nasa.gov…
          </p>
        )}

        {state.status === 'error' && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-3 py-4">
            <div className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arogya-text-muted)]"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                {state.offline
                  ? 'This device is offline, so the live catalog cannot load. The bundled OSD-575 data above is unaffected.'
                  : 'The NASA catalog could not be reached. The bundled OSD-575 data above is unaffected.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--arogya-border-strong)] px-2.5 py-1.5 text-xs font-medium text-[var(--arogya-text-primary)] hover:border-[var(--arogya-info-border)]"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {payload && (
          <>
            <ul className="grid gap-3 md:grid-cols-2">
              {payload.datasets.map((dataset) => {
                const modified = formatCatalogDate(dataset.modified);
                return (
                  <li
                    key={dataset.id}
                    className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug text-[var(--arogya-text-primary)]">
                        <a
                          href={dataset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          {dataset.title}
                        </a>
                      </h3>
                      <a
                        href={dataset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${dataset.title} on data.nasa.gov`}
                        className="shrink-0 text-[var(--arogya-info)] hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--arogya-info)]">
                      {dataset.organization ?? 'NASA'}
                      {modified ? ` · Modified ${modified}` : ''}
                      {dataset.license ? ` · ${dataset.license}` : ''}
                    </p>
                    {dataset.description && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                        {dataset.description}
                      </p>
                    )}
                    {dataset.formats.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1">
                        {dataset.formats.map((format) => (
                          <span
                            key={format}
                            className="rounded border border-[var(--arogya-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--arogya-text-muted)]"
                          >
                            {format}
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {payload.datasets.length === 0 && (
              <p className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-3 py-4 text-xs text-[var(--arogya-text-secondary)]">
                No datasets matched this topic in the live catalog.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--arogya-border)] pt-3">
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--arogya-text-muted)]">
                <Database className="h-3 w-3" aria-hidden="true" />
                {payload.datasets.length} of {payload.totalAvailable.toLocaleString()} catalog
                matches · retrieved {formatCatalogDate(payload.retrievedAt) ?? payload.retrievedAt} ·
                topic “{payload.query}”
              </p>
              <a
                href={`https://data.nasa.gov/dataset?q=${encodeURIComponent(payload.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--arogya-info)] hover:underline"
              >
                Search data.nasa.gov
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
