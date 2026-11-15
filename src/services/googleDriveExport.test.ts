import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  DriveExportError,
  DRIVE_REQUESTED_SCOPES,
  buildMultipartBody,
  fetchAuthorizedAccountEmail,
  readDriveExportConfig,
  requestDriveAccess,
  uploadReportToDrive,
  type DriveExportConfig,
} from './googleDriveExport';

const CONFIG: DriveExportConfig = { clientId: 'test-client-id.apps.googleusercontent.com', folderId: null };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('configuration is only considered present when a client ID is set', () => {
  assert.equal(readDriveExportConfig({}), null);
  assert.equal(readDriveExportConfig({ VITE_GOOGLE_OAUTH_CLIENT_ID: '   ' }), null);
  assert.deepEqual(readDriveExportConfig({ VITE_GOOGLE_OAUTH_CLIENT_ID: 'abc' }), {
    clientId: 'abc',
    folderId: null,
  });
  assert.deepEqual(
    readDriveExportConfig({ VITE_GOOGLE_OAUTH_CLIENT_ID: 'abc', VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID: ' folder ' }),
    { clientId: 'abc', folderId: 'folder' }
  );
});

test('only the narrow drive.file scope plus identity scopes are requested', () => {
  const scopes: readonly string[] = DRIVE_REQUESTED_SCOPES;
  assert.ok(scopes.includes('https://www.googleapis.com/auth/drive.file'));
  assert.equal(scopes.includes('https://www.googleapis.com/auth/drive'), false);
  assert.equal(scopes.includes('https://www.googleapis.com/auth/drive.readonly'), false);
});

test('a granted consent yields a real token, and denials are reported as such', async () => {
  const granted = await requestDriveAccess(CONFIG, {
    getTokenClient: (settings) => ({
      requestAccessToken: () =>
        settings.callback({
          access_token: 'ya29.token',
          scope: 'openid email https://www.googleapis.com/auth/drive.file',
          expires_in: 3599,
        }),
    }),
  });
  assert.equal(granted.status, 'granted');
  if (granted.status !== 'granted') throw new Error('expected grant');
  assert.equal(granted.accessToken, 'ya29.token');
  assert.equal(granted.expiresInSeconds, 3599);

  const denied = await requestDriveAccess(CONFIG, {
    getTokenClient: (settings) => ({
      requestAccessToken: () => settings.callback({ error: 'access_denied' }),
    }),
  });
  assert.equal(denied.status, 'error');
  if (denied.status !== 'error') throw new Error('expected error');
  assert.equal(denied.code, 'access_denied');
});

test('a closed popup is cancelled and a blocked popup is an error', async () => {
  const closed = await requestDriveAccess(CONFIG, {
    getTokenClient: (settings) => ({
      requestAccessToken: () => settings.error_callback({ type: 'popup_closed' }),
    }),
  });
  assert.equal(closed.status, 'cancelled');

  const blocked = await requestDriveAccess(CONFIG, {
    getTokenClient: (settings) => ({
      requestAccessToken: () => settings.error_callback({ type: 'popup_failed_to_open' }),
    }),
  });
  assert.equal(blocked.status, 'error');
  if (blocked.status !== 'error') throw new Error('expected error');
  assert.equal(blocked.code, 'popup_failed_to_open');
});

test('a token response without an access token never counts as connected', async () => {
  const result = await requestDriveAccess(CONFIG, {
    getTokenClient: (settings) => ({ requestAccessToken: () => settings.callback({}) }),
  });
  assert.equal(result.status, 'error');
});

test('the account email is only returned when Google actually provides it', async () => {
  const ok = await fetchAuthorizedAccountEmail('token', async () =>
    jsonResponse({ email: 'crew@example.com', email_verified: true })
  );
  assert.equal(ok, 'crew@example.com');

  const forbidden = await fetchAuthorizedAccountEmail('token', async () => jsonResponse({}, 403));
  assert.equal(forbidden, null);

  const malformed = await fetchAuthorizedAccountEmail('token', async () => jsonResponse({ email: 42 }));
  assert.equal(malformed, null);

  const threw = await fetchAuthorizedAccountEmail('token', async () => {
    throw new Error('offline');
  });
  assert.equal(threw, null);
});

