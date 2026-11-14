export type DriveAssetRole =
  | 'dashboard_video'
  | 'astronaut_model'
  | 'brain_model'
  | 'heart_model'
  | 'lungs_model'
  | 'image_asset'
  | 'supplementary_file';

export interface DriveAssetItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  role: DriveAssetRole;
  objectUrl?: string;
  textPreview?: string;
  cachedInIndexedDb: boolean;
  lastSyncedIso?: string;
  webViewLink?: string;
}
