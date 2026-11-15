import { useSyncExternalStore } from 'react';
import {
  DriveExportError,
  fetchAuthorizedAccountEmail,
  loadGoogleIdentityScript,
  readDriveExportConfig,
  requestDriveAccess,
  revokeDriveAccess,
  uploadReportToDrive,
  type DriveExportConfig,
} from './googleDriveExport';
import { buildDriveExportPayload, type DriveExportFileFormat } from './driveExportPayload';
import {
  driveExportReducer,
  initialDriveExportState,
  type DriveExportState,
} from './driveExportState';
import type { Report } from '../types';

export interface DriveExportStoreDeps {
  config: DriveExportConfig | null;
  loadScript: () => Promise<void>;
  requestAccess: (config: DriveExportConfig) => ReturnType<typeof requestDriveAccess>;
  fetchEmail: (accessToken: string) => Promise<string | null>;
  upload: typeof uploadReportToDrive;
  revoke: (accessToken: string) => Promise<void>;
}

function defaultDeps(): DriveExportStoreDeps {
  return {
    config: readDriveExportConfig(),
    loadScript: () => loadGoogleIdentityScript(),
    requestAccess: (config) => requestDriveAccess(config),
    fetchEmail: (accessToken) => fetchAuthorizedAccountEmail(accessToken),
    upload: uploadReportToDrive,
    revoke: revokeDriveAccess,
  };
}

/**
 * Module-level store for the Drive export.
 *
 * The access token is held in memory only: it is never written to localStorage,
 * sessionStorage or IndexedDB, and it disappears when the page is reloaded.
 */
export function createDriveExportStore(deps: DriveExportStoreDeps = defaultDeps()) {
  let state: DriveExportState = initialDriveExportState(Boolean(deps.config));
  let accessToken: string | null = null;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  const setState = (next: DriveExportState) => {
    if (next === state) return;
    state = next;
    emit();
  };

  const dispatch = (action: Parameters<typeof driveExportReducer>[1]) =>
    setState(driveExportReducer(state, action));

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState(): DriveExportState {
      return state;
    },

    isConfigured(): boolean {
      return Boolean(deps.config);
    },

    /** Current token for tests/diagnostics; never persisted. */
    peekToken(): string | null {
      return accessToken;
    },

    async connect(): Promise<void> {
      if (!deps.config) {
        dispatch({ type: 'configured', configured: false });
        dispatch({ type: 'connect_failed', code: 'not_configured' });
        return;
      }

      dispatch({ type: 'connect_request' });

      try {
        await deps.loadScript();
      } catch (err) {
        dispatch({
          type: 'connect_failed',
          code: err instanceof DriveExportError ? err.code : 'script_load_failed',
          message: err instanceof Error ? err.message : undefined,
        });
        return;
      }

      const result = await deps.requestAccess(deps.config);
      if (result.status === 'cancelled') {
        dispatch({ type: 'connect_cancelled', reason: result.reason });
        return;
      }
      if (result.status === 'error') {
        dispatch({ type: 'connect_failed', code: result.code, message: result.message });
        return;
      }

      accessToken = result.accessToken;
      const email = await deps.fetchEmail(result.accessToken);
      // Re-check the token: the user may have disconnected while userinfo was in flight.
      if (accessToken !== result.accessToken) return;
      dispatch({ type: 'connect_granted', accountEmail: email });
    },

    async disconnect(): Promise<void> {
      const token = accessToken;
      accessToken = null;
      dispatch({ type: 'disconnect' });
      if (token) await deps.revoke(token);
    },

    dismissError(): void {
      dispatch({ type: 'dismiss_error' });
    },

    clearUpload(): void {
      dispatch({ type: 'upload_cleared' });
    },

    /**
     * Uploads exactly one report, only after the caller has explicit confirmation.
     * Never retries automatically and never uploads in the background.
     */
    async uploadReport(params: {
      report: Report;
      astronautName: string;
      format: DriveExportFileFormat;
    }): Promise<void> {
      const payload = buildDriveExportPayload(params);
      const token = accessToken;
      if (!token) {
        dispatch({ type: 'upload_request', fileName: payload.filename });
        return;
      }

      dispatch({ type: 'upload_request', fileName: payload.filename });

      try {
        const uploaded = await deps.upload(
          {
            accessToken: token,
            file: {
              filename: payload.filename,
              mimeType: payload.mimeType,
              contents: payload.contents,
              description: `Arogya observation report ${payload.reportId}. ${payload.privacyNote} Exported ${new Date().toISOString()}.`,
              appProperties: {
                arogyaReportId: payload.reportId,
                arogyaSource: 'arogya-observation-report',
              },
            },
            folderId: deps.config?.folderId ?? null,
          },
          typeof fetch !== 'undefined' ? fetch : (undefined as unknown as typeof fetch)
        );
        dispatch({
          type: 'upload_succeeded',
          fileName: uploaded.name,
          fileLink: uploaded.webViewLink,
        });
      } catch (err) {
        const code = err instanceof DriveExportError ? err.code : 'upload_failed';
        if (code === 'token_expired') accessToken = null;
        dispatch({
          type: 'upload_failed',
          code,
          message: err instanceof Error ? err.message : undefined,
        });
      }
    },
  };
}

export type DriveExportStore = ReturnType<typeof createDriveExportStore>;

let sharedStore: DriveExportStore | null = null;

export function getDriveExportStore(): DriveExportStore {
  if (!sharedStore) sharedStore = createDriveExportStore();
  return sharedStore;
}

/** React binding: every panel sees the same in-memory connection and upload state. */
export function useDriveExportState(): DriveExportState {
  const store = getDriveExportStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
