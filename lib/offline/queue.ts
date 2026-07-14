// Minimal offline write-queue (Offline Sync doc, Phase-1 "Option G").
// Attendance submits that fail (no connection) are stored in IndexedDB and
// retried on reconnect. The server idempotencyKey (slot:date) makes retries safe.
export type PendingWrite = {
  id: string;
  slotId: string;
  dateISO: string;
  absentStudentIds: string[];
  queuedAt: number;
  attempts?: number; // online sync failures — a permanently-rejected write is dropped after a few
};

const DB_NAME = "edutrack";
const STORE = "pending_writes";
const VERSION = 1;

type Listener = () => void;
const listeners = new Set<Listener>();
export function onQueueChange(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function notify() {
  listeners.forEach((l) => l());
}

function hasIDB() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function enqueue(w: Omit<PendingWrite, "id" | "queuedAt">): Promise<void> {
  if (!hasIDB()) return;
  const s = await store("readwrite");
  const item: PendingWrite = { ...w, id: crypto.randomUUID(), queuedAt: Date.now() };
  await promisify(s.put(item));
  notify();
}

export async function getAllPending(): Promise<PendingWrite[]> {
  if (!hasIDB()) return [];
  const s = await store("readonly");
  return promisify(s.getAll() as IDBRequest<PendingWrite[]>);
}

// Records an online sync failure for a write and returns its new attempt count.
// Used to distinguish "waiting for the network" (leave it) from "the server
// keeps rejecting this" (drop it after a few tries so the banner can't stick).
export async function markFailed(id: string): Promise<number> {
  if (!hasIDB()) return 0;
  const s = await store("readwrite");
  const item = await promisify(s.get(id) as IDBRequest<PendingWrite | undefined>);
  if (!item) return 0;
  item.attempts = (item.attempts ?? 0) + 1;
  await promisify(s.put(item));
  return item.attempts;
}

export async function removePending(id: string): Promise<void> {
  if (!hasIDB()) return;
  const s = await store("readwrite");
  await promisify(s.delete(id));
  notify();
}

export async function countPending(): Promise<number> {
  if (!hasIDB()) return 0;
  const s = await store("readonly");
  return promisify(s.count());
}
