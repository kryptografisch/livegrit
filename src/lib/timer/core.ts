// Loads the livesplit-core WASM once and exposes typed helpers around it.
// API names: vendor/livesplit-core/API-NOTES.md.
//
// livesplit-core instantiates its wasm with a top-level await when the module is first
// imported, so it is only imported dynamically here (in `initCore`). Everything else in the
// app imports livesplit-core with `import type` only and calls `initCore()` before using it.

import './disposePolyfill';
import type * as Lsc from 'livesplit-core';
import type { Layout, Run, RunRef, Timer, TimerRef } from 'livesplit-core';

export type LscModule = typeof Lsc;

/** Precompiled module or raw wasm bytes (Node/Vitest, where `fetch(file:)` doesn't work). */
export type WasmSource = BufferSource | WebAssembly.Module;

let lsc: LscModule | null = null;
let loading: Promise<LscModule> | null = null;

/**
 * Loads livesplit-core (and its wasm) once; later calls return the same promise.
 * In the browser, call it without arguments: the wasm is fetched via
 * `new URL('livesplit_core_bg.wasm', import.meta.url)`, which Vite emits as an asset.
 * In Node, pass the wasm bytes.
 */
export function initCore(wasm?: WasmSource): Promise<LscModule> {
  loading ??= (async () => {
    if (wasm) {
      // Read (and deleted) by livesplit-core's preload.js when the module is evaluated.
      (globalThis as { __lscPreload?: WasmSource }).__lscPreload = wasm;
    }
    const mod = await import('livesplit-core');
    lsc = mod;
    return mod;
  })();
  return loading;
}

/** The loaded module. Throws if `initCore()` hasn't finished yet. */
export function core(): LscModule {
  if (!lsc) throw new Error('livesplit-core is not loaded yet: await initCore() first');
  return lsc;
}

export class RunParseError extends Error {
  constructor(message = 'The file could not be read as a splits file.') {
    super(message);
    this.name = 'RunParseError';
  }
}

/**
 * Parses a splits file (.lss and the other formats livesplit-core understands).
 * Returns an owned `Run`: the caller disposes it or hands it to `createTimer`.
 * Throws `RunParseError` if the content can't be parsed.
 */
export function parseRun(input: string | Uint8Array): Run {
  const { Run } = core();
  const result = typeof input === 'string' ? Run.parseString(input, '') : Run.parseArray(input, '');
  if (!result.parsedSuccessfully()) {
    result[Symbol.dispose]();
    throw new RunParseError();
  }
  return result.unwrap(); // consumes `result`
}

export class EmptyRunError extends Error {
  constructor(message = 'The run has no segments.') {
    super(message);
    this.name = 'EmptyRunError';
  }
}

/**
 * Creates a Timer for the run. **Consumes `run`** (also when it fails), so don't use or
 * dispose it afterwards. Throws `EmptyRunError` if the run has no segments.
 */
export function createTimer(run: Run): Timer {
  const timer = core().Timer.new(run);
  if (!timer) throw new EmptyRunError();
  return timer;
}

/**
 * A new run without times: game, category and one segment per name. Returns an owned
 * `Run` (dispose it or hand it to `createTimer`). With no names it has no segments, so
 * `createTimer` would refuse it.
 */
export function createRun(game: string, category: string, segmentNames: readonly string[]): Run {
  const { Run, Segment } = core();
  const run = Run.new();
  try {
    run.setGameName(game);
    run.setCategoryName(category);
    for (const name of segmentNames) run.pushSegment(Segment.new(name)); // consumes the segment
  } catch (error) {
    run[Symbol.dispose]();
    throw error;
  }
  return run;
}

/** Saves the timer's run (incl. the current attempt state) as .lss text. */
export function saveRunAsLss(timer: TimerRef): string {
  return timer.saveAsLss();
}

/** Segment names in order. */
export function segmentNames(run: RunRef): string[] {
  const names: string[] = [];
  for (let i = 0; i < run.len(); i++) names.push(run.segment(i).name());
  return names;
}

/** All comparisons the run offers (custom ones + the generated ones), in the core's order. */
export function comparisonNames(run: RunRef): string[] {
  const names: string[] = [];
  for (let i = 0; i < run.comparisonsLen(); i++) names.push(run.comparison(i));
  return names;
}

