// Remembers the Timer window's size, so it can be sized the same again (e.g. after adding
// it to OBS with window capture, where the capture should keep its size). Resizing never
// saves on its own: the saved size only changes when the user accepts the current one
// (`accept`), or once at the start when none is saved yet. Whenever the window's size
// differs from the saved one, `hint` is true. When a resize makes them match again, the
// hint turns `matched` and is removed once the window isn't resized for `settleMs`. A
// resize away from the saved size shows it again.

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
  /** After a match, the hint is removed once resizes stop for this long. 2000 ms. */
  settleMs?: number;
}

/** `differs`: the sizes differ. `matched`: they match again (removed soon). */
export type WindowSizeHintState = 'differs' | 'matched';

export function sameSize(a: WindowSize | null, b: WindowSize | null): boolean {
  return a !== null && b !== null && a.width === b.width && a.height === b.height;
}

export class WindowSizeMemory {
  /** The window's size now. */
  current = $state.raw<WindowSize>({ width: 0, height: 0 });
  /** The saved size (`null` before `start` / after `stop`: no hint then). */
  last = $state.raw<WindowSize | null>(null);
  /** True while the sizes match again but the hint still shows (see `hintState`). */
  #matched = $state(false);

  readonly #storage: WindowSizeStorage;
  readonly #read: () => WindowSize;
  readonly #settleMs: number;
  #matchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WindowSizeMemoryOptions) {
    this.#storage = options.storage;
    this.#read = options.read;
    this.#settleMs = options.settleMs ?? 2000;
  }

  /** The hint shows: the sizes differ, or they just matched again (green). */
  get hint(): boolean {
    return this.last !== null && (this.#matched || !sameSize(this.last, this.current));
  }

  /** What the hint shows (only meaningful while `hint`). */
  get hintState(): WindowSizeHintState {
    return this.#matched ? 'matched' : 'differs';
  }

  /** Compares with the saved size. Call once the settings are restored. */
  start(): void {
    this.current = this.#read();
    const saved = this.#storage.timerWindowSize;
    this.last = saved;
    if (saved === null) this.#save();
  }

  /** The window was resized. */
  resize(): void {
    const wasShown = this.hint;
    const next = this.#read();
    if (!sameSize(next, this.current)) this.current = next;
    if (this.last === null) return;
    this.#clearMatchTimer();
    if (!sameSize(this.last, this.current)) {
      this.#matched = false;
    } else if (wasShown) {
      // Just matched (or still matching): green, removed once resizes stop.
      this.#matched = true;
      this.#matchTimer = setTimeout(() => {
        this.#matchTimer = null;
        this.#matched = false;
      }, this.#settleMs);
    }
  }

  /** The current size becomes the one to keep (the hint's "save this size"). */
  accept(): void {
    this.#save();
  }

  /** Hides the hint (nothing is saved until `start` again). */
  stop(): void {
    this.#clearMatchTimer();
    this.#matched = false;
    this.last = null;
  }

  #clearMatchTimer(): void {
    if (this.#matchTimer !== null) clearTimeout(this.#matchTimer);
    this.#matchTimer = null;
  }

  #save(): void {
    this.#clearMatchTimer();
    this.#matched = false;
    const size = this.current;
    this.last = size;
    this.#storage.saveTimerWindowSize(size);
  }
}
