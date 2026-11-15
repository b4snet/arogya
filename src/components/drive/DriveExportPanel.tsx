import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  PlugZap,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import type { Report } from '../../types';
import { buildDriveExportPayload, formatPayloadSize, type DriveExportFileFormat } from '../../services/driveExportPayload';
import {
  DRIVE_EXPORT_ONLY_NOTE,
  DRIVE_SETUP_REQUIRED_MESSAGE,
  DRIVE_STATUS_LABELS,
} from '../../services/driveExportState';
import { getDriveExportStore, useDriveExportState } from '../../services/driveExportStore';
import { DRIVE_FILE_SCOPE } from '../../services/googleDriveExport';

const STATUS_STYLES: Record<string, string> = {
  connected: 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]',
  connecting: 'border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] text-[var(--arogya-info)]',
  cancelled: 'border-[#CA8A04]/40 bg-[#CA8A04]/8 text-[#92400E]',
  error: 'border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]',
  not_configured: 'border-[#CA8A04]/40 bg-[#CA8A04]/8 text-[#92400E]',
  disconnected: 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]',
};

interface DriveExportPanelProps {
  report: Report | null;
  astronautName: string;
  onGoToReports?: () => void;
}

export function DriveExportPanel({ report, astronautName, onGoToReports }: DriveExportPanelProps) {
  const store = getDriveExportStore();
  const state = useDriveExportState();
  const [format, setFormat] = useState<DriveExportFileFormat>('markdown');
  const [confirmed, setConfirmed] = useState(false);

  const payload = useMemo(
    () => (report ? buildDriveExportPayload({ report, astronautName, format }) : null),
    [report, astronautName, format]
  );

  const canUpload =
    Boolean(payload) && state.status === 'connected' && confirmed && state.upload.status !== 'uploading';

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  STATUS_STYLES[state.status] ?? STATUS_STYLES.disconnected
                }`}
                role="status"
                aria-live="polite"
              >
                {state.status === 'connecting' ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : state.status === 'connected' ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                )}
                Google Drive: {DRIVE_STATUS_LABELS[state.status]}
              </span>
              {state.status === 'connected' && (
                <span className="text-[11px] text-[var(--arogya-text-secondary)]">
                  {state.accountEmail
                    ? `Authorized as ${state.accountEmail}`
                    : 'Connected — Google did not share the account email'}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              Optional integration. Arogya requests the narrow{' '}
              <span className="font-mono-tabular text-[11px]">{DRIVE_FILE_SCOPE}</span> scope, so it can
              only see and create files it made itself. No client secret is used in the browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state.status === 'connected' ? (
              <button
                type="button"
                onClick={() => {
                  setConfirmed(false);
                  void store.disconnect();
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-xs font-medium text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
              >
                <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void store.connect()}
                disabled={state.status === 'connecting' || !state.configured}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white hover:bg-[#2D4A6F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.status === 'connecting' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {state.status === 'connecting'
                  ? 'Connecting…'
                  : state.status === 'cancelled' || state.status === 'error'
                  ? 'Reconnect Google Drive'
                  : 'Connect Google Drive'}
              </button>
            )}
          </div>
        </div>

        {state.cancelReason && state.status === 'cancelled' && (
          <p className="mt-3 rounded-lg border border-[#CA8A04]/40 bg-[#CA8A04]/8 px-3 py-2 text-xs text-[#92400E]">
            {state.cancelReason} Nothing was uploaded.
          </p>
        )}

        {state.error && (
          <div className="mt-3 rounded-lg border border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] px-3 py-2 text-xs text-[var(--arogya-critical-text)]">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {state.error.title}
            </p>
            <p className="mt-0.5">{state.error.message}</p>
            {state.error.hint && <p className="mt-0.5 opacity-80">{state.error.hint}</p>}
            <button
              type="button"
              onClick={() => store.dismissError()}
              className="mt-1.5 text-[11px] font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Missing configuration: real setup instructions, never a fake success */}
      {!state.configured && (
        <div className="rounded-xl border border-[#CA8A04]/45 bg-[#CA8A04]/8 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#92400E]">
            <CloudOff className="h-4 w-4" aria-hidden="true" />
            {DRIVE_SETUP_REQUIRED_MESSAGE}
          </p>
          <p className="mt-1 text-xs text-[#92400E]">
            This build has no Google OAuth client ID, so Drive export stays disabled. Local Markdown,
            JSON and print exports keep working.
          </p>

          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed break-words text-[var(--arogya-text-primary)]">
            <li>
              In the Google Cloud Console, create or select a project, then enable{' '}
              <strong>APIs &amp; Services → Library → Google Drive API</strong>.
            </li>
            <li>
              Configure <strong>OAuth consent screen</strong> (Google Auth Platform): choose{' '}
              <strong>External</strong>, set an app name and support email, and while the app is in
              testing add your own Google account under <strong>Test users</strong>.
            </li>
            <li>
              Create credentials → <strong>OAuth client ID</strong> → application type{' '}
              <strong>Web application</strong>. Under <strong>Authorized JavaScript origins</strong> add{' '}
              <span className="font-mono-tabular">http://localhost:3000</span> (and your deployed
              origin). The Google Identity Services token flow opens a popup, so{' '}
              <strong>no redirect URI is required</strong>; do not add a secret.
            </li>
            <li>
              Keep the requested scope at{' '}
              <span className="font-mono-tabular">{DRIVE_FILE_SCOPE}</span> only.
            </li>
            <li>
              Create a local env file (never committed) with{' '}
              <span className="font-mono-tabular">VITE_GOOGLE_OAUTH_CLIENT_ID=…</span> and optionally{' '}
              <span className="font-mono-tabular">VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID=…</span>. See{' '}
              <span className="font-mono-tabular">.env.example</span>. Restart{' '}
              <span className="font-mono-tabular">npm run dev</span> afterwards.
            </li>
            <li>
              Reload this page; the Connect button becomes active. Only the public client ID belongs in
              a <span className="font-mono-tabular">VITE_</span> variable — a client secret must never be
              placed there.
            </li>
          </ol>
        </div>
      )}

      {/* Report selection and explicit confirmation */}
      <div className="rounded-xl border border-[var(--arogya-border)] bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-muted)]">
          Report to export
        </h3>

        {!report || !payload ? (
          <div className="mt-2 rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-4 text-xs text-[var(--arogya-text-secondary)]">
            <p className="flex items-center gap-1.5 font-medium text-[var(--arogya-text-primary)]">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              No report selected.
            </p>
            <p className="mt-1">
              Generate a report on the Reports page, then use “Export to Drive” there so only that
              report is uploaded.
            </p>
            {onGoToReports ? (
              <button
                type="button"
                onClick={onGoToReports}
                className="mt-2 inline-flex min-h-[36px] items-center rounded-lg bg-[#1E3A5F] px-3 text-xs font-semibold text-white hover:bg-[#2D4A6F]"
              >
                Go to Reports
              </button>
            ) : (
              <Link
                to="/reports"
                className="mt-2 inline-flex min-h-[36px] items-center rounded-lg bg-[#1E3A5F] px-3 text-xs font-semibold text-white hover:bg-[#2D4A6F]"
              >
                Go to Reports
              </Link>
            )}
          </div>
        ) : (
          <>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              <div className="flex min-w-0 justify-between gap-3 border-b border-dashed border-[var(--arogya-border)] pb-1">
                <dt className="shrink-0 text-[var(--arogya-text-muted)]">Filename</dt>
                <dd className="min-w-0 truncate font-mono-tabular text-[11px] text-[var(--arogya-text-primary)]" title={payload.filename}>
                  {payload.filename}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-dashed border-[var(--arogya-border)] pb-1">
                <dt className="text-[var(--arogya-text-muted)]">Format</dt>
                <dd className="text-[var(--arogya-text-primary)]">
                  {payload.formatLabel} · {formatPayloadSize(payload.byteSize)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-dashed border-[var(--arogya-border)] pb-1">
                <dt className="text-[var(--arogya-text-muted)]">Privacy</dt>
                <dd className="flex items-center gap-1 text-right text-[var(--arogya-text-primary)]">
                  <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {payload.containsPrivateNotes ? 'Private notes included' : 'Private notes excluded'}
                </dd>
              </div>
              <div className="flex min-w-0 justify-between gap-3 border-b border-dashed border-[var(--arogya-border)] pb-1">
                <dt className="shrink-0 text-[var(--arogya-text-muted)]">Report ID</dt>
                <dd className="min-w-0 truncate font-mono-tabular text-[11px] text-[var(--arogya-text-primary)]">
                  {payload.reportId}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:col-span-2">
                <dt className="shrink-0 text-[var(--arogya-text-muted)]">Data source</dt>
                <dd className="text-right text-[var(--arogya-text-primary)]">{payload.dataSource}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Export file format">
              {(['markdown', 'json'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setFormat(option);
                    setConfirmed(false);
                  }}
                  aria-pressed={format === option}
                  className={`min-h-[36px] rounded-lg border px-3 text-xs font-medium ${
                    format === option
                      ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                      : 'border-[var(--arogya-border-strong)] bg-white text-[var(--arogya-text-secondary)]'
                  }`}
                >
                  {option === 'markdown' ? 'Markdown' : 'JSON'}
                </button>
              ))}
            </div>

            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[var(--arogya-bg)] px-3 py-2 text-[11px] text-[var(--arogya-text-secondary)]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
              <span>
                The file is created as <strong>private</strong> in your own Drive — Arogya adds no
                sharing permissions and never publishes it. {payload.privacyNote}
              </span>
            </p>

            <label className="mt-3 flex cursor-pointer items-start gap-2 break-words text-xs text-[var(--arogya-text-primary)]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={state.status !== 'connected' || state.upload.status === 'uploading'}
                className="mt-0.5 h-4 w-4 rounded border-[var(--arogya-border-strong)] accent-[#1E3A5F]"
              />
              <span>
                I confirm this single report (<span className="font-mono-tabular text-[11px]">{payload.filename}</span>)
                may be uploaded to Google Drive. Nothing uploads automatically.
              </span>
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canUpload}
                onClick={() => {
                  if (!canUpload) return;
                  void store.uploadReport({ report, astronautName, format });
                }}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white hover:bg-[#2D4A6F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.upload.status === 'uploading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <PluginUpload />
                )}
                {state.upload.status === 'uploading' ? 'Uploading report…' : 'Upload this report'}
              </button>
              {state.status !== 'connected' && (
                <span className="text-[11px] text-[var(--arogya-text-muted)]">
                  Connect Google Drive to enable the upload.
                </span>
              )}
            </div>

            {state.upload.status === 'uploaded' && (
              <div className="mt-3 rounded-lg border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] px-3 py-2 text-xs text-[var(--arogya-success-text)]">
                <p className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Uploaded {state.upload.fileName}
                </p>
                {state.upload.fileLink ? (
                  <a
                    href={state.upload.fileLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-medium underline"
                  >
                    Open in Google Drive
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-1">Drive did not return a link for this file.</p>
                )}
              </div>
            )}

            {state.upload.status === 'error' && state.upload.message && (
              <p className="mt-3 rounded-lg border border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] px-3 py-2 text-xs text-[var(--arogya-critical-text)]">
                {state.upload.message} Keep the local Markdown, JSON or print export if Drive stays
                unavailable.
              </p>
            )}
          </>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">{DRIVE_EXPORT_ONLY_NOTE}</p>
    </div>
  );
}

function PluginUpload() {
  return <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />;
}
