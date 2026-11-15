/**
 * Google Drive report export (optional integration).
 *
 * Flow: Google Identity Services token model (popup) → Drive API v3 `files.create`
 * with `uploadType=multipart`. The exported file is created privately in the
 * user's own Drive; no sharing permissions are ever added.
 *
 * Docs: https://developers.google.com/identity/oauth2/web/guides/use-token-model
 *       https://developers.google.com/workspace/drive/api/guides/manage-uploads
 *
 * Security rules enforced here:
 * - Only the public OAuth *client ID* is used. No client secret exists in the frontend.
 * - The access token lives in memory for the session only (see driveExportStore).
 * - Scope is narrowly `drive.file`: only files this app created are visible to it.
 */

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** `openid email` is requested only so the UI can show the account that actually authorized. */
export const DRIVE_REQUESTED_SCOPES = ['openid', 'email', DRIVE_FILE_SCOPE] as const;

export const DRIVE_UPLOAD_ENDPOINT =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface DriveExportConfig {
  clientId: string;
  /** Optional folder created by this app (drive.file cannot see arbitrary folders). */
  folderId: string | null;
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
  }) => { requestAccessToken: () => void };
  revoke: (accessToken: string, done: () => void) => void;
}

export interface GoogleAccountsGlobal {
  google?: { accounts?: { oauth2?: GoogleOAuth2 } };
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  scope?: string;
  expires_in?: number;
}

export type DriveAccessResult =
  | { status: 'granted'; accessToken: string; grantedScopes: string[]; expiresInSeconds: number | null }
  | { status: 'cancelled'; reason: string }
  | { status: 'error'; code: string; message: string };

/**
 * Reads the integration configuration from Vite environment variables.
 * Returns null when the OAuth client ID is absent so the UI can show
 * “Google Drive setup required.” instead of pretending to connect.
 */
export function readDriveExportConfig(
  env: Record<string, string | undefined> = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env ?? {}
): DriveExportConfig | null {
  const clientId = (env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '').trim();
  if (!clientId) return null;
  const folderId = (env.VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID ?? '').trim();
  return { clientId, folderId: folderId || null };
}

export function isGoogleIdentityAvailable(scope: GoogleAccountsGlobal = window as unknown as GoogleAccountsGlobal): boolean {
  return Boolean(scope.google?.accounts?.oauth2?.initTokenClient);
}

/** Loads the official GIS client from accounts.google.com (self-hosting is unsupported). */
export function loadGoogleIdentityScript(timeoutMs = 12_000): Promise<void> {
  if (isGoogleIdentityAvailable()) return Promise.resolve();
  if (typeof document === 'undefined') {
    return Promise.reject(new DriveExportError('script_load_failed', 'Google Identity Services is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    let settled = false;

    const finish = (error?: DriveExportError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };

    const timer = window.setTimeout(
      () => finish(new DriveExportError('script_load_failed', 'Google sign-in timed out while loading.')),
      timeoutMs
    );

    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => {
      if (isGoogleIdentityAvailable()) finish();
      else finish(new DriveExportError('script_load_failed', 'Google sign-in library loaded but is not usable.'));
    });
    script.addEventListener('error', () =>
      finish(new DriveExportError('script_load_failed', 'Google sign-in library could not be loaded.'))
    );
    script.async = true;
    script.defer = true;
    if (!existing) {
      script.src = GIS_SCRIPT_SRC;
      document.head.appendChild(script);
    }
  });
}

export class DriveExportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DriveExportError';
    this.code = code;
  }
}

type TokenClientLike = { requestAccessToken: () => void };

/**
 * Opens Google's consent popup and resolves with the outcome.
 * Never resolves as “granted” without a real access token from Google.
 */
