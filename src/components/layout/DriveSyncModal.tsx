import { useEffect, useState } from 'react';
import { CloudUpload, HardDrive, X } from 'lucide-react';
import type { Report } from '../../types';
import { DriveExportPanel } from '../drive/DriveExportPanel';
import { DriveAssetSyncPanel } from '../drive/DriveAssetSyncPanel';

type DriveTab = 'export' | 'media';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The generated report the operator chose to export, if any. */
  report?: Report | null;
  astronautName?: string;
  initialTab?: DriveTab;
}

const TAB_LABELS: Record<DriveTab, string> = {
  export: 'Export report',
  media: 'Mission media cache',
};

/**
 * Google Drive dialog.
 *
 * Primary tab: optional, consent-gated one-time report export (`drive.file`).
 * Secondary tab: the existing read-only mission media cache.
 */
export function DriveSyncModal({
  isOpen,
  onClose,
  report = null,
  astronautName = 'Crew member',
  initialTab = 'export',
}: DriveSyncModalProps) {
  const [tab, setTab] = useState<DriveTab>(initialTab);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-sync-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--arogya-border)] bg-white p-6 text-[var(--arogya-text-primary)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--arogya-border)] pb-4">
          <div>
            <h2 id="drive-sync-title" className="flex items-center gap-2 text-lg font-semibold text-[var(--arogya-text-primary)]">
              <HardDrive className="h-4 w-4 text-[#1E3A5F]" aria-hidden="true" />
              Google Drive
            </h2>
            <p className="mt-1 text-xs text-[var(--arogya-text-muted)]">
              Optional integration. Report export is a manual, confirmed one-time upload of a single
              report — not continuous sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-[var(--arogya-text-secondary)] hover:bg-[var(--arogya-bg)] hover:text-[var(--arogya-text-primary)]"
            aria-label="Close Google Drive dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Google Drive sections"
          className="mt-4 inline-flex flex-wrap items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-1"
        >
          {(Object.keys(TAB_LABELS) as DriveTab[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`drive-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`drive-panel-${id}`}
              onClick={() => setTab(id)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 text-xs font-medium ${
                tab === id
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
              }`}
            >
              {id === 'export' ? (
                <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="mt-4" role="tabpanel" id={`drive-panel-${tab}`} aria-labelledby={`drive-tab-${tab}`}>
          {tab === 'export' ? (
            <DriveExportPanel report={report} astronautName={astronautName} onGoToReports={onClose} />
          ) : (
            <DriveAssetSyncPanel />
          )}
        </div>
      </div>
    </div>
  );
}
