import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNasaCmpCsv, type NasaCmpDataset, type NasaCmpProvenance } from '../src/data/nasaOsd575';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const filename = 'LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv';
const sourcePath = resolve(root, 'data/nasa/osd-575/source', filename);
const outputPath = resolve(root, 'src/data/nasaOsd575Cmp.json');
const provenancePath = resolve(root, 'data/nasa/osd-575/provenance.json');
const source = await readFile(sourcePath);
const sourceStat = await stat(sourcePath);
const sourceText = source.toString('utf8');
const parsed = parseNasaCmpCsv(sourceText);
const provenance: NasaCmpProvenance = {
  studyId: 'OSD-575',
  title: 'SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)',
  version: '3',
  doi: '10.26030/mc5d-p710',
  officialUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575',
  metadataUrl: 'https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/',
  manifestUrl: 'https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/files/',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  licenseVerification: 'Verified against the official OSDR OSD-575 Version 3 study page, which lists License: CC0-1.0. The direct HTML response did not expose the page content to the local fetcher.',
  downloadUrl: 'https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv',
  filename,
  sha256: createHash('sha256').update(source).digest('hex'),
  retrievedAt: sourceStat.mtime.toISOString(),
  transformDescription: 'Parsed the NASA OSDR transformed CSV into sample records and analyte result objects; source NA/N/A/blank tokens become null. No interpolation, normalization, unit conversion, or diagnostic classification is performed.',
  sourceSampleRows: parsed.samples.length,
  importedMeasurements: parsed.samples.length * parsed.analytes.length,
  unitsAndNormalization: 'Values retain the physical units encoded in the source headers. The CMP protocol describes Quest Diagnostics laboratory results; this transformed CMP file does not specify a log or cross-sample normalization. The file is transformed to a reusable table schema.',
  limitations: [
    'Study IDs C001–C004 are shown as source pseudonyms and are not linked to Arogya demo astronauts or re-identified.',
    'This is archived serum laboratory research data, not live telemetry, a medical device reading, or a diagnosis.',
    'The study overview description lists L-92, L-44, L-3, R+1, R+45, and R+82; the official study sample table and CMP file also include R+194 samples. All source timepoint labels are preserved as supplied.',
    'No exact collection dates or daily observations are inferred from relative timepoints.',
    'Per-result ranges are displayed only as source-reported laboratory intervals and are not used to assign flags.',
  ],
};
const dataset: NasaCmpDataset = { provenance, ...parsed };

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
console.log(`Imported ${provenance.sourceSampleRows} source samples, ${parsed.analytes.length} analytes, and ${provenance.importedMeasurements} sample/analyte records.`);
console.log(`Source SHA-256: ${provenance.sha256}`);
console.log(`Wrote ${outputPath} and ${provenancePath}`);
