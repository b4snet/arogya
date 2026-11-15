/**
 * Connection/export state machine for the optional Google Drive report export.
 * Pure and framework-free so every state transition is unit-testable.
 */

export type DriveAuthStatus =
  | 'not_configured'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'cancelled'
  | 'error';

export type DriveUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export interface DriveErrorInfo {
  code: string;
  title: string;
  message: string;
  hint?: string;
}

export interface DriveUploadInfo {
  status: DriveUploadStatus;
  fileName: string | null;
  fileLink: string | null;
  message: string | null;
}

export interface DriveExportState {
  configured: boolean;
  status: DriveAuthStatus;
  /** Only ever set from Google's own userinfo response for the granted token. */
  accountEmail: string | null;
  cancelReason: string | null;
  error: DriveErrorInfo | null;
  upload: DriveUploadInfo;
}

/** Labels for the five required connection states. */
export const DRIVE_STATUS_LABELS: Record<DriveAuthStatus, string> = {
  not_configured: 'Not configured',
  disconnected: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  cancelled: 'Cancelled',
  error: 'Error',
};

export const DRIVE_SETUP_REQUIRED_MESSAGE = 'Google Drive setup required.';
export const DRIVE_EXPORT_ONLY_NOTE =
  'This is a one-time report export, not a live sync. Arogya uploads only the report you approve.';

const EMPTY_UPLOAD: DriveUploadInfo = {
  status: 'idle',
  fileName: null,
  fileLink: null,
  message: null,
};

export function initialDriveExportState(configured: boolean): DriveExportState {
  return {
    configured,
    status: configured ? 'disconnected' : 'not_configured',
    accountEmail: null,
    cancelReason: null,
    error: null,
    upload: { ...EMPTY_UPLOAD },
  };
}

/** Maps a Google/OAuth failure code to user-facing copy. */
export function describeDriveFailure(code: string, fallbackMessage?: string): DriveErrorInfo {
  switch (code) {
    case 'access_denied':
      return {
        code,
        title: 'Consent denied',
        message: 'Google sign-in was denied, so nothing was uploaded to Drive.',
        hint: 'Choose the Google account you want to authorize and approve the “drive.file” permission.',
      };
    case 'popup_failed_to_open':
      return {
        code,
        title: 'Popup blocked',
        message: 'The Google consent window could not open.',
        hint: 'Allow popups for this site in your browser, then try connecting again.',
      };
    case 'popup_closed':
      return {
        code,
        title: 'Consent window closed',
        message: 'The Google consent window was closed before approval was given.',
        hint: 'Reconnect and finish the Google prompt to export a report.',
      };
    case 'script_load_failed':
      return {
        code,
        title: 'Google sign-in unavailable',
        message: fallbackMessage ?? 'The Google Identity Services library could not be loaded.',
        hint: 'Check the network connection or content blockers, then reload the page.',
      };
    case 'network':
      return {
        code,
        title: 'Network error',
        message: fallbackMessage ?? 'Google Drive could not be reached.',
        hint: 'The report is still available as a local download.',
      };
    case 'token_expired':
      return {
        code,
        title: 'Authorization expired',
        message: 'The Drive authorization expired, so the upload did not complete.',
        hint: 'Reconnect to Google Drive and confirm the export again.',
      };
    case 'not_configured':
      return {
        code,
        title: DRIVE_SETUP_REQUIRED_MESSAGE,
        message: 'No Google OAuth client ID is configured for this build.',
        hint: 'Follow the setup steps, add VITE_GOOGLE_OAUTH_CLIENT_ID, then restart the dev server.',
      };
    case 'upload_failed':
      return {
        code,
        title: 'Upload failed',
        message: fallbackMessage ?? 'Google Drive rejected the upload.',
        hint: 'Retry, or keep the local download if Drive stays unavailable.',
      };
    default:
      return {
        code,
        title: 'Connection error',
        message: fallbackMessage ?? 'Google Drive returned an unexpected error.',
        hint: 'Retry the connection. Local downloads keep working.',
      };
  }
}

