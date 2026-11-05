// Reactive timer state for the UI. The store owns the livesplit-core Timer and Layout
// (plus the reused LayoutState/ImageCache) and renders the layout state on the shared rAF
// ticker. livesplit-core is the only clock: the UI never computes times itself.
//
// Rendering: `layout.updateStateAsJson` reuses the same LayoutState/ImageCache every frame,
// so there are no per-frame wasm allocations. It only runs while an attempt is running or
// after something changed (an action, a new run, scrolling); otherwise the state is static.

import type {
  ImageCache,
  Layout,
  LayoutState,
  LayoutStateJson,
  Run,
  Timer,
  TimerRef,
} from 'livesplit-core';
import { rafTicker, type Ticker } from '../ticker';
import {
  core,
  createDefaultLayout,
  createTimer,
  initCore,
  parseRun,
  type WasmSource,
} from './core';
import { toLayoutView, type LayoutView } from './layoutView';

export type Phase = 'NotRunning' | 'Running' | 'Ended' | 'Paused';

const phases: Record<number, Phase> = {
  0: 'NotRunning',
  1: 'Running',
  2: 'Ended',
  3: 'Paused',
};

export const DEFAULT_VISIBLE_ROWS = 10;

export interface TimerStoreOptions {
  /** Defaults to the shared rAF ticker. Tests pass a `ManualTicker`. */
  ticker?: Ticker;
}

export class TimerStore {
  /** The rendered layout; `null` while no run is loaded. Replaced as a whole per render. */
  view = $state.raw<LayoutView | null>(null);
  phase = $state<Phase>('NotRunning');
  /** True once the core is loaded and the store renders. */
  ready = $state(false);

  /**
   * Called after a successful reset, with the timer (its run already contains the attempt).
   * Step 9 saves the run here. No-op for now.
   */
  onReset: ((timer: TimerRef) => void) | null = null;

  #visibleRows = $state(DEFAULT_VISIBLE_ROWS);
  #ticker: Ticker | undefined;
  #unsubscribe: (() => void) | null = null;
  #initializing: Promise<void> | null = null;

  #timer: Timer | null = null;
  #layout: Layout | null = null;
  #layoutState: LayoutState | null = null;
  #imageCache: ImageCache | null = null;
  #dirty = true;

  constructor(options: TimerStoreOptions = {}) {
    this.#ticker = options.ticker;
  }

  /** Loads the core and starts rendering. Safe to call more than once. */
  init(wasm?: WasmSource): Promise<void> {
    this.#initializing ??= (async () => {
      await initCore(wasm);
      const { ImageCache, LayoutState } = core();
      this.#layout = createDefaultLayout({ visibleRows: this.#visibleRows });
      this.#layoutState = LayoutState.new();
      this.#imageCache = ImageCache.new();
      this.#ticker ??= rafTicker();
      this.#unsubscribe = this.#ticker.subscribe(() => this.render());
      this.ready = true;
    })();
    return this.#initializing;
  }

  get hasRun(): boolean {
    return this.#timer !== null;
  }

  /** Read-only access to the timer, e.g. for saving. Don't keep the reference. */
  get timer(): TimerRef | null {
    return this.#timer;
  }

  /** Split rows shown at once (0 = all). Changing it rebuilds the layout. */
  get visibleRows(): number {
    return this.#visibleRows;
  }

  set visibleRows(rows: number) {
    const next = Math.max(0, Math.floor(Number.isFinite(rows) ? rows : 0));
    if (next === this.#visibleRows) return;
    this.#visibleRows = next;
    if (this.#layout) {
      this.#layout[Symbol.dispose]();
      this.#layout = createDefaultLayout({ visibleRows: next });
      this.#invalidate();
    }
  }

  /** Replaces the current run. **Consumes `run`.** Throws if it has no segments. */
  loadRun(run: Run): void {
    if (!this.#layout) {
      run[Symbol.dispose]();
      this.#requireInit();
    }
    const timer = createTimer(run);
    this.#timer?.[Symbol.dispose]();
    this.#timer = timer;
    this.#invalidate();
    this.render();
    // Drop icons of the previous run that the new state no longer references.
    this.#imageCache?.collect();
  }

  /** Parses .lss (or another supported format) and loads it. Throws `RunParseError`. */
  loadSplits(input: string | Uint8Array): void {
    this.#requireInit();
    this.loadRun(parseRun(input));
  }

  splitOrStart(): void {
    this.#command((t) => t.splitOrStart());
  }

  undo(): void {
    this.#command((t) => t.undoSplit());
  }

  skip(): void {
    this.#command((t) => t.skipSplit());
  }

  togglePause(): void {
    this.#command((t) => t.togglePause());
  }

  /** Resets and stores the attempt in the run's history (updates PB/golds like LiveSplit). */
  reset(): void {
    const ok = this.#command((t) => t.reset(true));
    if (ok && this.#timer) this.onReset?.(this.#timer);
  }

  /** Scrolls the split window (only has an effect when not all rows are visible). */
  scrollSplits(direction: 'up' | 'down'): void {
    if (!this.#layout) return;
    if (direction === 'up') this.#layout.scrollUp();
    else this.#layout.scrollDown();
    this.#invalidate();
  }

  /** Updates `view` from the core if needed. Called by the ticker every frame. */
  render(): void {
    const timer = this.#timer;
    const layout = this.#layout;
    if (!timer || !layout || !this.#layoutState || !this.#imageCache) return;
    if (!this.#dirty && this.phase !== 'Running') return;
    this.#dirty = false;
    const { Language } = core();
    const json = layout.updateStateAsJson(
      this.#layoutState,
      this.#imageCache,
      timer,
      Language.English,
    ) as LayoutStateJson;
    this.view = toLayoutView(json);
  }

  /** Stops rendering and frees all wasm objects. */
  destroy(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#timer?.[Symbol.dispose]();
    this.#layout?.[Symbol.dispose]();
    this.#layoutState?.[Symbol.dispose]();
    this.#imageCache?.[Symbol.dispose]();
    this.#timer = this.#layout = this.#layoutState = this.#imageCache = null;
    this.#initializing = null;
    this.view = null;
    this.phase = 'NotRunning';
    this.ready = false;
  }

  /** Runs a timer command; returns whether the core reported success (an Event). */
  #command(run: (timer: Timer) => number): boolean {
    const timer = this.#timer;
    if (!timer) return false;
    const ok = core().isEvent(run(timer));
    this.#invalidate();
    return ok;
  }

  #invalidate(): void {
    this.#dirty = true;
    if (this.#timer) this.phase = phases[this.#timer.currentPhase()] ?? 'NotRunning';
  }

  #requireInit(): void {
    if (!this.#layout) throw new Error('TimerStore.init() has not finished yet');
  }
}

/** The app-wide store. */
export const timerStore = new TimerStore();
