import { AUTO_SAVE_INTERVAL_MS, SAVE_KEY } from "@realm-of-idlers/shared";
import type { GameState } from "./types.js";
import { migrate } from "./migrations.js";

// ---------------------------------------------------------------------------
// Serialization helpers (Set ↔ Array)
// ---------------------------------------------------------------------------

function serialize(state: GameState): string {
  return JSON.stringify(state, (_key, value) => {
    if (value instanceof Set) return { __type: "Set", values: [...value] };
    return value;
  });
}

function deserialize(json: string): Record<string, unknown> {
  return JSON.parse(json, (_key, value) => {
    if (value && typeof value === "object" && value.__type === "Set") {
      return new Set(value.values);
    }
    return value;
  });
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

function saveToLocalStorage(data: string): boolean {
  try {
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}

function loadFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// IndexedDB fallback
// ---------------------------------------------------------------------------

const IDB_DB_NAME = "realm-of-idlers";
const IDB_STORE_NAME = "saves";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIdb(data: string): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    tx.objectStore(IDB_STORE_NAME).put(data, SAVE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadFromIdb(): Promise<string | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly");
    const req = tx.objectStore(IDB_STORE_NAME).get(SAVE_KEY);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Save game state to localStorage, falling back to IndexedDB. */
export async function saveGame(state: GameState): Promise<void> {
  const data = serialize(state);
  if (!saveToLocalStorage(data)) {
    await saveToIdb(data);
  }
}

/** Load game state, applying migrations if needed. Returns null if no save. */
export async function loadGame(): Promise<GameState | null> {
  let raw = loadFromLocalStorage();

  if (raw === null && typeof indexedDB !== "undefined") {
    try {
      raw = await loadFromIdb();
    } catch {
      // IndexedDB unavailable
    }
  }

  if (raw === null) return null;

  const parsed = deserialize(raw);
  const migrated = migrate(parsed);
  return migrated as unknown as GameState;
}

/** Delete save data from both storage backends. */
export async function deleteSave(): Promise<void> {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
  if (typeof indexedDB !== "undefined") {
    try {
      const db = await openIdb();
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      tx.objectStore(IDB_STORE_NAME).delete(SAVE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Check whether a save exists. */
export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Start auto-saving on an interval. Returns a cleanup function. */
export function startAutoSave(getState: () => GameState): () => void {
  const id = setInterval(() => {
    void saveGame(getState());
  }, AUTO_SAVE_INTERVAL_MS);
  return () => clearInterval(id);
}

/** Register a beforeunload listener for exit-save. Returns a cleanup function. */
export function registerExitSave(getState: () => GameState): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    // Synchronous localStorage write for exit-save reliability
    const data = serialize(getState());
    saveToLocalStorage(data);
  };

  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}
