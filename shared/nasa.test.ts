import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import {
  buildEpicImageUrl,
  parseCkanSearch,
  parseEpicEarthResponse,
  resolveNasaTopic,
  NASA_DATASET_TOPICS,
} from './nasa';

const EPIC_SAMPLE = [
  {
    date: '2026-11-12 00:01:58',
    image: 'epic_1b_20261112000158',
    caption: 'Earth from DSCOVR.',
  },
];

describe('EPIC Earth parsing', () => {
  test('builds an archive URL only from a date and a safe image identifier', () => {
    assert.equal(
      buildEpicImageUrl('2026-11-12 00:01:58', 'epic_1b_20261112000158'),
      'https://epic.gsfc.nasa.gov/archive/natural/2026/11/12/jpg/epic_1b_20261112000158.jpg'
    );
    assert.equal(buildEpicImageUrl('not-a-date', 'epic_1b'), null);
    assert.equal(buildEpicImageUrl('2026-11-12', '../../etc/passwd'), null);
  });

  test('reads the latest frame and keeps NASA/NOAA attribution', () => {
    const image = parseEpicEarthResponse(EPIC_SAMPLE);
    assert.equal(image?.date, '2026-11-12');
    assert.equal(image?.credit, 'NASA EPIC · NOAA DSCOVR');
    assert.equal(image?.caption, 'Earth from DSCOVR.');
  });

  test('returns null when no usable frame is present', () => {
    assert.equal(parseEpicEarthResponse(null), null);
    assert.equal(parseEpicEarthResponse([]), null);
    assert.equal(parseEpicEarthResponse([{ date: '2026-11-12' }]), null);
    assert.equal(parseEpicEarthResponse([{ image: 'epic_1b' }]), null);
  });
});

describe('data.nasa.gov catalog parsing', () => {
  const CKAN_SAMPLE = {
    result: {
      count: 1911,
      results: [
        {
          id: 'abc-123',
          name: 'space-radiation-example',
          title: 'Space Radiation Example',
          notes: '<p>Radiation <b>dosimetry</b> measurements &amp; crew exposure.</p>',
          metadata_modified: '2026-10-01T12:00:00.000Z',
          license_title: 'Public Domain',
          organization: { title: 'NASA' },
          resources: [{ format: 'csv' }, { format: 'CSV' }, { format: 'pdf' }, { format: '' }],
        },
        { title: 'Missing identifier', notes: 'should be skipped' },
      ],
    },
  };

  test('normalizes metadata and strips markup', () => {
    const parsed = parseCkanSearch(CKAN_SAMPLE);
    assert.equal(parsed?.totalAvailable, 1911);
    assert.equal(parsed?.datasets.length, 1);
    const [dataset] = parsed!.datasets;
    assert.equal(dataset.title, 'Space Radiation Example');
    assert.equal(dataset.description, 'Radiation dosimetry measurements & crew exposure.');
    assert.deepEqual(dataset.formats, ['CSV', 'PDF']);
    assert.equal(dataset.url, 'https://data.nasa.gov/dataset/space-radiation-example');
    assert.equal(dataset.organization, 'NASA');
    assert.equal(dataset.license, 'Public Domain');
  });

  test('rejects malformed CKAN payloads', () => {
    assert.equal(parseCkanSearch(null), null);
    assert.equal(parseCkanSearch({}), null);
    assert.equal(parseCkanSearch({ result: { count: 0 } }), null);
  });

  test('omits CKAN placeholder licence labels', () => {
    const parsed = parseCkanSearch({
      result: {
        count: 1,
        results: [
          {
            id: 'ds-2',
            name: 'placeholder-licence',
            title: 'Placeholder licence',
            license_title: 'other-license-specified',
          },
        ],
      },
    });
    assert.equal(parsed?.datasets[0]?.license, null);
  });
});

describe('dataset topic allowlist', () => {
  test('accepts only the curated topics', () => {
    assert.equal(resolveNasaTopic('radiation')?.label, 'Space radiation');
    assert.equal(resolveNasaTopic('cognitive')?.label, 'Cognitive performance');
    assert.equal(resolveNasaTopic('microgravity')?.label, 'Microgravity');
    assert.equal(resolveNasaTopic('cardiovascular')?.label, 'Cardiovascular');
    assert.equal(resolveNasaTopic('anything-else'), null);
    assert.equal(resolveNasaTopic(null), null);
    assert.equal(NASA_DATASET_TOPICS.length, 4);
  });
});
