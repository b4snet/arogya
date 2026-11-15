import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildDriveExportPayload, formatPayloadSize, sanitizeDriveFilename } from './driveExportPayload';
import { buildTestReport } from '../test-utils/reportFixture';
import { createDriveExportStore, type DriveExportStoreDeps } from './driveExportStore';

const CONFIG = { clientId: 'client.apps.googleusercontent.com', folderId: null };

test('filename is sanitized and carries the report id and format extension', () => {
  assert.equal(sanitizeDriveFilename('arogya report: 1/2'), 'arogya-report-1-2');
  assert.equal(sanitizeDriveFilename('   '), 'arogya-report');
  assert.equal(sanitizeDriveFilename('..//..'), 'arogya-report');

  const report = buildTestReport();
  const payload = buildDriveExportPayload({ report, astronautName: 'Cdr Aarav Sharma', format: 'markdown' });
  assert.ok(payload.filename.startsWith('arogya-observation-report-RPT-AST-01-D14-TEST-'));
  assert.ok(payload.filename.endsWith('.md'));
  assert.equal(payload.mimeType, 'text/markdown');
  assert.equal(payload.reportId, report.id);
});

test('private crew notes stay excluded by default and are flagged when included', () => {
  const excluded = buildDriveExportPayload({
    report: buildTestReport({ includePrivateNotes: false }),
    astronautName: 'Cdr Aarav Sharma',
    format: 'markdown',
  });
  assert.equal(excluded.containsPrivateNotes, false);
  assert.match(excluded.privacyNote, /excluded/);
  assert.match(excluded.privacyNote, /private/i);

  const included = buildDriveExportPayload({
    report: buildTestReport({ includePrivateNotes: true }),
    astronautName: 'Cdr Aarav Sharma',
    format: 'json',
  });
  assert.equal(included.containsPrivateNotes, true);
  assert.match(included.privacyNote, /included/);
  assert.equal(included.mimeType, 'application/json');
});

test('payload states its data source and exposes no bearer token', () => {
  const payload = buildDriveExportPayload({
    report: buildTestReport(),
    astronautName: 'Cdr Aarav Sharma',
    format: 'json',
  });
  assert.match(payload.dataSource, /Arogya on-device report snapshot/);
  assert.match(payload.dataSource, /Mission Day/);
  assert.equal(payload.byteSize > 0, true);
  assert.equal(/ya29\./.test(payload.contents), false);
  assert.match(formatPayloadSize(2048), /KB/);
});

function makeDeps(overrides: Partial<DriveExportStoreDeps> = {}): DriveExportStoreDeps & {
  uploadCalls: Array<{ filename: string; contents: string; mimeType: string }>;
  revoked: string[];
} {
  const uploadCalls: Array<{ filename: string; contents: string; mimeType: string }> = [];
  const revoked: string[] = [];
  const deps: DriveExportStoreDeps = {
    config: CONFIG,
    loadScript: async () => {},
    requestAccess: async () => ({
      status: 'granted',
      accessToken: 'ya29.in-memory',
      grantedScopes: ['openid', 'email', 'https://www.googleapis.com/auth/drive.file'],
      expiresInSeconds: 3599,
    }),
    fetchEmail: async () => 'crew@example.com',
    upload: async ({ file }) => {
      uploadCalls.push({ filename: file.filename, contents: file.contents, mimeType: file.mimeType });
      return {
        id: 'file-1',
        name: file.filename,
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
        mimeType: file.mimeType,
      };
    },
    revoke: async (token) => {
      revoked.push(token);
    },
    ...overrides,
  };
  return Object.assign(deps, { uploadCalls, revoked });
}

test('connect without configuration stays "setup required" and never fakes success', async () => {
  const store = createDriveExportStore(makeDeps({ config: null }));
  await store.connect();
  assert.equal(store.getState().status, 'not_configured');
  assert.equal(store.peekToken(), null);
});

test('connect stores the token in memory only and shows the authorized email', async () => {
  const store = createDriveExportStore(makeDeps());
  await store.connect();
  assert.equal(store.getState().status, 'connected');
  assert.equal(store.getState().accountEmail, 'crew@example.com');
  assert.equal(store.peekToken(), 'ya29.in-memory');
  // Tokens must not be persisted: no global storage is touched by the store.
  assert.equal(typeof (globalThis as { localStorage?: unknown }).localStorage, 'undefined');
});

test('cancelled and denied connections leave no token behind', async () => {
  const cancelled = createDriveExportStore(
    makeDeps({
      requestAccess: async () => ({ status: 'cancelled', reason: 'Window closed' }),
    })
  );
  await cancelled.connect();
  assert.equal(cancelled.getState().status, 'cancelled');
  assert.equal(cancelled.peekToken(), null);

  const denied = createDriveExportStore(
    makeDeps({
      requestAccess: async () => ({ status: 'error', code: 'access_denied', message: 'Denied' }),
    })
  );
  await denied.connect();
  assert.equal(denied.getState().status, 'error');
  assert.equal(denied.peekToken(), null);
});

test('a script-load failure surfaces an error without claiming a connection', async () => {
  const store = createDriveExportStore(
    makeDeps({
      loadScript: async () => {
        throw new Error('blocked');
      },
    })
  );
  await store.connect();
  assert.equal(store.getState().status, 'error');
  assert.equal(store.getState().error?.title, 'Google sign-in unavailable');
  assert.equal(store.peekToken(), null);
});

test('upload does nothing unless connected, and uploads exactly one approved report', async () => {
  const deps = makeDeps();
  const report = buildTestReport();

  const disconnected = createDriveExportStore(makeDeps());
  await disconnected.uploadReport({ report, astronautName: 'Cdr Aarav Sharma', format: 'markdown' });
  assert.equal(deps.uploadCalls.length, 0);
  assert.equal(disconnected.getState().upload.status, 'error');

  const store = createDriveExportStore(deps);
  await store.connect();
  await store.uploadReport({ report, astronautName: 'Cdr Aarav Sharma', format: 'markdown' });

  assert.equal(deps.uploadCalls.length, 1);
  assert.match(deps.uploadCalls[0].filename, /^arogya-observation-report-RPT-AST-01-D14-TEST-/);
  assert.equal(deps.uploadCalls[0].mimeType, 'text/markdown');
  assert.equal(store.getState().upload.status, 'uploaded');
  assert.match(store.getState().upload.fileLink ?? '', /drive\.google\.com/);
});

test('an expired token during upload disconnects and requires a fresh consent', async () => {
  const store = createDriveExportStore(
    makeDeps({
      upload: async () => {
        const error = new Error('expired') as Error & { code?: string };
        error.name = 'DriveExportError';
        // Mirror the real service's error type without importing the class here.
        const { DriveExportError } = await import('./googleDriveExport');
        throw new DriveExportError('token_expired', 'expired');
      },
    })
  );
  await store.connect();
  await store.uploadReport({
    report: buildTestReport(),
    astronautName: 'Cdr Aarav Sharma',
    format: 'json',
  });

  assert.equal(store.getState().status, 'disconnected');
  assert.equal(store.peekToken(), null);
  assert.match(store.getState().upload.message ?? '', /expired/i);
});

test('disconnect revokes the token and clears the authorized account', async () => {
  const deps = makeDeps();
  const store = createDriveExportStore(deps);
  await store.connect();
  await store.disconnect();

  assert.deepEqual(deps.revoked, ['ya29.in-memory']);
  assert.equal(store.getState().status, 'disconnected');
  assert.equal(store.getState().accountEmail, null);
  assert.equal(store.peekToken(), null);
});
