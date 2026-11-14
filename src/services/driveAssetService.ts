import type { DriveAssetItem, DriveAssetRole } from '../types';
import { saveDriveAssetToDb } from './offlineStorage';

export const AROGYA_DRIVE_FOLDER_ID = '1X4ld8c9B7pG4TSLcfqEpcLOe3XllUe7-';

interface GoogleDriveFileNode {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
}

export function classifyDriveFileRole(name: string, mimeType: string): DriveAssetRole {
  const lower = name.toLowerCase();
  if (mimeType.startsWith('video/') || lower.endsWith('.mp4') || lower.endsWith('.webm')) {
    return 'dashboard_video';
  }
  if (
    lower.endsWith('.glb') ||
    lower.endsWith('.gltf') ||
    lower.endsWith('.obj') ||
    lower.endsWith('.fbx')
  ) {
    if (lower.includes('brain') || lower.includes('neuro')) return 'brain_model';
    if (lower.includes('heart') || lower.includes('cardio')) return 'heart_model';
    if (lower.includes('lung') || lower.includes('resp')) return 'lungs_model';
    if (
      lower.includes('astronaut') ||
      lower.includes('suit') ||
      lower.includes('eva') ||
      lower.includes('body') ||
      lower.includes('human')
    ) {
      return 'astronaut_model';
    }
    return 'astronaut_model';
  }
  if (mimeType.startsWith('image/')) {
    return 'image_asset';
  }
  return 'supplementary_file';
}

async function listFolderChildren(
  folderId: string,
  accessToken: string
): Promise<GoogleDriveFileNode[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Drive API listing failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { files?: GoogleDriveFileNode[] };
  return data.files ?? [];
}

async function collectAllFilesRecursive(
  folderId: string,
  accessToken: string,
  visited = new Set<string>()
): Promise<GoogleDriveFileNode[]> {
  if (visited.has(folderId)) return [];
  visited.add(folderId);

  const children = await listFolderChildren(folderId, accessToken);
  const collected: GoogleDriveFileNode[] = [];

  for (const node of children) {
    if (node.mimeType === 'application/vnd.google-apps.folder') {
      const nested = await collectAllFilesRecursive(node.id, accessToken, visited);
      collected.push(...nested);
    } else {
      collected.push(node);
    }
  }
  return collected;
}

async function downloadFileBlob(
  file: GoogleDriveFileNode,
  accessToken: string
): Promise<{ blob: Blob; textPreview?: string }> {
  let downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;

  if (file.mimeType === 'application/vnd.google-apps.document') {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
  } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`;
  }

  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${file.name} (${res.status})`);
  }

  const blob = await res.blob();
  let textPreview: string | undefined;

  if (
    file.mimeType.startsWith('text/') ||
    file.mimeType === 'application/json' ||
    file.mimeType.startsWith('application/vnd.google-apps.') ||
    file.name.toLowerCase().endsWith('.txt') ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.csv') ||
    file.name.toLowerCase().endsWith('.json')
  ) {
    try {
      const fullText = await blob.text();
      textPreview = fullText.slice(0, 1200);
    } catch {
      textPreview = undefined;
    }
  }

  return { blob, textPreview };
}

export async function syncAllDriveFolderAssets(
  accessToken: string,
  onProgress?: (loaded: number, total: number, currentName: string) => void
): Promise<DriveAssetItem[]> {
  const files = await collectAllFilesRecursive(AROGYA_DRIVE_FOLDER_ID, accessToken);
  const results: DriveAssetItem[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, total, file.name);
    const role = classifyDriveFileRole(file.name, file.mimeType);
    const { blob, textPreview } = await downloadFileBlob(file, accessToken);
    const nowIso = new Date().toISOString();

    const meta: Omit<DriveAssetItem, 'objectUrl'> = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: Number(file.size ?? blob.size),
      role,
      cachedInIndexedDb: true,
      lastSyncedIso: nowIso,
      webViewLink: file.webViewLink,
    };

    await saveDriveAssetToDb(meta, blob, textPreview);

    results.push({
      ...meta,
      textPreview,
      objectUrl: URL.createObjectURL(blob),
    });
  }

  onProgress?.(total, total, 'Complete');
  return results;
}
