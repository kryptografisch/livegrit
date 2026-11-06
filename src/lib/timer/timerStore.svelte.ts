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
  attemptStats,
  comparisonNames,
  core,
  createDefaultLayout,
  createTimer,
  initCore,
  parseRun,
  runHasGameTime,
  saveRunAsLss,
  type AttemptStats,
  type WasmSource,
} from './core';
import { toLayoutView, type LayoutView } from './layoutView';
import { lssFileName } from './lss';

export type Phase = 'NotRunning' | 'Running' | 'Ended' | 'Paused';

const phases: Record<number, Phase> = {
  0: 'NotRunning',
  1: 'Running',
  2: 'Ended',
  3: 'Paused',
};

export type TimingMethodName = 'RealTime' | 'GameTime';

/** `TimerStore.exportLss()`: the .lss text, a file name and what the saved list shows. */
export interface ExportedLss extends AttemptStats {
  text: string;
  fileName: string;
  game: string;
  category: string;
}

/** Settings that `TimerStore.onSettingsChange` reports. */
export type StoreSetting = 'comparison' | 'timingMethod';

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
  /** Comparisons the loaded run offers (custom + generated), in the core's order. */
  comparisons = $state.raw<string[]>([]);
  /** The current comparison (e.g. "Personal Best"). */
  comparison = $state('');
  timingMethod = $state<TimingMethodName>('RealTime');
  /** Whether the run has any Game Time; the timing method toggle is only offered then. */
  hasGameTime = $state(false);
  /**
   * The run's game and category names. The Timer page header uses these rather than the
   * title component's lines: the core moves the category up to line 1 when there is no
   * game name, so the lines alone don't say which is which.
   */
  gameName = $state('');
  categoryName = $state('');

  /**
   * Called after a successful reset, with the timer (its run already contains the attempt).
   * The storage layer saves the run here.
   */
  onReset: ((timer: TimerRef) => void) | null = null;

  /** Called when an attempt finishes (the last split), e.g. to save the run. */
  onAttemptEnded: ((timer: TimerRef) => void) | null = null;

  /**
   * Called when the user changes a setting through the store (comparison, timing method),
   * e.g. to save it. Not called by `loadRun`.
   */
  onSettingsChange: ((setting: StoreSetting) => void) | null = null;

  #visibleRows = $state(0);
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

  /**
   * True while an attempt is running or paused. A finished attempt (`Ended`) is over: it
   * is already saved and only waits for the reset. Reactive (reads `phase`).
   */
  get attemptInProgress(): boolean {
    return this.phase === 'Running' || this.phase === 'Paused';
  }

  /** Read-only access to the timer, e.g. for saving. Don't keep the reference. */
  get timer(): TimerRef | null {
    return this.#timer;
  }

  /**
   * Split rows shown at once (0 = all). Changing it rebuilds the layout. Set by the
   * storage layer from the Timer layout settings (compact splits).
   */
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
    this.#syncRunInfo();
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

  /** Unloads the run (back to the empty state). The caller checks that no attempt runs. */
  unloadRun(): void {
    if (!this.#timer) return;
    this.#timer[Symbol.dispose]();
    this.#timer = null;
    this.view = null;
    this.phase = 'NotRunning';
    this.comparisons = [];
    this.comparison = '';
    this.timingMethod = 'RealTime';
    this.hasGameTime = false;
    this.gameName = '';
    this.categoryName = '';
  }

  splitOrStart(): void {
    const before = this.phase;
    this.#command((t) => t.splitOrStart());
    if (before !== 'Ended' && this.phase === 'Ended' && this.#timer) {
      this.onAttemptEnded?.(this.#timer);
    }
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
    if (ok && this.#timer) {
      this.#syncRunInfo();
      this.onReset?.(this.#timer);
    }
  }

  /** Switches the comparison; returns false if the run doesn't have it. */
  setComparison(name: string): boolean {
    const ok = this.#command((t) => t.setCurrentComparison(name));
    if (ok) this.onSettingsChange?.('comparison');
    return ok;
  }

  /**
   * Switches between Real Time and Game Time. Note: the core only records Game Time for
   * an attempt when something initializes it (load removal / auto splitter), which the
   * browser can't, so live attempts have no Game Time; the comparisons still show it.
   */
  setTimingMethod(method: TimingMethodName): void {
    const timer = this.#timer;
    if (!timer) return;
    const { TimingMethod } = core();
    timer.setCurrentTimingMethod(TimingMethod[method]);
    this.#invalidate();
    this.onSettingsChange?.('timingMethod');
  }

  /**
   * The run as .lss text plus a file name (`Game - Category.lss`) and its attempt counts,
   * or `null` without a run. Includes the attempt history and, like LiveSplit, the state of
   * a running attempt (a finished one counts as completed).
   */
  exportLss(): ExportedLss | null {
    const timer = this.#timer;
    if (!timer) return null;
    const run = timer.getRun();
    const game = run.gameName();
    const category = run.categoryName();
    const ended = timer.currentPhase() === core().TimerPhase.Ended;
    return {
      text: saveRunAsLss(timer),
      fileName: lssFileName(game, category),
      game,
      category,
      ...attemptStats(run, ended),
    };
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
    this.comparisons = [];
    this.comparison = '';
    this.timingMethod = 'RealTime';
    this.hasGameTime = false;
    this.gameName = '';
    this.categoryName = '';
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
    const timer = this.#timer;
    if (!timer) return;
    this.phase = phases[timer.currentPhase()] ?? 'NotRunning';
    this.comparison = timer.currentComparison();
    this.timingMethod =
      timer.currentTimingMethod() === core().TimingMethod.GameTime ? 'GameTime' : 'RealTime';
  }

  /** Run data that only changes with a new run or a reset (not per frame). */
  #syncRunInfo(): void {
    const timer = this.#timer;
    if (!timer) return;
    const run = timer.getRun();
    this.comparisons = comparisonNames(run);
    this.hasGameTime = runHasGameTime(run);
    this.gameName = run.gameName();
    this.categoryName = run.categoryName();
  }

  #requireInit(): void {
    if (!this.#layout) throw new Error('TimerStore.init() has not finished yet');
  }
}

/** The app-wide store. */
export const timerStore = new TimerStore();
