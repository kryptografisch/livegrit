// Keeps the screen awake while an attempt is running (Screen Wake Lock API).
// Feature-detected and best effort: every failure is ignored (unsupported browser,
// low battery, page not visible, permissions policy).
//
// The browser releases the lock by itself when the page gets hidden, so it is requested
// again on `visibilitychange` when the page is visible and the lock is still wanted.

interface Sentinel {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

export interface WakeLockEnv {
  /** `navigator.wakeLock` or `undefined` if unsupported. */
  wakeLock: { request(type: 'screen'): Promise<Sentinel> } | undefined;
  /** The `document` (visibility state and `visibilitychange`). */
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
}

function browserEnv(): WakeLockEnv | null {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return null;
  return { wakeLock: navigator.wakeLock, document };
}

export class WakeLockController {
  #env: WakeLockEnv | null;
  #wanted = false;
  #sentinel: Sentinel | null = null;
  #requesting = false;
  #listening = false;

  constructor(env: WakeLockEnv | null = browserEnv()) {
    this.#env = env;
  }

  get supported(): boolean {
    return this.#env?.wakeLock !== undefined;
  }

  /** Whether the lock is currently held. */
  get held(): boolean {
    return this.#sentinel !== null && !this.#sentinel.released;
  }

  /** Request (true) or release (false) the lock. Idempotent. */
  setActive(active: boolean): void {
    if (!this.supported || active === this.#wanted) return;
    this.#wanted = active;
    const doc = this.#env!.document;
    if (active) {
      if (!this.#listening) {
        doc.addEventListener('visibilitychange', this.#onVisibilityChange);
        this.#listening = true;
      }
      void this.#acquire();
    } else {
      if (this.#listening) {
        doc.removeEventListener('visibilitychange', this.#onVisibilityChange);
        this.#listening = false;
      }
      this.#release();
    }
  }

  #onVisibilityChange = (): void => {
    if (this.#wanted && this.#env!.document.visibilityState === 'visible') void this.#acquire();
  };

  async #acquire(): Promise<void> {
    const env = this.#env!;
    if (this.held || this.#requesting || env.document.visibilityState !== 'visible') return;
    this.#requesting = true;
    try {
      const sentinel = await env.wakeLock!.request('screen');
      if (!this.#wanted) {
        // Released while the request was pending (e.g. paused right after starting).
        void sentinel.release().catch(() => {});
        return;
      }
      this.#sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.#sentinel === sentinel) this.#sentinel = null;
      });
    } catch {
      // Not allowed right now (hidden page, battery saver, policy): ignore.
    } finally {
      this.#requesting = false;
    }
  }

  #release(): void {
    const sentinel = this.#sentinel;
    this.#sentinel = null;
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
  }
}

/** The app-wide controller. */
export const wakeLock = new WakeLockController();
