import { IndexedDBStorage } from "./IndexedDBStorage";

let _storage: IndexedDBStorage | null = null;

export async function initStorage(): Promise<IndexedDBStorage> {
  if (_storage) return _storage;

  const storage = new IndexedDBStorage();
  try {
    await storage.init();
    _storage = storage;
    console.log("[Storage] IndexedDB initialized");
  } catch (err) {
    console.error("[Storage] IndexedDB init failed:", err);
    // App continues without offline storage
  }
  return storage;
}

export function getStorage(): IndexedDBStorage | null {
  return _storage;
}
