import type { StateStorage } from 'zustand/middleware';

const DATABASE_NAME = 'arogya-app-state-v1';
const STORE_NAME = 'zustand-state';
const serverMemory = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open Arogya state storage.'));
    request.onblocked = () => reject(new Error('Arogya state storage upgrade is blocked by another tab.'));
  });
}

function useServerMemory(): boolean {
  return typeof window === 'undefined' && typeof indexedDB === 'undefined';
}

export const indexedDbStateStorage: StateStorage = {
  async getItem(name) {
    if (useServerMemory()) return serverMemory.get(name) ?? null;

    const database = await openDatabase();
    return new Promise<string | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(name);
      request.onsuccess = () => {
        const value: unknown = request.result;
        if (value === undefined) {
          resolve(null);
        } else if (typeof value === 'string') {
          resolve(value);
        } else {
          reject(new Error(`Invalid persisted value for "${name}".`));
          database.close();
        }
      };
      request.onerror = () => reject(request.error ?? new Error(`Could not read "${name}" from IndexedDB.`));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error(`IndexedDB read failed for "${name}".`));
      };
    });
  },

  async setItem(name, value) {
    if (useServerMemory()) {
      serverMemory.set(name, value);
      return;
    }

    const database = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, name);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error(`IndexedDB write failed for "${name}".`));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error(`IndexedDB write was aborted for "${name}".`));
      };
    });
  },

  async removeItem(name) {
    if (useServerMemory()) {
      serverMemory.delete(name);
      return;
    }

    const database = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(name);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error(`IndexedDB delete failed for "${name}".`));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error(`IndexedDB delete was aborted for "${name}".`));
      };
    });
  },
};
