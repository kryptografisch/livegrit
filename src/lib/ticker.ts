// Shared requestAnimationFrame ticker. The timer store renders from it, and the gamepad
// source polls from it too, so there is only one rAF loop in the app.
// The loop stops while the document is hidden (rAF is throttled/paused there anyway) and
// starts again when it becomes visible.

export type TickListener = (now: number) => void;

export interface Ticker {
  /** Registers a listener for every frame; returns the unsubscribe function. */
  subscribe(listener: TickListener): () => void;
}

class RafTicker implements Ticker {
  #listeners = new Set<TickListener>();
  #frame: number | null = null;

  constructor() {
    document.addEventListener('visibilitychange', () => this.#sync());
  }

  subscribe(listener: TickListener): () => void {
    this.#listeners.add(listener);
    this.#sync();
    return () => {
      this.#listeners.delete(listener);
      this.#sync();
    };
  }

  #sync(): void {
    const shouldRun = this.#listeners.size > 0 && !document.hidden;
    if (shouldRun && this.#frame === null) {
      this.#frame = requestAnimationFrame(this.#tick);
    } else if (!shouldRun && this.#frame !== null) {
      cancelAnimationFrame(this.#frame);
      this.#frame = null;
    }
  }

  #tick = (now: number): void => {
    this.#frame = requestAnimationFrame(this.#tick);
    for (const listener of this.#listeners) {
      try {
        listener(now);
      } catch (error) {
        console.error('[ticker] listener failed', error);
      }
    }
  };
}

let shared: Ticker | null = null;

/** The app-wide ticker (created lazily, browser only). */
export function rafTicker(): Ticker {
  shared ??= new RafTicker();
  return shared;
}

/** A ticker driven by hand, for tests: call `tick()` to run one frame. */
export class ManualTicker implements Ticker {
  #listeners = new Set<TickListener>();
  #now = 0;

  subscribe(listener: TickListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get listenerCount(): number {
    return this.#listeners.size;
  }

  tick(stepMs = 16): void {
    this.#now += stepMs;
    for (const listener of this.#listeners) listener(this.#now);
  }
}
