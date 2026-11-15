export interface NasaCmpAnalyte {
  id: string;
  label: string;
  unit: string;
}

export interface NasaCmpResult {
  value: number | null;
  referenceMin: number | null;
  referenceMax: number | null;
}

export interface NasaCmpSample {
  sampleName: string;
  subjectId: string;
  timepoint: string;
  results: Record<string, NasaCmpResult>;
}

export interface NasaCmpProvenance {
  studyId: string;
  title: string;
  version: string;
  doi: string;
  officialUrl: string;
  metadataUrl: string;
  manifestUrl: string;
  license: string;
  licenseUrl: string;
  licenseVerification: string;
  downloadUrl: string;
  filename: string;
  sha256: string;
  retrievedAt: string;
  transformDescription: string;
  sourceSampleRows: number;
  importedMeasurements: number;
  unitsAndNormalization: string;
  limitations: string[];
}

export interface NasaCmpDataset {
  provenance: NasaCmpProvenance;
  analytes: NasaCmpAnalyte[];
  samples: NasaCmpSample[];
}

export function describeNasaSourceInterval(result: NasaCmpResult, unit: string): string {
  if (result.referenceMin == null || result.referenceMax == null) {
    return 'Reference interval not supplied; research observation only.';
  }
  return `${result.referenceMin}–${result.referenceMax} ${unit}; not interpreted`;
}

export function buildNasaCmpChartData(samples: NasaCmpSample[], analyteId: string) {
  return [...samples]
    .sort((a, b) => compareNasaRelativeTimepoints(a.timepoint, b.timepoint))
    .map((sample) => ({
      timepoint: sample.timepoint,
      value: sample.results[analyteId]?.value ?? null,
    }));
}

const TIMEPOINT_ORDER: Record<string, number> = {
  'L-92': -92,
  'L-44': -44,
  'L-3': -3,
  'R+1': 1,
  'R+45': 45,
  'R+82': 82,
  'R+194': 194,
};

/** Preserve the study's relative timepoint labels and sort only by their stated offsets. */
export function compareNasaRelativeTimepoints(left: string, right: string): number {
  const a = TIMEPOINT_ORDER[left];
  const b = TIMEPOINT_ORDER[right];
  if (a == null || b == null) return left.localeCompare(right);
  return a - b;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error('NASA CMP CSV contains an unterminated quoted field.');
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function numericOrNull(raw: string | undefined): number | null {
  const value = raw?.trim() ?? '';
  if (!value || /^(?:NA|N\/A)$/i.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Unexpected non-numeric laboratory value: ${value}`);
  return parsed;
}

function unitFromHeader(header: string): string {
  const unit = header.match(/_value_(.+)$/)?.[1];
  if (!unit) return 'ratio';
  const units: Record<string, string> = {
    gram_per_deciliter: 'g/dL',
    units_per_liter: 'U/L',
    milligram_per_deciliter: 'mg/dL',
    millimol_per_liter: 'mmol/L',
    'milliliter_per_minute_per_1.73_meter_squared': 'mL/min/1.73 m²',
  };
  const mapped = units[unit];
  if (!mapped) throw new Error(`Unmapped source unit in CSV column: ${header}`);
  return mapped;
}

function labelFromId(id: string): string {
  const labels: Record<string, string> = {
    alt: 'ALT',
    ast: 'AST',
    bun: 'Urea nitrogen (BUN)',
    bun_to_creatinine_ratio: 'BUN/creatinine ratio',
    egfr_african_american: 'eGFR (African American equation)',
    egfr_non_african_american: 'eGFR (non-African American equation)',
  };
  return labels[id] ?? id.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Transform the official OSDR processed CMP CSV without imputing or normalizing measurements. */
export function parseNasaCmpCsv(csv: string): { analytes: NasaCmpAnalyte[]; samples: NasaCmpSample[] } {
  const [header, ...rows] = parseCsvRows(csv.replace(/^\uFEFF/, ''));
  if (!header?.length || header[0] !== 'Sample Name') {
    throw new Error('NASA CMP CSV is missing the expected Sample Name first column.');
  }
  if (new Set(header).size !== header.length) throw new Error('NASA CMP CSV contains duplicate column names.');

  const positions = new Map(header.map((name, index) => [name, index]));
  const valueColumns = header.filter((name) => /_value(?:_|$)/.test(name));
  if (valueColumns.length === 0) throw new Error('NASA CMP CSV has no analyte value columns.');

  const analytes = valueColumns.map((valueHeader) => {
    const match = valueHeader.match(/^(.+)_value(?:_(.+))?$/);
    if (!match) throw new Error(`Unexpected analyte value column: ${valueHeader}`);
    const id = match[1];
    const minHeader = header.find((name) => name === `${id}_range_min${match[2] ? `_${match[2]}` : ''}`);
    const maxHeader = header.find((name) =>
      name === `${id}_range_max${match[2] ? `_${match[2]}` : ''}` || name === `${id}_max${match[2] ? `_${match[2]}` : ''}`
    );
    return {
      id,
      label: labelFromId(id),
      unit: unitFromHeader(valueHeader),
      valueIndex: positions.get(valueHeader)!,
      minIndex: minHeader ? positions.get(minHeader)! : undefined,
      maxIndex: maxHeader ? positions.get(maxHeader)! : undefined,
    };
  });

  const samples = rows.map((row, rowIndex): NasaCmpSample => {
    if (row.length !== header.length) {
      throw new Error(`NASA CMP CSV row ${rowIndex + 2} has ${row.length} fields; expected ${header.length}.`);
    }
    const sampleName = row[0].trim();
    const match = sampleName.match(/^(.+?)_serum_(L-\d+|R\+\d+)$/);
    if (!match) throw new Error(`Unexpected NASA serum sample identifier: ${sampleName}`);
    const results: Record<string, NasaCmpResult> = {};
    for (const analyte of analytes) {
      results[analyte.id] = {
        value: numericOrNull(row[analyte.valueIndex]),
        referenceMin: analyte.minIndex == null ? null : numericOrNull(row[analyte.minIndex]),
        referenceMax: analyte.maxIndex == null ? null : numericOrNull(row[analyte.maxIndex]),
      };
    }
    return { sampleName, subjectId: match[1], timepoint: match[2], results };
  });

  return {
    analytes: analytes.map(({ id, label, unit }) => ({ id, label, unit })),
    samples,
  };
}
