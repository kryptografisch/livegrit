# Open Todos: First Prototype (plan.md milestones 1–6)

Each step = one session = one commit (the developer commits; never run git).
At the start of a session, read `CLAUDE.md`, `plan.md` and **only** the step you were pointed at, plus the "Decisions" section below.
When a step is done, tick its checkboxes, fill in "Notes / deviations" under that step, and update the Decisions section if anything changed.

---

## Decisions (override plan.md where they differ)

| Topic                  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project location       | App lives at the project root `split-lite/`, **not** `splitter/` (plan.md §3 is outdated: there is no existing scaffold, start from scratch).                                                                                                                                                                                                                                                                                |
| Reference repos        | `livesplit-core-master/` and `LiveSplitOne-master/` stay in the project folder as **read-only references**, git-ignored (never committed). Read them for ideas; never import from, build in, or depend on them in code or scripts.                                                                                                                                                                                           |
| livesplit-core source  | Cloned **only inside the Podman build container**, at a pinned commit SHA recorded in the build script.                                                                                                                                                                                                                                                                                                                      |
| Build toolchain        | No Rust on the host. Build runs in Podman (`docker.io/library/rust` image, Rust ≥ 1.97 because livesplit-core requires `rust-version = 1.97`). The developer approves/runs the podman command.                                                                                                                                                                                                                               |
| Built core             | Committed to `vendor/livesplit-core/` with `package.json`, consumed as `"livesplit-core": "file:./vendor/livesplit-core"`.                                                                                                                                                                                                                                                                                                   |
| Core features          | `parsing,run-saving,timing,run-editing,layouts`, built with `--no-default-features`. No hotkeys, server-protocol, web-rendering, therun-gg, auto-splitting or localization (English only). Plus `wasm-web` (step 2): it adds no API, but without it the wasm imports `env.Date_now`/`env.Instant_now` from the host; with it the core uses `performance.now()`/`Date` incl. the sleep-drift fix.                             |
| WASM loading           | Use wasm-bindgen `--target web` output: a self-contained ES module whose `init()` loads the wasm via `new URL('….wasm', import.meta.url)`, which Vite handles natively. So `vite-plugin-wasm` / `vite-plugin-top-level-await` (needed only for `--target bundler` style direct `.wasm` imports) are not needed (deviation from plan.md §3). Add them only if a real problem shows up.                                        |
| LiveSplit One          | Only a reference for ideas. Don't copy its code or structure; decide what's best for this project.                                                                                                                                                                                                                                                                                                                           |
| Versions               | Always the newest stable versions that work together (check the npm registry when writing `package.json`).                                                                                                                                                                                                                                                                                                                   |
| Docs                   | Local docs live in `docs/` (e.g. `docs/llms-small.txt` for Svelte 5). Other docs are fetched on demand when a step needs them (e.g. vite-plugin-pwa in step 11).                                                                                                                                                                                                                                                             |
| Explicit resource mgmt | Do not use `using` declarations (needs a Babel transform for Safari). The bindings have **no `.dispose()`**, only `[Symbol.dispose]()`: call `obj[Symbol.dispose]()` in `try/finally`. Needs TS lib `ESNext.Disposable` and a `Symbol.dispose` polyfill imported before `livesplit-core` (see `API-NOTES.md`).                                                                                                               |
| Node                   | v24 (host). TypeScript 6.x (svelte-check doesn't support 7 yet).                                                                                                                                                                                                                                                                                                                                                             |
| npm installs           | Claude writes `package.json` with exact (pinned) versions, then **asks permission** to run `npm install`. Claude never installs anything silently.                                                                                                                                                                                                                                                                           |
| Tests                  | Vitest from step 2 on.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Temp files             | Use `tmp/` in this project (git-ignored).                                                                                                                                                                                                                                                                                                                                                                                    |
| Pages                  | Three pages: **Timer** (minimal: only what's needed during a run), **Settings** (sections: Controls, Timer) and **Data** (`#/data`, step 10: current run backup export, import, saved runs, new empty run, storage status). Steps 6–11 still build on the "Controls" page; step 12 renames it to Settings and regroups everything. Temporary controls on the Timer page (step 5 toolbar, Rows input) are removed in step 12. |
| Input devices          | No device selection: the keyboard and **every** gamepad work, and bindings are independent of the device (pad bindings are button indices only). The Controls page lists the available devices (Keyboard + detected pads) with the hint "Press a button on your controller to detect it". The Timer page footer shows the device last used for an action ("Keyboard" by default, the pad's name after a pad press).          |
| Gamepad defaults       | **No gamepad default bindings** (keyboard defaults only). The game also receives every pad press and games use most buttons, so any default could trigger the timer by accident: a wrong default is worse than none. The user binds pad buttons (and combos, step 8) on the Controls page. No extra hint in the UI.                                                                                                          |
| Binding rules          | One input = one action: binding an input that another action has moves it (the UI says so). Pad bindings: single button, hold one + press a second, or two pressed together (within 100 ms); max two buttons; auto-detected when recording (saved at the second press, a single button at its release); together > hold > single when several match. Escape and Ctrl/Alt/Meta can't be bound.                                |
| Storage                | The run's `.lss` is saved on reset, on attempt finish and on import (as a new run). Comparison, timing method, rows, bindings and the buttons toggle are settings (saved on change; the current comparison isn't part of the `.lss`). Persistent storage is requested automatically only once ever (first gesture); step 10 adds a manual button.                                                                            |
| Focus                  | No "only works while focused" warning anywhere: input also works while the browser window is visible and another app has the focus (tested by the developer). plan.md's limitation note is removed.                                                                                                                                                                                                                          |

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
- [x] `README.md`: what the project is, prerequisites (Node 24; Podman only for rebuilding the core), `npm run dev/build/preview/check/test`, project structure overview.
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

- [x] `gamepadSource.ts`: polled from the rAF loop (shared ticker; it must keep polling even when the timer isn't running), rising-edge detection per pad/button, per-button debounce, connect/disconnect events, ~~padId matching that tolerates id changes (fall back to button index)~~ replaced by the input device selection (see notes).
- [x] Device list on the Controls page and last used device footer on the Timer page (developer request).
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
- Wired up in `appInput.ts` (`gamepadSource`) and `App.svelte` (added next to the keyboard source). No gamepad defaults (see Decisions → Gamepad defaults).
- Tests: `tests/gamepadSource.test.ts` (tracker edges, multi-pad, reveal press, debounce, per-button debounce, disconnect mid-press, quick drop-out, slot swap; `readGamepads`; source with `ManualTicker`: dispatch, other pads ignored, disabled manager, connect events, listener errors, disconnect).
- **Follow-up (developer request): devices.** Replaces the "padId matching that tolerates id changes" idea: bindings don't depend on the device at all, see Decisions → Input devices. (Two earlier versions with a device select on the Controls page were dropped by the developer.)
  - `bindings.ts`: `PadBinding.padId` and the "same index on another pad" fallback removed (pad bindings are just button index + label; any pad triggers them). New `padButtonLabel(index)` (W3C standard mapping names, else "Button N"). **No gamepad default bindings** (a first version had A/D-pad/Start/Back defaults; dropped, see Decisions → Gamepad defaults). `BINDINGS_VERSION` stays 1 (nothing persisted yet; a stored `padId` is just ignored). `RawInput` pad now carries `padIndex`.
  - `InputManager.onInput(listener)`: called from `resolve` with `(rawInput, action)` for input that is bound (and only while enabled); listener errors are logged.
  - `inputDevice.svelte.ts` (new): `InputDeviceStore` with `$state` `pads` (connected, by slot, with `name`) and `lastUsed` (`{kind:'keyboard'}` / pad info): `attachPads(gamepadSource)`, `attachInput(inputManager)`. A disconnect of the last used pad goes back to keyboard. `padName(id)` strips Chrome's "(STANDARD GAMEPAD Vendor: … Product: …)" and Firefox's "054c-09cc-" prefix. The source calls its listeners before resolving a press, so the press that reveals a pad shows its name at once.
  - `GamepadSource`: when stopped it reports its pads as `disconnected` before forgetting them.
  - UI: Controls page "Available devices" list (Keyboard + each connected pad with its slot) and hint "Press a button on your controller to detect it." Timer page footer `InputDeviceStatus.svelte`: "Keyboard", or the pad's name after a pad button triggered an action.
  - Tests: `tests/inputDevice.test.ts` (padName, pad list, last used device incl. reveal press, unbound input ignored, disconnect fallback, attach), `onInput` in `tests/inputManager.test.ts`, bindings/gamepad tests updated. `check` 0/0, `test` 82/82, `build` OK.

---

## Step 8: Controls page

- [x] Bindings table: Action × keyboard bindings × gamepad bindings; "Press a key/button…" capture mode (Esc cancels), remove a single binding, add multiple, reset to defaults.
- [x] Gamepad panel: connected pads, live button state, note "press any button if your pad isn't shown".
- [x] ~~Prominent focus-limitation warning (plan.md §1).~~ Dropped: wrong assumption (see notes).
- [x] Move the comparison + timing-method selectors here.
- [x] Bindings are kept in memory for now (persisted in step 9).
- [x] Gamepad button combinations as bindings (e.g. hold Select + press A), recorded in the same capture mode: on a shared controller (most runners split with the controller they play on) a combo is often the only binding the game doesn't trigger by accident. The game still receives both presses.

**Commit:** `feat(ui): controls page with binding capture`

Notes / deviations:

- Done, except the manual browser checks (capture of keys/pad buttons/combos, Esc cancel, Space/Enter on a focused "+ Add" not restarting capture, live button grid with a real pad, comparison/timing method on the Controls page): for the developer.
- **Pad bindings** (`bindings.ts`, developer request: auto-detect the kind, max two buttons): `PadBinding` is a union on `combo`: `single {buttonIndex}`, `hold {hold, buttonIndex}` (hold one button, then press the second; only that order), `together {buttons: [a, b]}` (both go down within `CHORD_WINDOW_MS` = 100 ms, any order; fires on the second press, so no delay for single buttons). Builders `padButton`, `padHold`, `padTogether` (normalized). **No stored label** (names depend on the pad they are shown for, see below). `bindingId`: `pad:0`, `pad:8>0`, `pad:0&8`. `RawInput` pad has optional `held` and `together`. `actionFor`: other held buttons don't matter; **most specific wins: together > hold > single** (a quick double press also has the first button held, so together must beat hold), ties by `ACTIONS` order. A single binding on one of a combo's buttons still fires on its own (explained in the UI hint). Three-button combos: not supported (developer: sane defaults). `BINDINGS_VERSION` stays 1 (nothing persisted yet); `parseBindings` reads the three kinds (a pad entry without `combo` = single) and ignores a stored `label`.
- Edit helpers (pure): `withBinding(bindings, action, binding)` → `{bindings, movedFrom}`: one input = one action, the same binding on another action is **moved** (the UI says "X moved from A to B"); `withoutBinding(bindings, action, id)`. `isBindableKey`: Escape (cancels capture) and Ctrl/Alt/Meta/OS keys can't be bound (the keyboard source ignores them anyway).
- `GamepadTracker` press events now carry `held` (other pressed buttons) and `together` (those of them that went down within the chord window, same frame included); the source passes both to `resolve`. New exported `pressedButtons()`.
- `capture.ts` (new, pure): `captureKey(event)` → ignore (repeat/IME) / cancel (Esc) / invalid (Ctrl/Alt/Meta, with message) / binding. `PadComboRecorder.update(pads, now)` → `PadBinding | null`, **ends as soon as the binding is clear** (developer request): a second button within 100 ms → together, a later second button while the first is held → hold (both at the second press); the first button released without a second → single (at the release, since until then it could still become a hold). Only the first two buttons count (no "too many buttons" error; 3 in one frame → the first two together). Detection **continues after a result** (developer request, for the Devices test; capture mode stops at the first result anyway): a combo button that stays held is the hold button for the next press (hold RB, press A, press B → "Hold RB + A", then "Hold RB + B"; after "LB + RB together", keep RB → next press is "Hold RB + …"), and releasing a combo button records no single press. Buttons already down when a pad is first seen are a baseline. `holding` = the button held with nothing decided yet (shown as "[hold] A"); a disconnect drops it.
- **Button names per controller** (developer request, instead of "A / Cross"): `padLayout.ts` with `PadFamily` (`xbox` | `playstation`), `padFamily(id)` (Sony vendor 054c in Chrome/Firefox ids, or DualSense/DualShock/PlayStation/PS3-5 in the name; everything else = Xbox, the standard mapping follows the Xbox layout) and `padButtonLabel(index, family)`: Xbox A, B, X, Y, LB, RB, LT, RT, View, Menu, LS, RS, D-pad Up/Down/Left/Right, Xbox, Share; PlayStation Cross, Circle, Square, Triangle, L1, R1, L2, R2, Share, Options, L3, R3, D-pad …, PS, Touchpad; beyond that "Button N". `PadInfo.family`; `InputDeviceStore.labelFamily` (last used pad, else first connected, else Xbox) names the buttons in the bindings table; the Devices test uses each pad's own family. `padBindingText(binding, family)` gives plain text ("Hold RB + A", "LB + RB together") for messages and accessible names; `bindingLabel(binding, family)`. Not handled: Nintendo layouts and pads without the standard mapping (names may not match the physical buttons there).
- Tagged pad labels (developer request): `padLabelParts(binding)` → `[{tag: 'press'|'hold', button}]`, rendered by `ui/PadBindingLabel.svelte` (props `binding` or `holding`, `family`) as "[hold] RB + [press] A" (together = two [press], single = one [press]) in the bindings chips and the Devices test; `padBindingText` is the accessible name.
- **No focus warning** (developer request): plan.md §1 said input only reaches a focused tab/window; the developer tested that it also works with the browser window in the foreground while another app has the focus (LiveSplit One works the same way). Warning removed from the Controls page, the Devices hint and plan.md. Keyboard input does need the focus (browsers send key events only to the focused window; confirmed by the developer), so a small muted note at the bottom of the Controls page says: keyboard only while focused, gamepads also in the background. Global keyboard hotkeys would need a desktop wrapper (Tauri) or a localhost helper (see plan.md "Out of scope").
- Controls page order (developer request): Devices, Bindings, Timer. The Timer section is shown only while a run is loaded (no hints there, developer request). Stopping capture (Esc, Cancel) also clears its hint message.
- UI split into components (step 12 can regroup them into Settings): `ui/BindingsTable.svelte` (Action × Keyboard × Gamepad, chips with ×, "+ Add" per cell → capture mode, cell highlighted, status line "Press a key for …" / live gesture label "… (release all buttons to save)", Cancel button; hint listing the three pad kinds; Esc cancels in both modes; "Reset to defaults" with an inline confirm), `ui/DevicePanel.svelte` (replaces the step 7 device list: Keyboard + each pad as "Name [gamepad N] (18 buttons)", a test with the same detection as capture mode (one `PadComboRecorder` per pad: "[hold] A" while a button is held with nothing decided, then single, hold + press, two together; further buttons ignored; back to the placeholder "Press a button to test" once all buttons are released, developer request: so a single press shows only as "[hold] A" while down), and an indicator that is lit while the browser reports **any** pressed button on the pad (shows the controller works); no per-index grid (developer request); re-rendered only on change, polled from the shared ticker), `ui/TimerSettings.svelte` (comparison select + Real/Game Time toggle, the toggle only when the run has Game Time).
- Capture details: the keydown listener runs in the capture phase with `preventDefault` + `stopPropagation`; the keyup of a captured key is swallowed too (Space/Enter on the focused "+ Add" button would otherwise click it and restart capture). Pad capture subscribes to the shared ticker only while capturing.
- Bindings live in `InputManager` (in memory); the table reads them once on mount and writes every change back.
- Comparison + timing method removed from `RunToolbar` (it keeps import/export, Rows and the buttons toggle until steps 10/12).
- Tests: `tests/capture.test.ts` (new), pad kinds/editing in `tests/bindings.test.ts`, `held`/`together` and combo dispatch in `tests/gamepadSource.test.ts`. `check` 0/0, `test` 113/113, `build` OK.

---

## Step 9: Storage (IndexedDB + persistence)

- [x] `storage/db.ts` with `idb`: DB `splitter`, v1 stores `runs` (`{id, name, game, category, lss, updatedAt}`) and `settings` (single record), and a migration switch in `upgrade()`.
- [x] `persist.ts`: `persist()`, `persisted()`, `estimate()`; request persistence on the first user gesture.
- [x] Save the run's `.lss` on reset and on attempt finish, and after comparison changes. Never per frame.
- [x] Persist settings: bindings, comparison, timing method, visible rows, last active run id. Auto-restore the last run + settings on reload.
- [x] Vitest with `fake-indexeddb` (ask before adding the dependency) for the db layer.

**Commit:** `feat(storage): indexeddb runs/settings, persistence, auto-restore`

Notes / deviations:

- Done, except the manual browser checks (reload restores the run/settings, persistence prompt in Firefox, the DevTools IndexedDB view): for the developer.
- `fake-indexeddb` 6.2.7 added as a dev dependency (developer approved). `npm audit` reports 2 low findings, both pre-existing (`@sveltejs/vite-plugin-svelte` → `deepmerge`, no fix available).
- `storage/db.ts`: `SplitterDb.open({name?, onVersionChange?})` (rejects without IndexedDB), `getRun`, `listRuns` (newest first, via an `updatedAt` index), `putRun`, `deleteRun`, `getSettings` (parsed, defaults if missing), `putSettings`, `close`. `upgrade()` has `switch (oldVersion)` with `case 0` (v1); next schema = bump `DB_VERSION`, add `case 1`. `blocking` closes the connection (another tab upgrades) and the app says "reload to keep saving". Helpers: `newRunId()` (`crypto.randomUUID` only exists in secure contexts, so a `getRandomValues` fallback for the LAN dev server over http), `runDisplayName(game, category)` ("Game - Category" / "Untitled run").
- `storage/settings.ts` (new): `Settings` = bindings, comparison (`null` = the run's default), timing method, visible rows, **`showButtons`** (`null` = device default; added, the on-screen buttons toggle should survive a reload too), last run id, **`persistRequested`**. Stored with a `version`; `parseSettings` never throws and checks each field on its own (one bad field doesn't reset the others).
- `storage/persist.ts`: `persisted()`, `persist()`, `estimate()` → `null` where `navigator.storage` is missing (insecure contexts) or fails; `onFirstUserGesture(request)` (first `pointerdown`/`keydown`, capture phase). **Asked once ever** (`persistRequested`), and not at all if already persisted: Firefox shows a prompt, and asking on every start could pop it up on the key that starts a run. Step 10's "Request persistent storage" button asks again.
- `storage/storageSync.svelte.ts` (new, `StorageSync`) does the wiring; `storage/appStorage.ts` is the app-wide instance (timer store, input manager, `timerUi`). `start()` (from `App.svelte`, on every start page): core init → open db → settings → bindings, visible rows, buttons toggle → last run (`loadSplits(record.lss)`) → stored comparison/timing method → then it starts saving. Reactive `restored` (Timer page shows "Loading…" until then, no flash of the empty state), `error` (banner on the Timer page with dismiss), `activeRunId` (for step 10).
- Saving: the run on **reset** (`onReset`) and on **attempt finish** (new `TimerStore.onAttemptEnded`, fired when a split goes to `Ended`; the core saves an ended attempt as if reset, so it is already in the history then). Imports go through `appStorage.importFile` and are saved as a **new** run record that becomes the active/last run (step 10 builds the list on that). `exportLss()` now also returns `game`/`category`. The text is taken synchronously at the hook, so the record matches that moment.
- **Deviation "after comparison changes"**: the current comparison isn't part of the `.lss`, so a comparison change saves the **settings**, not the run. Store setting changes are reported by the new `TimerStore.onSettingsChange('comparison' | 'timingMethod' | 'visibleRows')` (only from user calls, not `loadRun`); bindings by the new `InputManager.onBindingsChange` (the bindings table also uses it, so bindings restored after the Controls page opened show up there); the buttons toggle via `appStorage.setShowButtons`.
- Preferences across runs: the stored comparison is applied to every run that has it; Game Time only to runs with Game Time (others show Real Time, the stored preference stays Game Time). While applying them, store changes aren't saved back.
- Failure handling: no IndexedDB / open fails → timer works in memory, banner "Saving is not available in this browser"; a stored run that can't be parsed → banner, empty state, import works; a missing last run → `lastRunId` cleared silently. Write failures → banner suggesting an .lss export.
- Not done (spec: never per frame): no save while an attempt is running (e.g. on `pagehide`): IndexedDB writes there aren't reliable; closing the tab mid-attempt loses that attempt, like before.
- Tests: `tests/storage.test.ts` (schema, runs CRUD/order, settings round-trip and parsing, version-change close, helpers), `tests/storageSync.test.ts` (real wasm + fake-indexeddb: import → restore on a new "page load", save on finish/reset but not per split, bindings/rows/buttons restore, comparison/timing preferences, missing/broken last run, no database, persistence asked once / not when granted). `check` 0/0, `test` 136/136, `build` OK.

---

## Step 10: Run management on the Data page

- [x] Saved runs list: open, delete (with in-page confirmation), last-updated time.
- [x] Import `.lss` (adds to the list), ~~prominent "Export backup" (current run)~~ (dropped, see notes), export any saved run.
- [x] "New empty run": game, category and split names (one per line) → build via RunEditor/Run API → save.
- [x] Storage status panel: persisted yes/no, usage/quota, "Request persistent storage" button, and a note that clearing site data deletes everything, so export is the real backup.

**Commit:** `feat(ui): run management and storage status`

Notes / deviations:

- Done, except the manual browser checks (open/delete/export/create on the Data page, the persistence button in Firefox/Chrome, usage/quota display): for the developer.
- **Own page instead of the Controls page** (developer request): new **Data** page, route `#/data`, nav "Timer · Controls · Data" (`pages/DataPage.svelte`, `router.svelte.ts`). Sections: **Saved splits** (attempt hint, the list, then "+ New splits" and "Import .lss" side by side; one status line under them for import/create results) and **Storage**. **No "Loaded splits" section and no separate "Export backup" button** (developer request: the list already marks the loaded splits, and their row's Export gives the live state incl. a running attempt). Import is hidden while the new-splits form is open (`NewRunForm` has a bindable `open` and an `oncreated(message)` callback; it only shows its own errors). Shows `appStorage.error` as a dismissible banner too (it was only on the Timer page). Decisions (Pages) and step 12 updated: Data stays its own page.
- **Naming: "splits"** (developer request, "run" was confusing: to a runner a run is one attempt): the saved game + category setup (the .lss with segments, PB, golds, history) is called **splits** in all UI text, like LiveSplit ("Saved splits", "+ New splits", "Load", badge "loaded", "Untitled splits", storage messages, `ATTEMPT_IN_PROGRESS_MESSAGE` = "Reset the current attempt before loading other splits."). The form field is "Segments (one per line)" (not "Splits", which now means the whole file). Code identifiers keep `run` (livesplit-core's `Run`, `RunRecord`, `runs` store); only user-visible text changed. Run records already saved as "Untitled run" keep that name.
- **"+ New splits" is collapsed** (developer request): a button under the saved list opens the form (focus on Game), "Create splits (N segments)" or Cancel closes it again; the result message shows under the buttons.
- `StorageSync` (run management API, all return `null` or a message for the user): `runs` (reactive `RunSummary[]` = records without `lss`, newest first; refreshed on start, after every save, import, create, delete), `available` (database open), `openRun(id)` (refused during an attempt; loads the `.lss`, applies the stored comparison/timing method, becomes the last run; a missing record refreshes the list), `deleteRun(id)` (deleting the **current** run unloads it, back to the empty state, and clears `lastRunId`; refused during an attempt only for the current run), `createRun(game, category, names)` (refused during an attempt or without names), `exportRun(id)` (the current run from the timer, i.e. its live state incl. a running attempt, like "Export"; others from the stored `.lss`), `exportActiveRun()`. Import and create share `#activateNewRun()`.
- **A finished attempt (`Ended`) is not "in progress"** (developer feedback): new `TimerStore.attemptInProgress` (Running or Paused only), used by every "Reset the current attempt first" check (Data page, `RunToolbar` import, drop overlay). Opening, importing (also drag-and-drop) and creating a run first **reset** an ended attempt (`#finishAttempt()`: stores it in the history and saves the run, like the user's own reset); deleting the current run after a finished attempt just deletes it. The Data page says "The finished attempt is saved. Opening, importing or creating a run resets the timer first." A failed import after that leaves the same run, reset. `importSplitsFile` itself still refuses anything but `NotRunning`.
- Opening another run doesn't save the current one first: in `NotRunning` it is already saved (reset/finish/import/create), and saving again would only bump its `updatedAt` and reorder the list.
- New empty run via the **Run API**, not RunEditor (simpler, same result): `core.ts` `createRun(game, category, names)` = `Run.new()` + `setGameName`/`setCategoryName` + `Segment.new(name)`/`pushSegment`. `lss.ts` `parseSegmentNames(text)` (one per line, trimmed, empty lines skipped). The form shows the split count on the button and clears itself after creating.
- `TimerStore.unloadRun()` (new): disposes the timer, back to the empty state (`view = null`, comparisons cleared).
- **Attempt counts in the list** (developer request): "Saved <date> - 18 runs (5 complete)" (`format.ts` `formatAttempts`, "1 run"). Same rule as the core's title component: runs = `run.attemptCount()`, complete = history attempts with a final Real Time, +1 if the timer's attempt just ended (`core.ts` `attemptStats(run, currentEnded)`). `TimerStore.exportLss()` returns them (`ExportedLss`), `saveRun` stores them in the record (`RunRecord.attempts?`/`completed?`, optional and not indexed, so `DB_VERSION` stays 1), so the list never parses the .lss. Older records without counts are parsed once by `refreshRuns` (`#fillAttemptStats`, `updatedAt` kept); unreadable ones show no counts.
- **Duplicate check on import** (developer request): an imported file whose game + category match saved splits (`sameSplits`: case-insensitive, trimmed) asks first: `"X" already exists`, Saved <date> - N runs vs. File <name> - N runs, a warning if the file has fewer runs ("may be an older version: replacing would lose the newer runs"), **Replace** (the saved entry, same id, gets the file's content and becomes loaded; it moves to the top since `updatedAt` changes), **Keep both** (new entry, the old behaviour) or **Cancel**. Import is two-phase in `StorageSync`: `prepareImport(file)` (refused during an attempt; reads, parses, checks segments, counts attempts, finds the most recent duplicate; changes nothing) → `commitImport(prepared, 'new' | 'replace')` (refused if an attempt started meanwhile; resets a finished attempt; loads and saves). `importFile` = prepare + commit `new` (no check; used by tests). `ui/importFlow.svelte.ts` (`ImportFlow`: `start(file)`, `choose('replace' | 'new' | 'cancel')`, `pending`, `error`, `status`, `busy`) + `ui/DuplicatePrompt.svelte`, used by the Data page and the Timer page (picker, toolbar, drag-and-drop; only errors shown there). **The prompt is a modal** (developer request): native `<dialog>` + `showModal()` (backdrop token `--color-backdrop`), focus starts on Cancel, Escape or any other close = Cancel. While it is open timer input is off (`ui/modal.svelte.ts` `modals.open` counter, `App.svelte`: `inputManager.enabled = route === timer && modals.open === 0`), so Space/Enter on a dialog button or a pad press can't start the timer. `lss.ts` `importSplitsFile` is no longer used by the app, kept as the round-trip helper of `tests/lss.test.ts`.
- **Fewer notices** (developer request): no success message for imports or a cancelled import (the splits show up in the list; `ImportFlow` has only `error`). The list's success notice ("X" deleted) fades out after 4 s (`NOTICE_MS`, `out:fade`); its errors stay (warning colour) until the next action. The "Created and loaded …" message of the new-splits form is unchanged.
- **Usage bar** (developer request): Storage → Used shows a bar (custom `role="meter"`, fill in `--color-personal-best`, 2 px minimum so tiny values stay visible) plus "1 MB of 10 GB (< 0.01%)". `format.ts` `usagePercent(usage, quota)` (0–100, 0 for no quota) and `formatPercent` ("42%", "3.5%", "0.12%", "< 0.01%").
- Open questions from the developer (not done here): storage usage (~1 MB for a 575 KB .lss: likely LevelDB keeping old copies until compaction and/or the .lss string stored as UTF-16; storing `saveAsLssBytes()` as UTF-8 bytes would need DB v2) and an attempt history view per saved splits.
- `ui/StoragePanel.svelte`: Saving (IndexedDB yes/no), Persistent (yes / no / unknown where `navigator.storage` is missing), Used (`formatBytes(usage)` of quota), "Request persistent storage" (hidden once granted, disabled where unsupported; result message explains that Chrome decides on its own and Firefox asks), and the warning note about clearing site data. It calls `persist.ts` directly (the manual button doesn't touch `persistRequested`). `ui/format.ts`: `formatBytes` (1024-based), `formatDateTime` (locale, medium date + short time).
- `ui/RunList.svelte`: rows with name, "loaded" badge, "Saved <date time>", Load (disabled for the loaded splits and during an attempt), Export, Delete → inline "Delete "X"? This can't be undone. [Delete] [Keep]". `ui/NewRunForm.svelte`: collapsed form, game, category, segments textarea.
- The Timer page's empty state links to the Data page. `RunToolbar` keeps its Import/Export until step 12 removes it. Drag-and-drop import still only on the Timer page (step 12 moves it to `App.svelte`).
- Tests: `tests/storageSync.test.ts` (list order/no `lss`/restore, open + last run, open refused during an attempt, missing run, delete other/current (unload, `lastRunId`), delete refused during an attempt, create + saved segments, create refused, export current vs. stored, no database, finished attempt reset before open/import/create, delete after a finished attempt, attempt counts + fill-in, duplicate import: `sameSplits`, prepare changes nothing, replace / keep both, refused during an attempt, unreadable file, `ImportFlow`), `tests/dataHelpers.test.ts` (new: `createRun`, `parseSegmentNames`, `unloadRun`, `formatBytes`, `formatAttempts`, `usagePercent`/`formatPercent`). `check` 0/0, `test` 164/164, `build` OK.

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
  - **Controls**: bindings table + capture mode (step 8), gamepad panel (step 7/8).
  - ~~**Runs (.lss import/export)**~~: stays on its own **Data** page (step 10, developer request); drag-and-drop import works there too.
  - **Timer**: comparison, timing method (only if the run has game time), visible split rows, on-screen buttons toggle. (Merge into another section if the developer prefers.)
- [ ] Timer page minimal: header, split list, big timer, footer (previous segment, sum of best, possible time save). Remove the temporary `RunToolbar` and the "Rows" input. The on-screen action buttons stay behind the step 6 toggle (touch).
- [ ] Empty Timer page: "Import a .lss file or create a new run" with an Import button and a link to the Data page (already there since step 10). Nothing else.
- [ ] Drag-and-drop import moves from `TimerPage` to `App.svelte` (works on every page; still refused during an attempt). Import errors show as a dismissible message on the page where the drop happened.
- [ ] Update the Decisions table (pages) and the tests that touch moved code.

**Acceptance:** during a run the Timer page has no settings controls; every setting from steps 5–11 is reachable on the Settings page in the right section (run data on the Data page); `check`, `test`, `build` clean.
**Commit:** `refactor(ui): settings page with sections, minimal timer page`

Notes / deviations:

---

## Step 13: Prototype wrap-up

- [ ] README complete: install, dev, build, test, rebuilding livesplit-core (Podman), browser limitations (Safari 7-day eviction).
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