export interface AttemptStats {
  /** Attempts started with these splits (`attemptCount`, as the title shows it). */
  attempts: number;
  /** Attempts that reached the end: a final Real Time in the history (like the core's title). */
  completed: number;
}

/**
 * Attempt counts of the run. `currentEnded`: the timer's attempt just finished and isn't in
 * the history yet (it is in a saved .lss), so it counts as completed.
 */
export function attemptStats(run: RunRef, currentEnded = false): AttemptStats {
  let completed = currentEnded ? 1 : 0;
  for (let i = 0; i < run.attemptHistoryLen(); i++) {
    // `time()` uses the shared Time slot: read it out right away.
    if (run.attemptHistoryIndex(i).time().realTime() !== null) completed++;
  }
  return { attempts: run.attemptCount(), completed };
}

/** One attempt of the run's history, read out of the core (times in ms). */
export interface AttemptEntry {
  /** The attempt's id in the history (shown as "#3"; unique within the run). */
  index: number;
  /** When it started / ended (`Date.now()` style); `null` if the file doesn't say. */
  started: number | null;
  ended: number | null;
  /** The final time (the last split) in the timing method; `null` = not finished (reset). */
  time: number | null;
  /**
   * Segment times per segment, in segment order; `null` = no time (skipped, or not reached
   * before the reset). After a skipped segment, the next time covers both segments.
   */
  segments: (number | null)[];
}

/** An `AtomicDateTime` as `Date.now()` style ms. **Consumes** (disposes) it. */
function takeDateTime(value: { toRfc3339(): string; [Symbol.dispose](): void } | null) {
  if (!value) return null;
  try {
    const ms = Date.parse(value.toRfc3339());
    return Number.isNaN(ms) ? null : ms;
  } finally {
    value[Symbol.dispose]();
  }
}

/**
 * The attempt history of the run in the core's order (oldest first), with the segment times
 * of each attempt from the segments' histories. `timingMethod`: the core's `TimingMethod`.
 * `TimeRef`s share one output slot, so each value is read out right away.
 */
export function attemptHistory(run: RunRef, timingMethod: number): AttemptEntry[] {
  const entries: AttemptEntry[] = [];
  const byIndex = new Map<number, AttemptEntry>();
  const segmentCount = run.len();
  for (let i = 0; i < run.attemptHistoryLen(); i++) {
    const attempt = run.attemptHistoryIndex(i);
    const time = attempt.time().index(timingMethod)?.totalSeconds() ?? null;
    const entry: AttemptEntry = {
      index: attempt.index(),
      started: takeDateTime(attempt.started()),
      ended: takeDateTime(attempt.ended()),
      time: time === null ? null : Math.round(time * 1000),
      segments: new Array<number | null>(segmentCount).fill(null),
    };
    entries.push(entry);
    byIndex.set(entry.index, entry);
  }
  for (let s = 0; s < segmentCount; s++) {
    const iter = run.segment(s).segmentHistory().iter();
    try {
      for (let element = iter.next(); element; element = iter.next()) {
        const entry = byIndex.get(element.index());
        if (!entry) continue; // ids ≤ 0: route change artifacts, not attempts
        const seconds = element.time().index(timingMethod)?.totalSeconds();
        if (seconds !== undefined) entry.segments[s] = Math.round(seconds * 1000);
      }
    } finally {
      iter[Symbol.dispose]();
    }
  }
  return entries;
}

/**
 * Split times (the run time at the end of each segment) from segment times: the running
 * sum. A segment without a time has no split time either; the sum carries on past it (the
 * next segment time covers the skipped one).
 */
export function splitTimesOf(segments: readonly (number | null)[]): (number | null)[] {
  let total = 0;
  return segments.map((time) => {
    if (time === null) return null;
    total += time;
    return total;
  });
}

/** The stored best times of a run in one timing method (ms per segment, `null` = none). */
export interface BestTimes {
  /** Personal Best split times. */
  pb: (number | null)[];
  /** Best segment times (golds). */
  golds: (number | null)[];
}

