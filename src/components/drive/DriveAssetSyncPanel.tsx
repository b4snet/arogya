import { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileBox,
  FileText,
  Film,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useArogyaStore } from '../../store/useArogyaStore';
import { getAccessToken, googleSignIn, logoutGoogle } from '../../services/firebaseAuth';
import { AROGYA_DRIVE_FOLDER_ID, syncAllDriveFolderAssets } from '../../services/driveAssetService';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Mission media cache: the existing read-only Drive folder download into IndexedDB.
 * Unrelated to report export, which uses its own narrow `drive.file` consent.
 */
export function DriveAssetSyncPanel() {
  const driveAssets = useArogyaStore((s) => s.driveAssets);
  const driveUserEmail = useArogyaStore((s) => s.driveUserEmail);
  const driveSyncStatus = useArogyaStore((s) => s.driveSyncStatus);
  const driveSyncProgress = useArogyaStore((s) => s.driveSyncProgress);
  const driveSyncError = useArogyaStore((s) => s.driveSyncError);
  const setDriveAuthState = useArogyaStore((s) => s.setDriveAuthState);
  const setDriveSyncState = useArogyaStore((s) => s.setDriveSyncState);
  const setDriveAssets = useArogyaStore((s) => s.setDriveAssets);
  const clearDriveCache = useArogyaStore((s) => s.clearDriveCache);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const runSync = async (token: string) => {
    setDriveSyncState('syncing', 'Listing Drive folder contents...', null);
    try {
      const items = await syncAllDriveFolderAssets(token, (loaded, total, name) => {
        setDriveSyncState(
          'syncing',
          `Downloading ${loaded + 1}/${Math.max(total, 1)}: ${name}`,
          null
        );
      });
      setDriveAssets(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sync Google Drive assets.';
      setDriveSyncState('error', '', msg);
    }
  };

  const handleGoogleSignInAndSync = async () => {
    setIsLoggingIn(true);
    setDriveSyncState('syncing', 'Authenticating with Google...', null);
    try {
      const res = await googleSignIn();
      if (res) {
        setDriveAuthState(false, res.user.email);
        await runSync(res.accessToken);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setDriveSyncState('error', '', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResync = async () => {
    const token = getAccessToken();
    if (!token) {
      await handleGoogleSignInAndSync();
      return;
    }
    await runSync(token);
  };

  const handleClear = async () => {
    await clearDriveCache();
    await logoutGoogle();
    setDriveAuthState(true, null);
  };

  const roleIcon = (role: string) => {
    if (role === 'dashboard_video') return <Film className="h-4 w-4 text-[var(--arogya-info)]" />;
    if (role.endsWith('_model')) return <FileBox className="h-4 w-4 text-red-400" />;
    if (role === 'image_asset') return <ImageIcon className="h-4 w-4 text-amber-400" />;
    return <FileText className="h-4 w-4 text-[var(--arogya-text-secondary)]" />;
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--arogya-text-muted)]">
        Read-only cache of mission media from folder{' '}
        <span className="font-mono-tabular text-[var(--arogya-text-secondary)]">
          {AROGYA_DRIVE_FOLDER_ID}
        </span>{' '}
        (3D models, dashboard video, supplementary files) into offline IndexedDB storage.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-4">
        <div>
          <p className="text-sm font-medium text-[var(--arogya-text-primary)]">
            {driveUserEmail ? `Connected as ${driveUserEmail}` : 'Google Drive Read-Only Access'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--arogya-text-muted)]">
            {driveAssets.length > 0
              ? `${driveAssets.length} file(s) cached locally for offline playback.`
              : 'Sign in with Google to download and cache all files from the shared folder.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!getAccessToken() ? (
            <button
              type="button"
              onClick={handleGoogleSignInAndSync}
              disabled={isLoggingIn || driveSyncStatus === 'syncing'}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span>Sign in with Google</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResync}
              disabled={driveSyncStatus === 'syncing'}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white hover:bg-[#2D4A6F]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-sync Folder</span>
            </button>
          )}

          {driveAssets.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] px-3 text-xs font-medium text-[var(--arogya-critical-text)] hover:bg-[#FECACA]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Cache</span>
            </button>
          )}
        </div>
      </div>

      {driveSyncStatus === 'syncing' && (
        <div className="rounded-lg border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-4 py-3 text-xs text-[var(--arogya-info)]">
          {driveSyncProgress || 'Syncing assets from Google Drive...'}
        </div>
      )}

      {driveSyncError && (
        <div className="rounded-lg border border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] px-4 py-3 text-xs text-[var(--arogya-critical-text)]">
          {driveSyncError}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-muted)]">
            Synced Drive Folder Files
          </h3>
          <a
            href={`https://drive.google.com/drive/folders/${AROGYA_DRIVE_FOLDER_ID}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--arogya-info)] hover:text-[#1E3A5F]"
          >
            <span>Open Drive Folder</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {driveAssets.length === 0 ? (
          <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-6 text-center text-xs text-[var(--arogya-text-muted)]">
            No Drive files cached yet. Procedural Three.js 3D models and fallback deep-space backdrop
            remain active offline.
          </div>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)]">
            {driveAssets.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 shrink-0">{roleIcon(item.role)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--arogya-text-primary)]">{item.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--arogya-text-muted)]">
                      <span className="capitalize">{item.role.replace('_', ' ')}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{formatBytes(item.sizeBytes)}</span>
                    </p>
                    {item.textPreview && (
                      <pre className="mt-2 max-h-24 overflow-y-auto rounded bg-[var(--arogya-bg)] p-2 text-[11px] text-[var(--arogya-text-secondary)] whitespace-pre-wrap">
                        {item.textPreview}
                      </pre>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--arogya-info)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Cached</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
