// Remembers the Timer window's size, so it can be sized the same again (e.g. after adding
// it to OBS with window capture, where the capture should keep its size). On start, the
// current size is compared with the saved one: if they differ, `hint` is true and the
// saved size is kept (not overwritten) until the window has that size again or the user
// accepts the current one (`accept`). Otherwise every resize is saved (debounced).

import type { WindowSize } from '../storage/settings';

export interface WindowSizeStorage {
  /** The saved size; `null` = none yet. */
  readonly timerWindowSize: WindowSize | null;
  saveTimerWindowSize(size: WindowSize): void;
}

export interface WindowSizeMemoryOptions {
  storage: WindowSizeStorage;
  /** The current size, e.g. `innerWidth` × `innerHeight`. */
  read: () => WindowSize;
  /** Resizes are saved once they stop for this long. Defaults to 500 ms. */
  debounceMs?: number;
}

export function sameSize(a: WindowSize | null, b: WindowSize | null): boolean {
  return a !== null && b !== null && a.width === b.width && a.height === b.height;
}

export class WindowSizeMemory {
  /** The window's size now. */
  current = $state.raw<WindowSize>({ width: 0, height: 0 });
  /** The size the window had last time, shown while it differs (see `hint`). */
  last = $state.raw<WindowSize | null>(null);
  /** True while resizes are saved (the sizes matched once, or the user accepted). */
  #tracking = $state(false);

  readonly #storage: WindowSizeStorage;
  readonly #read: () => WindowSize;
  readonly #debounceMs: number;
  #pending: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WindowSizeMemoryOptions) {
    this.#storage = options.storage;
    this.#read = options.read;
    this.#debounceMs = options.debounceMs ?? 500;
  }

  /** The window's size differs from last time's: show both (until `accept` or a match). */
  get hint(): boolean {
    return !this.#tracking && this.last !== null && !sameSize(this.last, this.current);
  }

  /** Compares with the saved size. Call once the settings are restored. */
  start(): void {
    this.current = this.#read();
    this.last = this.#storage.timerWindowSize;
    if (this.last === null || sameSize(this.last, this.current)) this.#track();
  }

  /** The window was resized. */
  resize(): void {
    this.current = this.#read();
    if (!this.#tracking && sameSize(this.last, this.current)) this.#tracking = true;
    if (this.#tracking) this.#saveSoon();
  }

  /** The current size becomes the one to keep (the hint's ×). */
  accept(): void {
    this.#track();
  }

  /** Stops saving (a pending save is dropped). */
  stop(): void {
    if (this.#pending !== null) clearTimeout(this.#pending);
    this.#pending = null;
    this.#tracking = false;
    this.last = null;
  }

  #track(): void {
    this.#tracking = true;
    this.#save();
  }

  #saveSoon(): void {
    if (this.#pending !== null) clearTimeout(this.#pending);
    this.#pending = setTimeout(() => {
      this.#pending = null;
      this.#save();
    }, this.#debounceMs);
  }

  #save(): void {
    const size = this.current;
    this.last = size;
    this.#storage.saveTimerWindowSize(size);
  }
}
