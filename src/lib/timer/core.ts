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

/**
 * Creates a Timer for the run. **Consumes `run`** (also when it fails), so don't use or
 * dispose it afterwards. Throws if the run has no segments.
 */
export function createTimer(run: Run): Timer {
  const timer = core().Timer.new(run);
  if (!timer) throw new Error('A run needs at least one segment to create a timer.');
  return timer;
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

/**
 * The default layout, built in code: title, splits, timer, previous segment,
 * sum of best, possible time save. Owned: the caller disposes it.
 */
export function createDefaultLayout(): Layout {
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
  layout.push(SplitsComponent.new(Language.English).intoGeneric());
  layout.push(TimerComponent.new().intoGeneric());
  layout.push(PreviousSegmentComponent.new().intoGeneric());
  layout.push(SumOfBestComponent.new().intoGeneric());
  layout.push(PossibleTimeSaveComponent.new().intoGeneric());
  return layout;
}