/** PB split times and golds of the run in `timingMethod` (the core's `TimingMethod`). */
export function bestTimes(run: RunRef, timingMethod: number): BestTimes {
  const ms = (seconds: number | undefined) =>
    seconds === undefined ? null : Math.round(seconds * 1000);
  const pb: (number | null)[] = [];
  const golds: (number | null)[] = [];
  for (let i = 0; i < run.len(); i++) {
    const segment = run.segment(i);
    // Shared Time slot: read each value out before the next call.
    pb.push(ms(segment.personalBestSplitTime().index(timingMethod)?.totalSeconds()));
    golds.push(ms(segment.bestSegmentTime().index(timingMethod)?.totalSeconds()));
  }
  return { pb, golds };
}

/** One time in a segment's history (`index` ≤ 0: kept from route changes, not a run). */
export interface SegmentHistoryTime {
  index: number;
  ms: number;
}

/** Every time in segment `segment`'s history in `timingMethod` (entries without one skipped). */
export function segmentHistoryTimes(
  run: RunRef,
  segment: number,
  timingMethod: number,
): SegmentHistoryTime[] {
  const times: SegmentHistoryTime[] = [];
  const iter = run.segment(segment).segmentHistory().iter();
  try {
    for (let element = iter.next(); element; element = iter.next()) {
      const index = element.index();
      const seconds = element.time().index(timingMethod)?.totalSeconds();
      if (seconds !== undefined) times.push({ index, ms: Math.round(seconds * 1000) });
    }
  } finally {
    iter[Symbol.dispose]();
  }
  return times;
}

/** Typed time text ("1:02.45", "62.45") as ms, read by the core's parser; `null` if unreadable. */
export function parseTimeText(text: string): number | null {
  const { Language, TimeSpan } = core();
  const span = TimeSpan.parse(text.trim(), Language.English);
  if (!span) return null;
  try {
    return Math.round(span.totalSeconds() * 1000);
  } finally {
    span[Symbol.dispose]();
  }
}

/** ms as text the core's time parser reads back exactly ("1:02:03.456"); "" for `null`. */
export function coreTimeText(ms: number | null): string {
  if (ms === null) return '';
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor(total / 60_000) % 60;
  const s = Math.floor(total / 1000) % 60;
  const pad = (n: number, digits = 2) => String(n).padStart(digits, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(total % 1000, 3)}`;
}

/**
 * Whether the run has any Game Time (there's no flag in the core): a PB split time or a
 * best segment with Game Time. `TimeRef`s share one output slot, so each value is read out
 * right away.
 */
export function runHasGameTime(run: RunRef): boolean {
  for (let i = 0; i < run.len(); i++) {
    const segment = run.segment(i);
    if (segment.personalBestSplitTime().gameTime() !== null) return true;
    if (segment.bestSegmentTime().gameTime() !== null) return true;
  }
  return false;
}

export interface LayoutOptions {
  /**
   * How many split rows the core shows at once (0 = all). The core moves this window along
   * with the current split (keeping the last split visible).
   */
  visibleRows?: number;
}

/**
 * The default layout, built in code: title, splits, timer, previous segment,
 * sum of best, possible time save. Owned: the caller disposes it.
 */
export function createDefaultLayout(options: LayoutOptions = {}): Layout {
  const {
    Language,
    Layout,
    PossibleTimeSaveComponent,
    PreviousSegmentComponent,
    SplitsComponent,
    SumOfBestComponent,
    TimerComponent,
    TitleComponent,
  } = core();
  const layout = Layout.new();
  // `intoGeneric()` consumes the specific component and `push` takes the generic one.
  layout.push(TitleComponent.new().intoGeneric());
  const splits = SplitsComponent.new(Language.English);
  if (options.visibleRows !== undefined) {
    splits.setVisualSplitCount(Math.max(0, Math.floor(options.visibleRows)));
  }
  layout.push(splits.intoGeneric());
  layout.push(TimerComponent.new().intoGeneric());
  // Key/value components: keep this order in step with `INFO_IDS` (layoutView).
  layout.push(PreviousSegmentComponent.new().intoGeneric());
  layout.push(SumOfBestComponent.new().intoGeneric());
  layout.push(PossibleTimeSaveComponent.new().intoGeneric());
  return layout;
}
