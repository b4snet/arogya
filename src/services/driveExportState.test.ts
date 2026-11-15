import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  DRIVE_SETUP_REQUIRED_MESSAGE,
  DRIVE_STATUS_LABELS,
  describeDriveFailure,
  driveExportReducer,
  initialDriveExportState,
  type DriveExportState,
} from './driveExportState';

function connect(state: DriveExportState): DriveExportState {
  return driveExportReducer(state, { type: 'connect_request' });
}

test('all five required connection states have labels', () => {
  for (const state of ['disconnected', 'connecting', 'connected', 'cancelled', 'error'] as const) {
    assert.ok(DRIVE_STATUS_LABELS[state].length > 0);
  }
  assert.equal(DRIVE_STATUS_LABELS.disconnected, 'Not connected');
  assert.equal(DRIVE_STATUS_LABELS.connected, 'Connected');
  assert.equal(DRIVE_STATUS_LABELS.cancelled, 'Cancelled');
  assert.equal(DRIVE_STATUS_LABELS.error, 'Error');
  assert.equal(DRIVE_STATUS_LABELS.connecting, 'Connecting');
});

test('missing configuration reports "Google Drive setup required." and blocks connecting', () => {
  const initial = initialDriveExportState(false);
  assert.equal(initial.status, 'not_configured');
  assert.equal(DRIVE_SETUP_REQUIRED_MESSAGE, 'Google Drive setup required.');

  const attempted = connect(initial);
  assert.equal(attempted.status, 'not_configured');
  assert.equal(attempted.error?.title, DRIVE_SETUP_REQUIRED_MESSAGE);
  assert.match(attempted.error?.hint ?? '', /VITE_GOOGLE_OAUTH_CLIENT_ID/);
});

test('connecting → connected only carries the account Google actually returned', () => {
  const connecting = connect(initialDriveExportState(true));
  assert.equal(connecting.status, 'connecting');

  const connected = driveExportReducer(connecting, {
    type: 'connect_granted',
    accountEmail: 'crew@example.com',
  });
  assert.equal(connected.status, 'connected');
  assert.equal(connected.accountEmail, 'crew@example.com');
  assert.equal(connected.error, null);

  const anonymous = driveExportReducer(connecting, { type: 'connect_granted', accountEmail: null });
  assert.equal(anonymous.status, 'connected');
  assert.equal(anonymous.accountEmail, null);
});

test('closing the consent popup is a cancellation, not an error', () => {
  const cancelled = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'connect_cancelled',
    reason: 'Closed',
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.accountEmail, null);

  const asFailure = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'connect_failed',
    code: 'popup_closed',
  });
  assert.equal(asFailure.status, 'cancelled');
  assert.equal(asFailure.error, null);
});

test('denied consent and blocked popups produce distinct actionable errors', () => {
  const denied = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'connect_failed',
    code: 'access_denied',
  });
  assert.equal(denied.status, 'error');
  assert.equal(denied.error?.title, 'Consent denied');
  assert.match(denied.error?.message ?? '', /nothing was uploaded/i);

  const blocked = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'connect_failed',
    code: 'popup_failed_to_open',
  });
  assert.equal(blocked.status, 'error');
  assert.equal(blocked.error?.title, 'Popup blocked');
  assert.match(blocked.error?.hint ?? '', /popup/i);
});

test('expired authorization during upload disconnects and explains why', () => {
  const connected = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'connect_granted',
    accountEmail: 'crew@example.com',
  });
  const uploading = driveExportReducer(connected, {
    type: 'upload_request',
    fileName: 'arogya-report.md',
  });
  assert.equal(uploading.upload.status, 'uploading');

  const expired = driveExportReducer(uploading, {
    type: 'upload_failed',
    code: 'token_expired',
    message: 'expired',
  });
  assert.equal(expired.status, 'disconnected');
  assert.equal(expired.accountEmail, null);
  assert.equal(expired.upload.status, 'error');
  assert.equal(expired.error?.title, 'Authorization expired');
});

test('uploading is refused unless connected, so nothing can be sent accidentally', () => {
  const refused = driveExportReducer(initialDriveExportState(true), {
    type: 'upload_request',
    fileName: 'arogya-report.md',
  });
  assert.equal(refused.upload.status, 'error');
  assert.match(refused.upload.message ?? '', /Connect Google Drive/);

  const uploadWhileConnecting = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'upload_request',
    fileName: 'arogya-report.md',
  });
  assert.equal(uploadWhileConnecting.upload.status, 'error');
});

test('successful upload keeps the returned link and disconnect clears account state', () => {
  const connected = driveExportReducer(connect(initialDriveExportState(true)), {
    type: 'connect_granted',
    accountEmail: 'crew@example.com',
  });
  const done = driveExportReducer(connected, {
    type: 'upload_succeeded',
    fileName: 'arogya-report.md',
    fileLink: 'https://drive.google.com/file/d/abc/view',
  });
  assert.equal(done.upload.status, 'uploaded');
  assert.equal(done.upload.fileLink, 'https://drive.google.com/file/d/abc/view');
  assert.equal(done.status, 'connected');

  const disconnected = driveExportReducer(done, { type: 'disconnect' });
  assert.equal(disconnected.status, 'disconnected');
  assert.equal(disconnected.accountEmail, null);
  assert.equal(disconnected.upload.status, 'idle');
});

test('unknown failures fall back to a generic connection error', () => {
  const info = describeDriveFailure('some_new_code', 'Boom');
  assert.equal(info.title, 'Connection error');
  assert.equal(info.message, 'Boom');
});
