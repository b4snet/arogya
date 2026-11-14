import type { DriveAssetItem } from '../types';

const DB_NAME = 'arogya-offline-assets-v1';
const STORE_NAME = 'drive-blobs';

interface StoredAssetRecord {
  id: string;
  meta: Omit<DriveAssetItem, 'objectUrl'>;
  blob: Blob;
  textPreview?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDriveAssetToDb(
  meta: Omit<DriveAssetItem, 'objectUrl'>,
  blob: Blob,
  textPreview?: string
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: meta.id, meta, blob, textPreview } satisfies StoredAssetRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCachedDriveAssets(): Promise<DriveAssetItem[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as StoredAssetRecord[];
        const items: DriveAssetItem[] = records.map((rec) => ({
          ...rec.meta,
          textPreview: rec.textPreview,
          cachedInIndexedDb: true,
          objectUrl: URL.createObjectURL(rec.blob),
        }));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearCachedDriveAssets(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore cleanup error in unsupported contexts
  }
}