export function requestDriveAccess(
  config: DriveExportConfig,
  options: {
    getTokenClient?: (settings: {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
      error_callback: (error: { type?: string; message?: string }) => void;
    }) => TokenClientLike;
  } = {}
): Promise<DriveAccessResult> {
  return new Promise<DriveAccessResult>((resolve) => {
    const initTokenClient =
      options.getTokenClient ??
      ((settings) => {
        const scope = window as unknown as GoogleAccountsGlobal;
        const oauth2 = scope.google?.accounts?.oauth2;
        if (!oauth2) throw new DriveExportError('script_load_failed', 'Google sign-in library is not loaded.');
        return oauth2.initTokenClient(settings);
      });

    let settled = false;
    const settle = (result: DriveAccessResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let client: TokenClientLike;
    try {
      client = initTokenClient({
        client_id: config.clientId,
        scope: DRIVE_REQUESTED_SCOPES.join(' '),
        callback: (response) => {
          if (response.error) {
            if (response.error === 'access_denied') {
              settle({
                status: 'error',
                code: 'access_denied',
                message: response.error_description ?? 'Google consent was denied.',
              });
            } else {
              settle({
                status: 'error',
                code: response.error,
                message: response.error_description ?? 'Google returned an authorization error.',
              });
            }
            return;
          }
          if (!response.access_token) {
            settle({ status: 'error', code: 'no_token', message: 'Google did not return an access token.' });
            return;
          }
          settle({
            status: 'granted',
            accessToken: response.access_token,
            grantedScopes: (response.scope ?? '').split(' ').filter(Boolean),
            expiresInSeconds: typeof response.expires_in === 'number' ? response.expires_in : null,
          });
        },
        error_callback: (error) => {
          const type = error?.type ?? 'unknown';
          if (type === 'popup_closed') {
            settle({
              status: 'cancelled',
              reason: 'The Google consent window was closed before approval was given.',
            });
            return;
          }
          settle({
            status: 'error',
            code: type,
            message: error?.message ?? 'Google sign-in was interrupted.',
          });
        },
      });
    } catch (err) {
      settle({
        status: 'error',
        code: err instanceof DriveExportError ? err.code : 'client_init_failed',
        message: err instanceof Error ? err.message : 'Google sign-in could not start.',
      });
      return;
    }

    try {
      client.requestAccessToken();
    } catch (err) {
      settle({
        status: 'error',
        code: 'popup_failed_to_open',
        message: err instanceof Error ? err.message : 'The Google consent window could not open.',
      });
    }
  });
}

/**
 * Returns the authorized account email, or null when Google did not grant
 * identity information. The UI shows an account only when this really succeeds.
 */
export async function fetchAuthorizedAccountEmail(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  try {
    const response = await fetchImpl(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { email?: unknown; email_verified?: unknown };
    if (typeof data.email !== 'string' || !data.email.includes('@')) return null;
    return data.email;
  } catch {
    return null;
  }
}

export interface DriveUploadFile {
  filename: string;
  mimeType: string;
  contents: string;
  description?: string;
  appProperties?: Record<string, string>;
}

export interface DriveUploadedFile {
  id: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
}

/** Builds the exact multipart/related body required by Drive's upload endpoint. */
export function buildMultipartBody(
  file: DriveUploadFile,
  boundary = `arogya_${Date.now().toString(36)}`,
  folderId?: string | null
): { body: string; contentType: string } {
  const metadata = {
    name: file.filename,
    mimeType: file.mimeType,
    ...(file.description ? { description: file.description } : {}),
    ...(file.appProperties ? { appProperties: file.appProperties } : {}),
    ...(folderId?.trim() ? { parents: [folderId.trim()] } : {}),
  };

  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${file.mimeType}\r\n\r\n` +
    `${file.contents}\r\n` +
    `--${boundary}--`;

  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

/**
 * Uploads exactly one report file. A 401 means the short-lived token expired:
 * the caller drops the token and asks the user to reconnect.
 */
export async function uploadReportToDrive(
  params: {
    accessToken: string;
    file: DriveUploadFile;
    folderId?: string | null;
  },
  fetchImpl: typeof fetch = fetch
): Promise<DriveUploadedFile> {
  const { body, contentType } = buildMultipartBody({
    ...params.file,
    description: params.file.description,
  }, undefined, params.folderId);

  let response: Response;
  try {
    response = await fetchImpl(DRIVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': contentType,
      },
      body,
    });
  } catch {
    throw new DriveExportError('network', 'Google Drive could not be reached. Check the connection and try again.');
  }

  if (response.status === 401) {
    throw new DriveExportError('token_expired', 'The Google authorization expired before the upload finished.');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      detail = payload.error?.message ?? '';
    } catch {
      // ignore non-JSON error bodies
    }
    const folderUnavailable = Boolean(params.folderId?.trim()) &&
      (response.status === 404 || /(?:parent|folder|permission|not found)/i.test(detail));
    throw new DriveExportError(
      folderUnavailable ? 'folder_unavailable' : 'upload_failed',
      folderUnavailable
        ? `The configured Google Drive destination folder is unavailable or inaccessible. No alternate destination was used${detail ? `: ${detail}` : '.'}`
        : `Google Drive rejected the upload (${response.status})${detail ? `: ${detail}` : '.'}`
    );
  }

  const data = (await response.json()) as { id?: string; name?: string; webViewLink?: string; mimeType?: string };
  if (!data.id) {
    throw new DriveExportError('upload_failed', 'Google Drive did not return a file identifier.');
  }

  return {
    id: data.id,
    name: data.name ?? params.file.filename,
    webViewLink: data.webViewLink ?? null,
    mimeType: data.mimeType ?? params.file.mimeType,
  };
}

/** Revokes the granted token, which also removes Arogya from the account's app list. */
export async function revokeDriveAccess(accessToken: string): Promise<void> {
  const scope = window as unknown as GoogleAccountsGlobal;
  const revoke = scope.google?.accounts?.oauth2?.revoke;
  if (!revoke) return;
  await new Promise<void>((resolve) => {
    try {
      revoke(accessToken, resolve);
    } catch {
      resolve();
    }
  });
}
