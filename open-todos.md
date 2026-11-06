# Open Todos: First Prototype (plan.md milestones 1–6)

Each step = one session = one commit (the developer commits; never run git).
At the start of a session, read `CLAUDE.md`, `plan.md` and **only** the step you were pointed at, plus the "Decisions" section below.
When a step is done, tick its checkboxes, fill in "Notes / deviations" under that step, and update the Decisions section if anything changed.

---

## Decisions (override plan.md where they differ)

| Topic                  | Decision                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project location       | App lives at the project root `split-lite/`, **not** `splitter/` (plan.md §3 is outdated: there is no existing scaffold, start from scratch).                                                                                                                                                                                                                                                    |
| Reference repos        | `livesplit-core-master/` and `LiveSplitOne-master/` stay in the project folder as **read-only references**, git-ignored (never committed). Read them for ideas; never import from, build in, or depend on them in code or scripts.                                                                                                                                                               |
| livesplit-core source  | Cloned **only inside the Podman build container**, at a pinned commit SHA recorded in the build script.                                                                                                                                                                                                                                                                                          |
| Build toolchain        | No Rust on the host. Build runs in Podman (`docker.io/library/rust` image, Rust ≥ 1.97 because livesplit-core requires `rust-version = 1.97`). The developer approves/runs the podman command.                                                                                                                                                                                                   |
| Built core             | Committed to `vendor/livesplit-core/` with `package.json`, consumed as `"livesplit-core": "file:./vendor/livesplit-core"`.                                                                                                                                                                                                                                                                       |
| Core features          | `parsing,run-saving,timing,run-editing,layouts`, built with `--no-default-features`. No hotkeys, server-protocol, web-rendering, therun-gg, auto-splitting or localization (English only). Plus `wasm-web` (step 2): it adds no API, but without it the wasm imports `env.Date_now`/`env.Instant_now` from the host; with it the core uses `performance.now()`/`Date` incl. the sleep-drift fix. |
| WASM loading           | Use wasm-bindgen `--target web` output: a self-contained ES module whose `init()` loads the wasm via `new URL('….wasm', import.meta.url)`, which Vite handles natively. So `vite-plugin-wasm` / `vite-plugin-top-level-await` (needed only for `--target bundler` style direct `.wasm` imports) are not needed (deviation from plan.md §3). Add them only if a real problem shows up.            |
| LiveSplit One          | Only a reference for ideas. Don't copy its code or structure; decide what's best for this project.                                                                                                                                                                                                                                                                                               |
| Versions               | Always the newest stable versions that work together (check the npm registry when writing `package.json`).                                                                                                                                                                                                                                                                                       |
| Docs                   | Local docs live in `docs/` (e.g. `docs/llms-small.txt` for Svelte 5). Other docs are fetched on demand when a step needs them (e.g. vite-plugin-pwa in step 11).                                                                                                                                                                                                                                 |
| Explicit resource mgmt | Do not use `using` declarations (needs a Babel transform for Safari). The bindings have **no `.dispose()`**, only `[Symbol.dispose]()`: call `obj[Symbol.dispose]()` in `try/finally`. Needs TS lib `ESNext.Disposable` and a `Symbol.dispose` polyfill imported before `livesplit-core` (see `API-NOTES.md`).                                                                                   |
| Node                   | v24 (host). TypeScript 6.x (svelte-check doesn't support 7 yet).                                                                                                                                                                                                                                                                                                                                 |
| npm installs           | Claude writes `package.json` with exact (pinned) versions, then **asks permission** to run `npm install`. Claude never installs anything silently.                                                                                                                                                                                                                                               |
| Tests                  | Vitest from step 2 on.                                                                                                                                                                                                                                                                                                                                                                           |
| Temp files             | Use `tmp/` in this project (git-ignored).                                                                                                                                                                                                                                                                                                                                                        |
| Pages                  | Two pages: **Timer** (minimal: only what's needed during a run) and **Settings** (sections: Controls, Runs (.lss import/export), Timer). Steps 6–11 still build on the "Controls" page; step 12 renames it to Settings and regroups everything. Temporary controls on the Timer page (step 5 toolbar, Rows input) are removed in step 12.                                                        |

---

## Step 1: Project init (Vite + Svelte 5 + TS + Vitest scaffold)

**Goal:** a runnable empty app with the final folder structure, so `npm run dev` works before any livesplit-core work.

- [x] Extend the existing `.gitignore` (keep its `livesplit*/` and `LiveSplit*/` entries): `node_modules/`, `dist/`, `dev-dist/`, `tmp/`.
- [x] `package.json` (newest stable versions, verified against the npm registry): `vite`, `svelte@5`, `@sveltejs/vite-plugin-svelte`, `typescript`, `svelte-check`, `vitest`, `idb`. livesplit-core is added in step 3, and the PWA plugin in step 11. Scripts: `dev`, `build`, `preview`, `check`, `test`.
- [x] Ask permission to run `npm install`.
- [x] `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `index.html`, `src/main.ts`, `src/App.svelte` with a hash router (`#/` Timer, `#/controls` Controls), and placeholder `pages/TimerPage.svelte` + `pages/ControlsPage.svelte` with navigation between them.
- [x] `src/styles/tokens.css` (dark LiveSplit-like placeholder tokens: bg, text, ahead/behind gain/loss shades, gold, paused, not-running, fonts, spacing) + `global.css`. Components use tokens only.
- [x] Folder structure from plan.md §5 (empty modules with a one-line comment are fine), plus `scripts/`, `vendor/`, `tests/fixtures/`, `docs/`.
- [x] ~~Copy sample split files from livesplit-core into `tests/fixtures/`~~ → replaced by our own generated fixtures (see notes).
- [x] `README.md`: what the project is, prerequisites (Node 24; Podman only for rebuilding the core), `npm run dev/build/preview/check/test`, project structure overview, and the browser focus limitation.
- [x] One trivial Vitest test so `npm run test` passes.

**Commands needing approval:** `npm install`, then `npm run dev` / `check` / `test` / `build`.
**Acceptance:** `npm run dev` serves both pages and the hash links switch between them; `npm run check`, `npm run test` and `npm run build` are clean.
**Commit:** `chore: project init (vite + svelte 5 + ts scaffold, readme)`

Notes / deviations:

- Done. Versions pinned exactly: vite 8.3.6, svelte 5.57.3, @sveltejs/vite-plugin-svelte 7.3.1, typescript 6.0.3, svelte-check 4.7.8, vitest 5.1.0, idb 8.0.4, @types/node 24.19.2.
- TypeScript 6 instead of 5: svelte-check 4.7.8 supports `^5 || ^6` (not 7).
- `.gitignore`: reference repo patterns anchored to the root (`/livesplit*/`), otherwise they would also ignore `vendor/livesplit-core/`.
- `npm run check` passes `--config ./svelte.config.js`; without it svelte-check also loads `LiveSplitOne-master/vite.config.ts` and prints an unresolved-import warning.
- Router lives in `src/lib/router.svelte.ts` (not inside App.svelte). Vitest config is in `vite.config.ts` (`tests/**/*.test.ts`, node env). `src/lib/input/types.ts` already has the real `Action` type, which the trivial test covers.
- `npm audit`: 2 low-severity issues (deepmerge, via @sveltejs/vite-plugin-svelte; no fix available upstream). Dev-only, accepted.
- Verified: `check` 0 errors/warnings, `test` 2/2 passed, `build` OK, the dev server serves the app.
- Added Prettier (3.9.10 + prettier-plugin-svelte 4.1.1): `.prettierrc.json` (single quotes, width 100, trailing commas), `.prettierignore` (reference repos, vendor/, fixtures, downloaded docs, lockfile), scripts `format` / `format:check`.
- Later (after step 2): the copied livesplit-core fixtures (and their `LICENSE-*`) were replaced by our own files, generated by `tests/fixtures/generate.mjs`: `real-time.lss`, `game-time.lss`, `segment-groups.lss`, `new-run.lss` (valid) and `invalid.lss` (parse error). All 4 valid ones were verified with the vendored core: parse, save/re-parse round trip, `Timer.new`. See `tests/fixtures/README.md`. The repo is licensed Apache-2.0 (`LICENSE`).

---

## Step 2: Build livesplit-core to WASM in Podman

**Goal:** a reproducible, containerized build that outputs an npm-installable `vendor/livesplit-core/`.

- [x] Work out the build from the livesplit-core sources (the `capi/` crate and its feature list, `capi/bind_gen` for the TypeScript bindings, and the wasm-bindgen CLI version matching the crate). Design our own build; don't copy the LiveSplit One scripts.
- [x] `scripts/livesplit-core.Containerfile`: rust image (≥ 1.97), `wasm32-unknown-unknown` target, git, matching `wasm-bindgen-cli`.
- [x] `scripts/build-livesplit-core.sh` (runs on host, calls podman). Inside the container it:
  - clones `https://github.com/LiveSplit/livesplit-core` and checks out the pinned `LSC_COMMIT` (variable at the top of the script; first run: pick current master HEAD and record it),
  - builds the bindings + wasm (`--target web`) with our feature list,
  - copies the output to `/out`, which is mounted to `vendor/livesplit-core/`,
  - uses a named podman volume for the cargo registry/target cache so rebuilds are fast.
- [x] `docs/build-livesplit-core.md`: our own instructions: prerequisites (Podman only), how to run the script, how to bump `LSC_COMMIT`, how to change features, what the output contains, and troubleshooting.
- [x] `vendor/livesplit-core/`: `livesplit_core.js`, `livesplit_core_bg.wasm`, `.d.ts` files, `index.ts`, `preload.ts`, `LICENSE-*`, a hand-written `package.json` (`name: livesplit-core`, `type: module`, `exports`/`types` pointing at the right entry), and `BUILD-INFO.md` (commit SHA, rust version, wasm-bindgen version, features, date, wasm size).
- [x] Read the generated `index.ts`/`.d.ts` and write `vendor/livesplit-core/API-NOTES.md`: the exact names for parsing a run, Timer create/split/skip/undo/pause/reset, Layout/LayoutState JSON, comparisons, timing method, run save to `.lss`, and dispose. **Later steps rely on this file instead of memory.**
- [x] README: add a short "Rebuilding livesplit-core" section that links to `docs/build-livesplit-core.md`.

**Commands needing approval:** `podman build …`, `podman run …` (the developer runs them or approves them).
**Acceptance:** the script runs end to end from a clean state; `vendor/livesplit-core/` contains the wasm + glue + API notes.
**If the build fails:** stop and report. Don't fall back to a hand-rolled timer (plan.md §4).
**Commit:** `build: containerized livesplit-core wasm build, vendored output`

Notes / deviations:

- Done. Pinned: livesplit-core `f348cf69180ba910df9450c4d64079a7695572db` (master, 2026-10-31), `rust:1.99.1-trixie`, wasm-bindgen(-cli) 0.2.130, `node:24.19.0-trixie-slim` + TypeScript 6.0.3 (for `tsc` only), cargo profile `max-opt` (upstream's: LTO, 1 CGU, strip). Wasm: 1,319,167 bytes (1288 KiB).
- Features: `parsing,run-saving,timing,run-editing,layouts,wasm-web` (see the Decisions table for why `wasm-web` is needed). No default features, so no localization, hotkeys or image-shrinking.
- Script layout: `scripts/build-livesplit-core.sh` (host: all pins at the top, `--clean`, `--update-lock`), `scripts/livesplit-core.Containerfile` (image), `scripts/livesplit-core-build-inner.sh` (runs in the container, copied into the image). Volumes: `split-lite-lsc-build` (checkout + target dir) and `split-lite-lsc-cargo` (registry).
- Extra (not in the plan): upstream has no `Cargo.lock`, so the resolved lock is vendored as `vendor/livesplit-core/Cargo.lock` and reused with `--locked`. The script also verifies that the wasm-bindgen crate version equals the CLI version. Verified reproducible: a `--clean` rebuild gave a byte-identical wasm (same SHA-256).
- Extra: bind_gen's `index.ts`/`preload.ts` are compiled with `tsc` in the container to `index.js`/`.d.ts` and `preload.js`/`.d.ts`, so the package ships plain JS + types (the app never type-checks the generated TS). The `.ts` sources stay for reference. Patch: `from "./preload"` → `"./preload.js"` (ESM needs extensions). `package.json` exports `.` → `index.js` / `index.d.ts`.
- Only fetches the pinned commit (`git fetch --depth 1 <sha>`), not the full clone.
- Findings for step 3 (details in `API-NOTES.md`): `index.js` loads the wasm via top-level await on import (no explicit `init()` call); in Node set `globalThis.__lscPreload` to the wasm bytes before the dynamic import. Objects have only `[Symbol.dispose]()`; add `ESNext.Disposable` to the tsconfig `lib` and a `Symbol.dispose` polyfill.
- The first build attempt failed in `tsc` (`Symbol.dispose` not in `lib es2022`). Fixed with `--lib es2022,esnext.disposable,dom`.

---

## Step 3: Core wrapper + smoke test

- [x] Add `"livesplit-core": "file:./vendor/livesplit-core"` to `package.json` and ask permission to run `npm install`.
- [x] `src/lib/timer/core.ts`: load the WASM once (`init()`), expose typed helpers based on `API-NOTES.md`: `parseRun(text)`, `createTimer(run)`, `saveRunAsLss(timer)`, plus a default `Layout` built in code (title, splits, timer, previous segment, sum of best, possible time save).
- [x] Confirm that the `.wasm` loads in the Vite dev server **and** in `vite build && vite preview` with MIME type `application/wasm`. Add the wasm/TLA plugins only if needed and record that in Decisions.
- [x] Vitest smoke test (Node): read `tests/fixtures/real-time.lss`, parse it, create a Timer, start, split, read the current time > 0, save to `.lss`, re-parse, and check that the segment names are equal. In Node, initialize with the wasm bytes from `fs`.

**Acceptance:** smoke test green; the browser console shows the parsed game name on the Timer page.
**Commit:** `feat(core): livesplit-core wrapper and smoke test`

Notes / deviations:

- Done. `npm install` only symlinks `node_modules/livesplit-core` → `vendor/livesplit-core`.
- Loading: there's no `init()` to call (the package loads its wasm with top-level await on import). `core.ts` therefore imports `livesplit-core` **only dynamically**, in `initCore(wasm?)` (memoized promise); everything else uses `import type`. `core()` returns the loaded module synchronously (throws before init). In Node the wasm bytes are passed to `initCore(bytes)`, which sets `globalThis.__lscPreload`. Side effect: Vite puts the core in its own lazy chunk (`livesplit-core-*.js`, 68 kB + 1.3 MB wasm).
- Helpers: `initCore`, `core`, `parseRun(string | Uint8Array)` (throws `RunParseError`), `createTimer(run)` (consumes the run, also on failure; throws for 0 segments), `saveRunAsLss(timer)`, `segmentNames(run)`, `createDefaultLayout()`.
- `Symbol.dispose` polyfill in `src/lib/timer/disposePolyfill.ts`, imported first by `core.ts`. `tsconfig.json` `lib` += `ESNext.Disposable`.
- No wasm/TLA plugins needed. Added `optimizeDeps.exclude: ['livesplit-core']` in `vite.config.ts` as a safeguard, so dep pre-bundling never moves the glue away from its `.wasm` (linked packages aren't pre-bundled anyway).
- Verified with curl: dev server and `vite preview` both serve the wasm as `application/wasm` (200). The fixture text isn't in the production bundle (dev-only `?raw` import).
- Timer page: `initCore()` on mount in all modes (otherwise the build tree-shakes the core away and preview can't be checked); in dev it also logs `[livesplit-core] parsed run: Pixel Quest / …`. Step 4 replaces this.
- Tests: `tests/core.test.ts` (init once; the smoke round trip; default layout renders Title, Splits, Timer + 3 KeyValue; `invalid.lss` → `RunParseError`). `check`, `test` (6/6), `build` clean.

---

## Step 4: Timer store + Timer page rendering

- [x] `timerStore.svelte.ts`: owns the Timer + Layout; a `requestAnimationFrame` loop that calls the layout's state update → JSON (or typed state accessors) → `$state`. Reuse/dispose the per-frame state objects (no per-frame WASM leaks). The loop pauses when `document.hidden`.
- [x] Actions on the store: `splitOrStart`, `undo`, `skip`, `togglePause`, `reset` (and save-on-reset hook, a no-op for now).
- [x] Timer page UI from the layout state: header (game, category, attempts), split list (name, delta, time, current highlighted, auto-scroll, configurable visible rows), big timer (tabular nums, color from the state's semantic color mapped to tokens), footer (previous segment, possible time save, sum of best).
- [x] Temporary on-screen buttons for the 5 actions.
- [x] Load `tests/fixtures/real-time.lss` by default (dev only) until import exists.

**Acceptance:** a full run with the buttons works; deltas and colors match what livesplit-core reports; no memory growth over a few minutes in devtools.
**Commit:** `feat(timer): reactive timer store and timer page`

Notes / deviations:

- Done, except the manual acceptance checks (full run with the buttons in the browser, colors, devtools memory over a few minutes): for the developer.
- Shared ticker `src/lib/ticker.ts` (extra): one rAF loop for the app, stops while `document.hidden` (`visibilitychange`) and when it has no listeners. Step 7's gamepad polling subscribes to it. `ManualTicker` for tests.
- `src/lib/timer/layoutView.ts` (extra): pure mapping `LayoutStateJson` → small view model (`title`, `splits`, `timer`, `info[]`) plus `semanticColorVar()` (semantic color → `var(--color-…)` token). Columns are reversed to left-to-right. The RGBA colors from the core are ignored.
- Store (`TimerStore` class, singleton `timerStore`): `init()`, `loadRun(run)` (consumes), `loadSplits(text|bytes)`, the 5 actions, `scrollSplits()`, `visibleRows`, `onReset` hook (no-op), `render()`, `destroy()`. `view` is `$state.raw` and replaced as a whole per render; `phase` is updated after each command. One `LayoutState` + `ImageCache` reused for every frame (`updateStateAsJson`), so no per-frame wasm allocations.
- Render only when needed: every frame while `Running`, otherwise only after a change (action, new run, scroll, row count). Idle/paused/ended costs nothing per frame.
- `reset()` uses `reset(true)` (attempt goes into the history, PB/golds updated), without LiveSplit's "update splits?" prompt.
- Visible rows: default 10 (`0` = all), set via `SplitsComponent.setVisualSplitCount`, which only works before the component goes into the layout, so changing it rebuilds the layout. The core moves the row window with the current split (keeps the last split visible); the list also `scrollIntoView`s the current row if it overflows, and the mouse wheel scrolls the core's window. Temporary "Rows" input next to the buttons; persisted in step 9, moved in step 8.
- The core pads the list with blank filler rows up to the row count (`fill_with_blank_space`, not settable via the bindings); `layoutView` drops them (no name and no columns).
- `App.svelte` shell is now `height: 100dvh` (was `min-height`) with a scrolling `.page`, so the split list scrolls inside the page instead of the whole page growing.
- `API-NOTES.md` corrected: the title's abbreviation lists end with the full value (not "longest first"). Added: column order, row window settings, blank/group rows, attempt count increments on start.
- Tests: `tests/timerStore.test.ts` (layout view mapping, group headers, color mapping; store: full attempt with all 5 actions, reset hook, render-only-when-needed, row window, filler rows, destroy). `check` 0/0, `test` 16/16, `build` OK; the dev fixture isn't in the production bundle.

---

## Step 5: Import, empty state, comparison & timing method

- [x] `lss.ts`: import from File (picker + drag-and-drop onto the page), with a readable error on parse failure; export to a `.lss` download (Blob + `<a download>`).
- [x] Empty state: "Import a .lss file or create a new run" + import button. Remove the dev default fixture.
- [x] Comparison switching (list what the run offers) and a Real Time / Game Time toggle (only if the run has game time; test with `game-time.lss`). Temporary placement on the Timer page; it moves to Controls in step 8.
- [x] Screen Wake Lock while running (feature-detect; release on pause/reset/finish; re-acquire on `visibilitychange`).
- [x] Vitest: lss round-trip (import → export → import keeps segment names and PB split times) for the 4 valid fixtures, plus a readable error for `invalid.lss`.

**Commit:** `feat(timer): lss import/export, comparisons, timing method, wake lock`

Notes / deviations:

- Done, except the manual browser checks (picker, drag-and-drop, download, wake lock on a real device): for the developer.
- `lss.ts`: `readSplitsFile` (bytes via `file.arrayBuffer()`; the core's `parseArray` detects the encoding; files > 50 MB are refused), `importSplitsFile(store, file)` (returns `null` or a readable message), `importErrorMessage`, `lssFileName(game, category)` (`Game - Category.lss`, invalid file-name chars removed, fallback `splits.lss`), `downloadText` (Blob `application/octet-stream` so Safari doesn't append `.xml`; URL revoked after 10 s).
- Extra: import is **refused while an attempt is in progress** (phase not `NotRunning`, incl. finished-but-not-reset), so a stray drop never throws an attempt away. The Import button is disabled then and the drop overlay says "Reset the current attempt before importing". A failed import keeps the current run (the old timer is only replaced after the new one was created).
- `core.ts`: `EmptyRunError` (was a plain `Error`) → "… has no segments."; new `comparisonNames(run)`, `runHasGameTime(run)` (PB split times or best segments with Game Time).
- Store: `comparisons`, `comparison`, `timingMethod` (`'RealTime' | 'GameTime'`), `hasGameTime` as `$state`; `setComparison(name): boolean`, `setTimingMethod(m)`, `exportLss(): {text, fileName} | null` (`timer.saveAsLss()`, includes a running attempt like LiveSplit). Comparison/timing method are read after every command; the comparison list and `hasGameTime` only on load and reset (not per frame). Export doesn't call `markAsUnmodified()`; step 9 decides what "saved" means.
- **Finding (Game Time):** the core only records Game Time for an attempt after `initializeGameTime()`, which needs a load-removal/auto-splitter source the browser doesn't have. So we don't initialize it: in Game Time mode the comparisons, PB and sum of best show Game Time, but a live attempt has no Game Time (the timer shows none). Documented in `API-NOTES.md`. If the developer wants Game Time = Real Time during attempts, call `initializeGameTime()` on start; that would write Real Time values into the Game Time history, so it's not done.
- UI (temporary): `ImportButton.svelte` (hidden file input, no `accept` filter: the core reads several formats and mobile pickers grey out unknown extensions like `.lss`), `RunToolbar.svelte` below the timer buttons (Import, Export, comparison `<select>`, Real Time / Game Time toggle shown only if `hasGameTime`). Errors show in a dismissible banner at the top of the Timer page.
- Drag-and-drop is handled on `window` while the Timer page is mounted (enter/leave depth counter, overlay), so a file dropped on the nav bar is imported instead of the browser navigating to it. On the Controls page a drop still opens the file in the browser (step 10 adds import there).
- Empty state: "Import a .lss file or create a new run." + Import button + drop hint. "Create a new run" comes in step 10. The dev fixture loading is removed (the build doesn't contain the fixture).
- Wake lock: `src/lib/wakeLock.ts` (`WakeLockController`, injectable env for tests, singleton `wakeLock`). `App.svelte` calls `wakeLock.setActive(phase === 'Running')` in an `$effect`, so it works on every page and is released on pause, reset and finish. Re-acquired on `visibilitychange` (the browser drops it when hidden); a lock that arrives after it was no longer wanted is released right away; all errors are ignored.
- Tests: `tests/lss.test.ts` (round trip for the 4 valid fixtures through the store and the core, Game Time kept, `invalid.lss` message + current run kept, empty run, refused while running, size limit, file names), `tests/timerStore.test.ts` (+ comparisons, game time toggle changes the sum of best), `tests/wakeLock.test.ts` (fake API/document). `check` 0/0, `test` 34/34, `build` OK.

---

## Step 6: Input layer + keyboard

- [x] `input/types.ts` (`Action`), `bindings.ts` (model: per action, a list of `{kind:'key', code}` / `{kind:'pad', buttonIndex, padId?, label}`; defaults; serialize/parse with versioning).
- [x] `inputManager.ts`: registers sources and dispatches Actions to the timer store; a de-dupe window so the same Action from two sources within ~50 ms fires once; enabled only on the Timer page (Controls page capture mode takes over).
- [x] `keyboardSource.ts`: `keydown` on window, `event.code`, ignore `repeat` and editable targets, `preventDefault` only for bound keys on the Timer page.
- [x] Remove/hide the on-screen buttons behind a small toggle (keep them for touch).
- [x] Vitest: bindings serialization, de-dupe, keyboard filtering.

**Commit:** `feat(input): input manager and keyboard source`

Notes / deviations:

- Done, except the manual browser checks (keys on the Timer page, Space not scrolling / not clicking a focused button, nothing firing on the Controls page, button toggle on touch): for the developer.
- `bindings.ts`: `KeyBinding {kind:'key', code}`, `PadBinding {kind:'pad', buttonIndex, padId?, label}`, `Bindings = Record<Action, Binding[]>`. Defaults (keyboard only, LiveSplit numpad + extras): split `Space`/`Numpad1`, undo `Backspace`/`Numpad8`, skip `Numpad2`, pause `KeyP`/`Numpad5`, reset `Numpad3`. No pad defaults (step 7/8 can add some). `serializeBindings` → `{version: 1, bindings}`; `parseBindings(objectOrJson)` never throws: bad data / other version → defaults, invalid entries and duplicates dropped, a missing action gets its defaults, an empty list stays empty (cleared by the user). `actionFor(bindings, rawInput)`: first action in `ACTIONS` order wins on conflicts; pad matching is already in: exact `padId` (or a binding without `padId`) first, else the same button index on another pad id (step 7 can refine it).
- `inputManager.ts`: `InputManager(target: ActionTarget)` (`TimerStore` fits), `InputSource { connect(manager): disconnect }`, `addSource`/`removeSource`, `resolve(rawInput)` (bindings lookup, `null` while disabled), `dispatch(action, source)` (returns false when disabled or de-duped). De-dupe: the same Action within 50 ms fires once **from any source** (also two keys for the same action, or key + on-screen button). Target errors are logged, not thrown. `enabled` is set in `App.svelte` from the route (`timer` only). Injected clock for tests.
- `keyboardSource.ts`: pure `isEditableTarget` (text-like inputs, textarea, select, contenteditable; not buttons/checkboxes/radios) and `isTimerKeyCandidate` (also skips Ctrl/Alt/Meta combos so browser shortcuts keep working, IME composition, empty codes) plus `handleKeyDown`. Bound keys: `preventDefault` also on repeats (holding Space doesn't scroll), but repeats don't dispatch. Extra: the keyup of a handled key is cancelled too, so Space on a focused toolbar button doesn't click it as well.
- `appInput.ts` (new): the app singletons `inputManager` (on `timerStore`) and `keyboardSource` (window); App connects the keyboard source in an `$effect`.
- On-screen buttons: now dispatch through the manager (source `pointer`, so they're de-duped with keys) and blur after the click. Shown by default only on touch screens (`(pointer: coarse)`), toggle "Show/Hide buttons" in the run toolbar; state in `ui/timerUi.svelte.ts` (kept across pages, **not persisted** yet: step 9). The temporary Rows input moved from `TimerButtons` into `RunToolbar` (removed in step 12). The comparison select and Rows input blur after a change, otherwise the focused field would swallow the timer keys.
- Extra: the Controls page shows the default controls as a read-only list (action → keys), using new `ACTION_LABELS`, `keyLabel(code)` ("KeyP" → "P", "Numpad1" → "Numpad 1") and `bindingLabel` in `bindings.ts`. Step 8 replaces it with the editable table.
- Tests: `tests/bindings.test.ts`, `tests/inputManager.test.ts`, `tests/keyboardSource.test.ts` (fake events on an `EventTarget`, node env). `check` 0/0, `test` 56/56, `build` OK.

---

## Step 7: Gamepad source

- [x] `gamepadSource.ts`: polled from the rAF loop (shared ticker; it must keep polling even when the timer isn't running), rising-edge detection per pad/button, per-button debounce, connect/disconnect events, padId matching that tolerates id changes (fall back to button index).
- [x] Make the core logic pure (snapshot in → events out) so it can be tested without a browser.
- [x] Vitest: edge detection and debounce with fake snapshots; disconnect mid-press.

**Commit:** `feat(input): gamepad source with edge detection`

Notes / deviations:

- Done, except the manual check with a real pad (bind a button: only possible from step 8 on, or temporarily in code): for the developer.
- `GamepadTracker` (pure): `update(snapshots: PadSnapshot[], now) → PadEvent[]` (`connected` / `disconnected` / `press {index, id, buttonIndex}`; disconnects first, then connects, then presses), `pads` getter (current button states, sorted by index), `reset()`. `PadSnapshot = {index, id, buttons: boolean[]}` (`pressed` only, no analog threshold). Pads are tracked by `Gamepad.index`; another id in the same slot = disconnect + connect.
- Debounce: `PAD_DEBOUNCE_MS = 50`, per pad + button (a second rising edge of the same button within 50 ms is dropped; other buttons are not affected). Debounce times survive a disconnect, so a pad dropping out and returning within 50 ms with the button held doesn't fire twice.
- A button already held when a pad first appears **counts as a press**: browsers hide pads until a button is pressed, so that press reveals the pad and may be the run start. Disconnect mid-press: no phantom press, no stuck state; the next real press after reconnect works.
- `readGamepads(navigator)`: skips null slots and `connected: false` pads, never throws (missing API, permissions policy `SecurityError`).
- `GamepadSource` (`InputSource`): on `connect` it subscribes to the shared ticker (the timer store keeps the ticker subscribed permanently, so polling runs whenever the page is visible, timer running or not) and polls once more on `gamepadconnected` / `gamepaddisconnected`. Presses go through `manager.resolve({kind:'pad', buttonIndex, padId})` → `dispatch(action, 'gamepad')`, so id-change tolerance is the existing `actionFor` fallback (same button index on another pad id). Extra for step 8: `subscribe(listener)` gets all pad events also while the manager is disabled (capture mode), `pads` gives live button state. Disconnecting the source unsubscribes and forgets the pads. Injected ticker, `getGamepads`, event target and clock for tests.
- Wired up in `appInput.ts` (`gamepadSource`) and `App.svelte` (added next to the keyboard source). Still no default pad bindings (step 8 adds the capture UI).
- Tests: `tests/gamepadSource.test.ts` (tracker edges, multi-pad, reveal press, debounce, per-button debounce, disconnect mid-press, quick drop-out, slot swap; `readGamepads`; source with `ManualTicker`: dispatch, id-change fallback, disabled manager, connect events, listener errors, disconnect). `check` 0/0, `test` 73/73, `build` OK.

---

## Step 8: Controls page

- [ ] Bindings table: Action × keyboard bindings × gamepad bindings; "Press a key/button…" capture mode (Esc cancels), remove a single binding, add multiple, reset to defaults.
- [ ] Gamepad panel: connected pads, live button state, note "press any button if your pad isn't shown".
- [ ] Prominent focus-limitation warning (plan.md §1).
- [ ] Move the comparison + timing-method selectors here.
- [ ] Bindings are kept in memory for now (persisted in step 9).

**Commit:** `feat(ui): controls page with binding capture`

Notes / deviations:

---

## Step 9: Storage (IndexedDB + persistence)

- [ ] `storage/db.ts` with `idb`: DB `splitter`, v1 stores `runs` (`{id, name, game, category, lss, updatedAt}`) and `settings` (single record), and a migration switch in `upgrade()`.
- [ ] `persist.ts`: `persist()`, `persisted()`, `estimate()`; request persistence on the first user gesture.
- [ ] Save the run's `.lss` on reset and on attempt finish, and after comparison changes. Never per frame.
- [ ] Persist settings: bindings, comparison, timing method, visible rows, last active run id. Auto-restore the last run + settings on reload.
- [ ] Vitest with `fake-indexeddb` (ask before adding the dependency) for the db layer.

**Commit:** `feat(storage): indexeddb runs/settings, persistence, auto-restore`

Notes / deviations:

---

## Step 10: Run management on the Controls page

- [ ] Saved runs list: open, delete (with in-page confirmation), last-updated time.
- [ ] Import `.lss` (adds to the list), prominent "Export backup" (current run), export any saved run.
- [ ] "New empty run": game, category and split names (one per line) → build via RunEditor/Run API → save.
- [ ] Storage status panel: persisted yes/no, usage/quota, "Request persistent storage" button, and a note that clearing site data deletes everything, so export is the real backup.

**Commit:** `feat(ui): run management and storage status`

Notes / deviations:

---

## Step 11: PWA

- [ ] Fetch the current vite-plugin-pwa docs (getting started, register/update prompt, workbox precache) into `docs/` first.
- [ ] Add `vite-plugin-pwa` (ask before installing). Manifest: name, short_name, `display: standalone`, theme/background from tokens, icons 192/512 + maskable. Placeholder icons are hand-written SVG; PNGs are generated only with a tool the developer approves.
- [ ] Workbox: precache `**/*.{js,css,html,wasm,svg,png,woff2}`, raise `maximumFileSizeToCacheInBytes` for the wasm.
- [ ] Update strategy: **prompt** ("Update available, reload"), and only offer it when the timer isn't running. Never auto-reload mid-run.
- [ ] Verify with `npm run build && npm run preview`: installable, starts offline after the first load, wasm served from the cache.

**Commit:** `feat(pwa): manifest, service worker, offline support`

Notes / deviations:

---

## Step 12: Settings page (replaces Controls) + minimal Timer page

**Goal:** the Timer page shows only what you need during a run. Everything else lives on one Settings page with clear sections. This step only moves and groups existing features; it adds no new ones.

- [ ] Rename `ControlsPage.svelte` → `SettingsPage.svelte`, route `#/controls` → `#/settings` (redirect the old hash), nav label "Settings". Update code comments/README that say "Controls page".
- [ ] Settings page sections (one scrolling page, each section with a heading and an anchor; a small section nav at the top on narrow screens):
  - **Controls**: bindings table + capture mode (step 8), gamepad panel (step 7/8), focus-limitation warning.
  - **Runs (.lss import/export)**: import `.lss`, prominent "Export backup" (current run), saved runs list, "New empty run", storage status (all from step 10). Drag-and-drop import works here too.
  - **Timer**: comparison, timing method (only if the run has game time), visible split rows. (Not controls and not runs; merge into another section if the developer prefers.)
- [ ] Timer page minimal: header, split list, big timer, footer (previous segment, sum of best, possible time save). Remove the temporary `RunToolbar` and the "Rows" input. The on-screen action buttons stay behind the step 6 toggle (touch).
- [ ] Empty Timer page: "Import a .lss file or create a new run" with an Import button and a link to Settings → Runs. Nothing else.
- [ ] Drag-and-drop import moves from `TimerPage` to `App.svelte` (works on every page; still refused during an attempt). Import errors show as a dismissible message on the page where the drop happened.
- [ ] Update the Decisions table (pages) and the tests that touch moved code.

**Acceptance:** during a run the Timer page has no settings controls; every setting from steps 5–11 is reachable on the Settings page in the right section; `check`, `test`, `build` clean.
**Commit:** `refactor(ui): settings page with sections, minimal timer page`

Notes / deviations:

---

## Step 13: Prototype wrap-up

- [ ] README complete: install, dev, build, test, rebuilding livesplit-core (Podman), browser limitations (focus, Safari 7-day eviction).
- [ ] `CHANGELOG.md`: deviations from plan.md and why (collect them from the "Notes / deviations" of each step).
- [ ] Run `check`, `test`, `build` in order; fix warnings.
- [ ] A short manual test checklist in `docs/manual-tests.md` (plan.md §9 behavioral checks), with what was actually verified ticked.

**Commit:** `docs: prototype wrap-up`

Notes / deviations:

---

## Later (not part of the prototype)

- Milestone 7: design pass (wait for the developer's design).
- Milestone 8: hardening + manual browser/gamepad matrix (plan.md §9).
- Optional: `wasm-opt` size pass, Tauri wrapper for global hotkeys.
