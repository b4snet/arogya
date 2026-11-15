import assert from 'node:assert/strict';
import { test } from 'vitest';
import provenance from './programmeErizonProvenance.json';

test('Programme ERIZON provenance records the verified source, license, and immutable file', () => {
  assert.equal(provenance.id, 'asset-programme-erizon');
  assert.equal(provenance.title, 'Programme ERIZON');
  assert.equal(provenance.creator, 'nejenabinupa');
  assert.equal(provenance.sourceUrl, 'https://sketchfab.com/3d-models/programme-erizon-1dfbae39ee674334848da02301b77d68');
  assert.equal(provenance.licenseShortName, 'CC BY-NC-ND 4.0');
  assert.equal(provenance.licenseUrl, 'https://creativecommons.org/licenses/by-nc-nd/4.0/');
  assert.equal(provenance.modelPath, 'models/programme_erizon.glb');
  assert.equal(provenance.bytes, 32_025_228);
  assert.match(provenance.sha256, /^[a-f0-9]{64}$/);
  assert.equal(provenance.modifications, 'None. The original GLB is served unchanged.');
  assert.match(provenance.commercialUse, /Non-commercial/i);
  assert.match(provenance.derivatives, /Not permitted/i);
  assert.equal(provenance.attributionRequired, true);
  assert.equal(provenance.noDerivatives, true);
});