export type DriveExportAction =
  | { type: 'configured'; configured: boolean }
  | { type: 'connect_request' }
  | { type: 'connect_granted'; accountEmail: string | null }
  | { type: 'connect_cancelled'; reason: string }
  | { type: 'connect_failed'; code: string; message?: string }
  | { type: 'disconnect' }
  | { type: 'dismiss_error' }
  | { type: 'upload_request'; fileName: string }
  | { type: 'upload_succeeded'; fileName: string; fileLink: string | null }
  | { type: 'upload_failed'; code: string; message?: string }
  | { type: 'upload_cleared' };

export function driveExportReducer(
  state: DriveExportState,
  action: DriveExportAction
): DriveExportState {
  switch (action.type) {
    case 'configured':
      if (action.configured === state.configured) return state;
      return action.configured
        ? { ...initialDriveExportState(true), accountEmail: state.accountEmail }
        : initialDriveExportState(false);

    case 'connect_request':
      if (!state.configured) {
        return { ...state, status: 'not_configured', error: describeDriveFailure('not_configured') };
      }
      return {
        ...state,
        status: 'connecting',
        error: null,
        cancelReason: null,
        upload: { ...EMPTY_UPLOAD },
      };

    case 'connect_granted':
      return {
        ...state,
        status: 'connected',
        accountEmail: action.accountEmail,
        error: null,
        cancelReason: null,
      };

    case 'connect_cancelled':
      return {
        ...state,
        status: 'cancelled',
        accountEmail: null,
        error: null,
        cancelReason: action.reason,
        upload: { ...EMPTY_UPLOAD },
      };

    case 'connect_failed':
      // Missing configuration is a setup problem, not a connection error.
      if (action.code === 'not_configured') {
        return {
          ...state,
          status: 'not_configured',
          accountEmail: null,
          error: describeDriveFailure('not_configured'),
        };
      }
      // A closed popup is a cancellation, not an error, even if it arrives as a failure.
      if (action.code === 'popup_closed') {
        return driveExportReducer(state, {
          type: 'connect_cancelled',
          reason: 'The Google consent window was closed before approval was given.',
        });
      }
      return {
        ...state,
        status: 'error',
        accountEmail: null,
        error: describeDriveFailure(action.code, action.message),
      };

    case 'disconnect':
      return {
        ...state,
        status: state.configured ? 'disconnected' : 'not_configured',
        accountEmail: null,
        cancelReason: null,
        error: null,
        upload: { ...EMPTY_UPLOAD },
      };

    case 'dismiss_error':
      return {
        ...state,
        error: null,
        status:
          state.status === 'error'
            ? state.configured
              ? 'disconnected'
              : 'not_configured'
            : state.status,
      };

    case 'upload_request':
      if (state.status !== 'connected') {
        return {
          ...state,
          upload: {
            status: 'error',
            fileName: action.fileName,
            fileLink: null,
            message: 'Connect Google Drive before uploading a report.',
          },
          error: describeDriveFailure('not_connected'),
        };
      }
      return {
        ...state,
        error: null,
        upload: { status: 'uploading', fileName: action.fileName, fileLink: null, message: null },
      };

    case 'upload_succeeded':
      return {
        ...state,
        upload: {
          status: 'uploaded',
          fileName: action.fileName,
          fileLink: action.fileLink,
          message: null,
        },
      };

    case 'upload_failed':
      if (action.code === 'token_expired') {
        return {
          ...state,
          status: 'disconnected',
          accountEmail: null,
          upload: {
            status: 'error',
            fileName: state.upload.fileName,
            fileLink: null,
            message: 'Authorization expired before the upload finished.',
          },
          error: describeDriveFailure('token_expired'),
        };
      }
      return {
        ...state,
        upload: {
          status: 'error',
          fileName: state.upload.fileName,
          fileLink: null,
          message: action.message ?? 'The upload did not complete.',
        },
        error: describeDriveFailure(action.code, action.message),
      };

    case 'upload_cleared':
      return { ...state, upload: { ...EMPTY_UPLOAD } };

    default:
      return state;
  }
}
