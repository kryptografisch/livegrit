# livesplit-core API notes (LiveGrit)

Hand-written. The source of truth for the API names used by the app, taken from the generated `index.d.ts` of the build in `BUILD-INFO.md` (commit `f348cf69`).
If something isn't listed here, read `index.d.ts`; don't guess. Update this file whenever the core is rebuilt.

## Package & loading

- Import: `import { Run, Timer, Layout, ... } from 'livesplit-core'` (resolves to `index.js` / `index.d.ts`).
- `index.js` runs `const wasm = await preloadWasm();` at **top level**. The wasm is loaded when the module is first imported, and there's no explicit `init()` call in app code.
- `preloadWasm()` (`preload.js`) calls the wasm-bindgen `init()` from `livesplit_core.js`:
  - If `globalThis.__lscPreload` is set, it's passed as `init({ module_or_path: __lscPreload })` and then deleted. Accepted: `BufferSource | WebAssembly.Module | Response | URL | RequestInfo` (or a Promise of these).
  - Otherwise `init()` fetches `new URL('livesplit_core_bg.wasm', import.meta.url)`. Vite handles this natively and emits the `.wasm` as an asset.
- **Node / Vitest:** `fetch()` of a `file:` URL doesn't work. Set `globalThis.__lscPreload = await readFile(wasmPath)` (or a compiled `WebAssembly.Module`) **before** the first (dynamic) `import('livesplit-core')`. Static imports are hoisted, so use a dynamic import or a setup file.
- The `env` imports of the `unknown` platform are gone: the build uses `wasm-web`, so the clock is `performance.now()` + `Date` via wasm-bindgen. This works in browsers and Node.
- Enum-like params (`lang`, `timingMethod`, `phase`, results) are plain `number`s in the method signatures. Use the exported TS enums.

## Shared output slots (trap!)

Some getters don't return a pointer into the object. They copy the value into **one thread-local slot per type** in the C API (`output_time`, `output_time_span`, `output_str`, … in `capi/src/lib.rs`) and return a `…Ref` to that slot. **The next call of the same kind overwrites it.**

```ts
const pb = seg.personalBestSplitTime(); // TimeRef -> shared TIME slot
const gold = seg.bestSegmentTime(); // overwrites the same slot!
pb.realTime(); // now returns the GOLD, not the PB
```

Read the value out (e.g. `.realTime()?.totalSeconds()`) **before** the next call. Never keep such `TimeRef`/`TimeSpanRef` values around. Affected (checked in `capi/src`): **Time slot**: `Segment.personalBestSplitTime()`, `Segment.bestSegmentTime()`, `Segment.comparison()`, `Timer.currentTime()`, `Attempt.time()`, `SegmentHistoryElement.time()`. **TimeSpan slot**: `Run.offset()`, `Timer.loadingTimes()`, `Attempt.pauseTime()`. Strings are copied into JS when they're returned, so they're safe.

## Memory management (important)

- Every owned class (`Run`, `Timer`, `Layout`, `LayoutState`, `ImageCache`, `TimeSpan`, `ParseRunResult`, components, ...) has **only `[Symbol.dispose]()`**. There is **no `.dispose()` method**.
  - Free with `obj[Symbol.dispose]()` in `try/finally` (no `using` declarations).
  - `Symbol.dispose` is ES2026 (explicit resource management). TypeScript needs `"ESNext.Disposable"` (or `"ESNext"`) in `compilerOptions.lib`.
  - Runtime: browsers without `Symbol.dispose` evaluate the computed key as `"undefined"`, so the method is stored under the key `"undefined"`. `obj[Symbol.dispose]()` still finds it, but it's fragile. `src/lib/timer/disposePolyfill.ts` installs `Symbol.dispose ??= Symbol.for('Symbol.dispose')` and is imported **before** `livesplit-core`, because the class bodies are evaluated at import time.
- Disposing twice is safe: dispose sets `ptr = 0`, and calls on a disposed object throw the string `"this is disposed"`.
- Class tiers: `XRef` (read-only borrow) ⊂ `XRefMut` (mutable borrow) ⊂ `X` (owned, disposable). Only owned objects (`X`) are disposed. `XRef`/`XRefMut` returned by accessors (e.g. `timer.getRun()`, `run.segment(i)`, `timer.currentTime()`) are borrows: never dispose them, and don't keep them after the owner changes.
- **Ownership moves**: these consume their argument and set its `ptr = 0`, so don't dispose it afterwards:
  - `Timer.new(run)` takes the `Run`.
  - `parseResult.unwrap()` consumes the `ParseRunResult` and returns a `Run`.
  - `component.intoGeneric()` consumes the specific component and returns a `Component`.
  - `layout.push(component)` takes the `Component`.
  - `timer.setRun(run)` takes the new `Run` and returns the old `Run | null` (dispose that).
  - `timer.intoRun(updateSplits)` consumes the `Timer` and returns the `Run`.
  - `RunEditor.new(run)` takes the `Run`, and `editor.close()` consumes the editor and returns the `Run`.
  - `run.pushSegment(segment)` takes the `Segment`.