test('the multipart body carries metadata first, media second, and one boundary', () => {
  const { body, contentType } = buildMultipartBody(
    {
      filename: 'arogya-report.md',
      mimeType: 'text/markdown',
      contents: '# Report',
      description: 'demo',
    },
    'BOUNDARY'
  );

  assert.equal(contentType, 'multipart/related; boundary=BOUNDARY');
  assert.ok(body.startsWith('--BOUNDARY\r\nContent-Type: application/json; charset=UTF-8'));
  assert.ok(body.indexOf('application/json') < body.indexOf('text/markdown'));
  assert.ok(body.includes('"name":"arogya-report.md"'));
  assert.ok(body.includes('# Report'));
  assert.ok(body.endsWith('--BOUNDARY--'));
  assert.equal(body.split('--BOUNDARY').length, 4);
});

test('multipart metadata includes only an explicitly configured Drive parent', () => {
  const file = { filename: 'report.json', mimeType: 'application/json', contents: '{}' };
  const configured = buildMultipartBody(file, 'CONFIGURED', ' folder-123 ');
  const unconfigured = buildMultipartBody(file, 'ROOT', null);
  const metadata = configured.body.split('Content-Type: application/json; charset=UTF-8\r\n\r\n')[1].split('\r\n--CONFIGURED')[0];
  const rootMetadata = unconfigured.body.split('Content-Type: application/json; charset=UTF-8\r\n\r\n')[1].split('\r\n--ROOT')[0];
  assert.deepEqual(JSON.parse(metadata).parents, ['folder-123']);
  assert.equal('parents' in JSON.parse(rootMetadata), false);
});

test('upload posts one file to the Drive upload endpoint with the bearer token', async () => {
  let capturedUrl: string | Request | undefined;
  let capturedInit: RequestInit | undefined;

  const uploaded = await uploadReportToDrive(
    {
      accessToken: 'ya29.token',
      file: { filename: 'arogya-report.md', mimeType: 'text/markdown', contents: '# Report' },
    },
    (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url as string;
      capturedInit = init;
      return jsonResponse({
        id: 'file-123',
        name: 'arogya-report.md',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
        mimeType: 'text/markdown',
      });
    }) as typeof fetch
  );

  assert.equal(uploaded.id, 'file-123');
  assert.equal(uploaded.webViewLink, 'https://drive.google.com/file/d/file-123/view');
  assert.match(String(capturedUrl), /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?uploadType=multipart/);
  assert.match(String(capturedUrl), /fields=id/, 'must request the returned file link');
  const headers = (capturedInit?.headers ?? {}) as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer ya29.token');
  assert.match(headers['Content-Type'], /^multipart\/related; boundary=/);
});

test('an expired token and a rejected upload map to distinct error codes', async () => {
  await assert.rejects(
    () =>
      uploadReportToDrive(
        { accessToken: 't', file: { filename: 'r.md', mimeType: 'text/markdown', contents: 'x' } },
        (async () => jsonResponse({}, 401)) as typeof fetch
      ),
    (err: unknown) => err instanceof DriveExportError && err.code === 'token_expired'
  );

  await assert.rejects(
    () =>
      uploadReportToDrive(
        { accessToken: 't', file: { filename: 'r.md', mimeType: 'text/markdown', contents: 'x' } },
        (async () => jsonResponse({ error: { message: 'insufficientFilePermissions' } }, 403)) as typeof fetch
      ),
    (err: unknown) =>
      err instanceof DriveExportError &&
      err.code === 'upload_failed' &&
      /403/.test(err.message) &&
      /insufficientFilePermissions/.test(err.message)
  );

  await assert.rejects(
    () =>
      uploadReportToDrive(
        { accessToken: 't', file: { filename: 'r.md', mimeType: 'text/markdown', contents: 'x' } },
        (async () => {
          throw new Error('offline');
        }) as typeof fetch
      ),
    (err: unknown) => err instanceof DriveExportError && err.code === 'network'
  );

  await assert.rejects(
    () =>
      uploadReportToDrive(
        { accessToken: 't', file: { filename: 'r.md', mimeType: 'text/markdown', contents: 'x' } },
        (async () => jsonResponse({ name: 'no-id' })) as typeof fetch
      ),
    (err: unknown) => err instanceof DriveExportError && err.code === 'upload_failed'
  );
});

test('a configured but inaccessible folder fails clearly without retrying to Drive root', async () => {
  let calls = 0;
  await assert.rejects(
    () => uploadReportToDrive(
      { accessToken: 't', folderId: 'configured-folder', file: { filename: 'r.md', mimeType: 'text/markdown', contents: 'x' } },
      (async () => { calls += 1; return jsonResponse({ error: { message: 'File not found: parent folder' } }, 404); }) as typeof fetch
    ),
    (err: unknown) => err instanceof DriveExportError && err.code === 'folder_unavailable' && /No alternate destination/.test(err.message)
  );
  assert.equal(calls, 1);
});
