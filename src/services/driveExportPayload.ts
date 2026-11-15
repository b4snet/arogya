import type { Report, ReportFormat } from '../types';
import { reportToMarkdown } from '../engine/reportGenerator';

export type DriveExportFileFormat = 'markdown' | 'json';

export interface DriveExportPayload {
  reportId: string;
  filename: string;
  mimeType: string;
  contents: string;
  /** Human label for the format, shown before upload. */
  formatLabel: string;
  /** Privacy statement shown to the user before they confirm. */
  privacyNote: string;
  /** Where the data came from; the report is a local snapshot. */
  dataSource: string;
  containsPrivateNotes: boolean;
  /** Byte size of the encoded payload, for the confirmation panel. */
  byteSize: number;
  reportFormat: ReportFormat;
}

const MIME_BY_FORMAT: Record<DriveExportFileFormat, string> = {
  markdown: 'text/markdown',
  json: 'application/json',
};

const LABEL_BY_FORMAT: Record<DriveExportFileFormat, string> = {
  markdown: 'Markdown (.md)',
  json: 'JSON (.json)',
};

export function sanitizeDriveFilename(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 120);
  return cleaned || 'arogya-report';
}

function dateStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'undated';
  return date.toISOString().slice(0, 10);
}

/**
 * Builds the single file that may be uploaded.
 *
 * Privacy is decided by the report itself: the Reports page keeps private crew
 * notes out unless the operator explicitly opted in, and the payload never adds
 * them on its own.
 */
export function buildDriveExportPayload(params: {
  report: Report;
  astronautName: string;
  format: DriveExportFileFormat;
}): DriveExportPayload {
  const { report, astronautName, format } = params;
  const base = sanitizeDriveFilename(
    `arogya-observation-report-${report.id}-${dateStamp(report.createdAtIso)}`
  );
  const extension = format === 'markdown' ? 'md' : 'json';
  const contents =
    format === 'markdown'
      ? reportToMarkdown(report, astronautName)
      : JSON.stringify(report, null, 2);

  const containsPrivateNotes = report.includePrivateNotes === true;

  return {
    reportId: report.id,
    filename: `${base}.${extension}`,
    mimeType: MIME_BY_FORMAT[format],
    contents,
    formatLabel: LABEL_BY_FORMAT[format],
    privacyNote: containsPrivateNotes
      ? 'Private crew notes are included. The file stays private to the Drive account that approves the upload.'
      : 'Private crew notes are excluded. The file stays private to the Drive account that approves the upload.',
    dataSource: `Arogya on-device report snapshot · ${report.periodLabel ?? `${report.attachedVitalsWindowDays}-day window`} · Mission Day ${report.missionDay}`,
    containsPrivateNotes,
    byteSize: new TextEncoder().encode(contents).length,
    reportFormat: report.format,
  };
}

export function formatPayloadSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