## Parsing a run

```ts
const result = Run.parseString(text, ''); // or Run.parseArray(bytes: Uint8Array, '')
// 2nd arg = loadFilesPath (for relative file refs); '' in the browser
if (!result.parsedSuccessfully()) {
  result[Symbol.dispose]();
  /* error */
}
const run = result.unwrap(); // consumes result
```

Also on `ParseRunResultRef`: `timerKind(): string` (e.g. "LiveSplit"), `isGenericTimer()`.

`RunRef` reads: `gameName()`, `categoryName()`, `extendedCategoryName(region, platform, variables)`, `attemptCount()`, `len()` / `segmentsLen()`, `segment(i): SegmentRef` (`name()`, `personalBestSplitTime(): TimeRef`, `bestSegmentTime()`, `comparison(name): TimeRef`), `comparisonsLen()` / `comparison(i): string`, `customComparisonsLen()` / `customComparison(i)`, `hasBeenModified()`, `clone(): Run`.
`RunRefMut`: `setGameName`, `setCategoryName`, `pushSegment(Segment)`, `markAsModified()`.
New run: `Run.new()` + `Segment.new(name)` + `run.pushSegment(seg)`. `Timer.new` returns `null` for a run with 0 segments.

## Timer

```ts
const timer = Timer.new(run); // Timer | null (null if the run has no segments); consumes run
```

Control (`TimerRefMut`), each returning `CommandResult` (number; `isEvent(r)` tells success from `CommandError`):

| Action            | Method                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| start / split     | `splitOrStart()` (also `start()`, `split()`)                                             |
| skip              | `skipSplit()`                                                                            |
| undo              | `undoSplit()`                                                                            |
| pause / resume    | `togglePause()`, or `togglePauseOrStart()`, `pause()`, `resume()`, `undoAllPauses()`     |
| reset             | `reset(updateSplits: boolean)` (`true` = store the attempt in history / update PB, golds). `resetAndSetAttemptAsPb()` |

`attemptCount()` is incremented when an attempt **starts**; `reset(true)` adds the attempt to the history (`run.attemptHistoryLen()`).

Reads (`TimerRef`): `currentPhase(): number` (`TimerPhase.NotRunning|Running|Ended|Paused`), `currentSplitIndex(): number` (-1 when not running), `currentTime(): TimeRef` (`.realTime()` / `.gameTime()` / `.index(method)` → `TimeSpanRef | null` → `.totalSeconds()`), `currentComparison(): string`, `currentTimingMethod(): number`, `currentAttemptHasNewBestTimes()`, `getRun(): RunRef` (borrow), `isGameTimeInitialized()`.

Events (`Event` enum): `Started, Splitted, Finished, Reset, SplitUndone, SplitSkipped, Paused, Resumed, PausesUndone, PausesUndoneAndResumed, ComparisonChanged, TimingMethodChanged, …`. Errors (`CommandError`, negative): `NoRunInProgress, RunFinished, CantSkipLastSplit, CantUndoFirstSplit, AlreadyPaused, NotPaused, ComparisonDoesntExist, …`.

## Comparisons & timing method

