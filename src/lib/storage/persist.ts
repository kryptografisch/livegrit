// navigator.storage: persist() / persisted() / estimate(). The StorageManager only exists
// in secure contexts (https, localhost), so every function handles its absence (`null`).
// Persistence is best-effort: clearing site data still deletes everything, so .lss export
// is the real backup.

function storageManager(): StorageManager | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.storage ?? null;
}

/** Whether persistent storage is granted; `null` if the browser can't tell. */
export async function persisted(): Promise<boolean | null> {
  const storage = storageManager();
  if (!storage?.persisted) return null;
  try {
    return await storage.persisted();
  } catch {
    return null;
  }
}

/**
 * Asks for persistent storage (Firefox may show a prompt, Chrome decides silently).
 * Returns whether it is granted; `null` if the browser doesn't support it.
 */
export async function persist(): Promise<boolean | null> {
  const storage = storageManager();
  if (!storage?.persist) return null;
  try {
    return await storage.persist();
  } catch {
    return null;
  }
}

export interface StorageEstimateInfo {
  /** Bytes used by this origin. */
  usage: number;
  /** Bytes this origin may use. */
  quota: number;
}

/** Usage and quota; `null` if the browser doesn't report them. */
export async function estimate(): Promise<StorageEstimateInfo | null> {
  const storage = storageManager();
  if (!storage?.estimate) return null;
  try {
    const { usage, quota } = await storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usage, quota };
  } catch {
    return null;
  }
}

/**
 * Calls `request` once on the first pointer press or key press (some browsers only grant
 * or prompt after a user gesture). Returns a function that removes the listeners.
 */
export function onFirstUserGesture(request: () => void, target: EventTarget = window): () => void {
  const events = ['pointerdown', 'keydown'] as const;
  const handler = () => {
    stop();
    request();
  };
  const stop = () => {
    for (const type of events) target.removeEventListener(type, handler, true);
  };
  for (const type of events) target.addEventListener(type, handler, true);
  return stop;
}