- List: `timer.getRun().comparisonsLen()` / `.comparison(i)`. This includes the generated ones ("Personal Best", "Best Segments", "Average Segments", …) plus custom comparisons.
- Switch: `timer.setCurrentComparison(name): CommandResult` (or `switchToNextComparison()` / `switchToPreviousComparison()`).
- Timing method: `timer.setCurrentTimingMethod(TimingMethod.RealTime | TimingMethod.GameTime)`, `toggleTimingMethod()`, `currentTimingMethod()`.
- There's no "run has game time" flag. Derive it, e.g. any `run.segment(i).personalBestSplitTime().gameTime() !== null` (`runHasGameTime()` in `core.ts` also checks the best segments).
- `setCurrentTimingMethod` returns `void`; `setCurrentComparison` returns a `CommandResult` (error `ComparisonDoesntExist`).
- **Game Time of a live attempt is `None`** unless something calls `timer.initializeGameTime()` (it's uninitialized again for each new attempt; `isGameTimeInitialized()`). Without that, the attempt records no Game Time split times; with it, Game Time = Real Time minus loading times set via `setLoadingTimes` / `pauseGameTime`. The browser has no game-time source, so the app doesn't initialize it: in Game Time mode the comparisons/PB show Game Time, the live timer doesn't.

## Layout & per-frame state

Build a layout in code (the components are consumed by `intoGeneric()` + `push`):

```ts
const layout = Layout.new(); // or Layout.defaultLayout(Language.English)
layout.push(TitleComponent.new().intoGeneric());
layout.push(SplitsComponent.new(Language.English).intoGeneric());
layout.push(TimerComponent.new().intoGeneric());
layout.push(PreviousSegmentComponent.new().intoGeneric());
layout.push(SumOfBestComponent.new().intoGeneric());
layout.push(PossibleTimeSaveComponent.new().intoGeneric());
```

Per frame (reuse the state objects; create them once):

```ts
const imageCache = ImageCache.new();
const state = LayoutState.new();
// each rAF:
const json: LayoutStateJson = layout.updateStateAsJson(state, imageCache, timer, Language.English);
```

- `updateStateAsJson(state, imageCache, timer, lang): any` → cast to `LayoutStateJson`. `updateState(...)` (no JSON) + typed accessors on `LayoutStateRef` (`len()`, `componentType(i)`, `componentAsTimer(i)`, …) is the allocation-free alternative.
- One-off: `layout.stateAsJson(imageCache, timer, lang)` (allocates a new state each time; avoid per frame).
- `imageCache.collect()` occasionally (e.g. when a run is loaded) to drop unused icons.
- Splits scrolling: `layout.scrollUp()` / `scrollDown()`.
- Layout settings: `layout.settingsAsJson()`, `Layout.parseJson(settings)`, `Layout.parseOriginalLivesplitString(xml)`.
- `lang`: the `Language` enum (`Language.English = 0`). The build has no `localization` feature, so the strings are English anyway.

`LayoutStateJson` = `{ components: ComponentStateJson[], direction, timer_font, times_font, text_font, background, thin_separators_color, separators_color, text_color }`.
`ComponentStateJson` is a tagged union: `{ Title } | { Splits } | { Timer } | { KeyValue } | { DetailedTimer } | { Graph } | { Text } | { BlankSpace } | { Separator: null }`.

- `TimerComponentStateJson`: `time` (e.g. `"1:23"`), `fraction` (e.g. `".45"`), `semantic_color`, `top_color`, `bottom_color`, `height`, `updates_frequently`.
- `TitleComponentStateJson`: `line1: string[]`, `line2: string[]` (abbreviation candidates; the **last** element is the full, unabbreviated value), `attempts: number | null`, `finished_runs: number | null`, `icon`, `is_centered`.
- `SplitsComponentStateJson`: `splits: SplitStateJson[]` (`name`, `columns: SplitColumnState[]` (`value`, `semantic_color`, `visual_color`), `is_current_split`, `index`, `is_indented`, `show_separator_before`, …), `column_labels`, `current_split_gradient`. Columns and labels are listed **right to left** (default: `[split time, delta]`).
  - Row window: `SplitsComponent.setVisualSplitCount(n)` (default 16, `0` = all), `setSplitPreviewCount`, `setAlwaysShowLastSplit`, `setShowGapSeparators`. Only settable before `intoGeneric()`; afterwards rebuild the layout.
  - **Blank filler rows**: with `fill_with_blank_space` (default on, no setter in the bindings) the list is padded up to the visible count with rows that have `name: ''`, `columns: []` and an `index` near `usize::MAX` (even). Group header rows use odd indices near `usize::MAX`; segment rows use the segment index.
  - Segment groups are collapsed into one header row per group except the group of the current split.
- `KeyValueComponentStateJson` (previous segment, sum of best, possible time save, …): `key`, `value`, `semantic_color`, `key_abbreviations`.
- `SemanticColor` = `"Default" | "AheadGainingTime" | "AheadLosingTime" | "BehindLosingTime" | "BehindGainingTime" | "BestSegment" | "NotRunning" | "Paused" | "PersonalBest"`. Map it to CSS tokens and ignore the RGBA `Color`s.

## Saving to .lss

- `timer.saveAsLss(): string` (includes the current state; `saveAsLssBytes(): Uint8Array` also exists).
- `run.saveAsLss(): string` for a standalone `Run`.
- After saving: `timer.markAsUnmodified()`. Check with `timer.getRun().hasBeenModified()`.

## Run editing (new empty run, later steps)

`RunEditor.new(run): RunEditor | null` (consumes run) → `setGameName`, `setCategoryName`, `activeSetName`, `insertSegmentBelow`, `selectOnly(i)`, `addComparison`, `removeComparison`, … → `editor.close(): Run`. `stateAsJson(imageCache, lang): RunEditorStateJson`.
