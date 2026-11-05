# Open Todos: First Prototype (plan.md milestones 1–6)

Each step = one session = one commit (the developer commits; never run git).
At the start of a session, read `CLAUDE.md`, `plan.md` and **only** the step you were pointed at, plus the "Decisions" section below.
When a step is done, tick its checkboxes, fill in "Notes / deviations" under that step, and update the Decisions section if anything changed.

---

## Decisions (override plan.md where they differ)

| Topic | Decision |
| --- | --- |
| Project location | App lives at the project root `split-lite/`, **not** `splitter/` (plan.md §3 is outdated: there is no existing scaffold, start from scratch). |
| Reference repos | `livesplit-core-master/` and `LiveSplitOne-master/` stay in the project folder as **read-only references**, git-ignored (never committed). Read them for ideas; never import from, build in, or depend on them in code or scripts. |
| livesplit-core source | Cloned **only inside the Podman build container**, at a pinned commit SHA recorded in the build script. |
| Build toolchain | No Rust on the host. Build runs in Podman (`docker.io/library/rust` image, Rust ≥ 1.97 because livesplit-core requires `rust-version = 1.97`). The developer approves/runs the podman command. |
| Built core | Committed to `vendor/livesplit-core/` with `package.json`, consumed as `"livesplit-core": "file:./vendor/livesplit-core"`. |
| Core features | `parsing,run-saving,timing,run-editing,layouts`, built with `--no-default-features`. No hotkeys, server-protocol, web-rendering, therun-gg, auto-splitting or localization (English only). `wasm-web` only if a needed type requires it. |
| WASM loading | Use wasm-bindgen `--target web` output: a self-contained ES module whose `init()` loads the wasm via `new URL('….wasm', import.meta.url)`, which Vite handles natively. So `vite-plugin-wasm` / `vite-plugin-top-level-await` (needed only for `--target bundler` style direct `.wasm` imports) are not needed (deviation from plan.md §3). Add them only if a real problem shows up. |
| LiveSplit One | Only a reference for ideas. Don't copy its code or structure; decide what's best for this project. |
| Versions | Always the newest stable versions that work together (check the npm registry when writing `package.json`). |
| Docs | Local docs live in `docs/` (e.g. `docs/llms-small.txt` for Svelte 5). Other docs are fetched on demand when a step needs them (e.g. vite-plugin-pwa in step 11). |
| Explicit resource mgmt | Do not use `using` declarations (needs a Babel transform for Safari). Call `.dispose()` in `try/finally`. |
| Node | v24 (host). TypeScript `^5.x` unless the step-1 check proves svelte-check supports a newer one. |
| npm installs | Claude writes `package.json` with exact versions, then **asks permission** to run `npm install`. Claude never installs anything silently. |
| Tests | Vitest from step 2 on. |
| Temp files | Use `tmp/` in this project (git-ignored). |

---

## Step 1: Project init (Vite + Svelte 5 + TS + Vitest scaffold)

**Goal:** a runnable empty app with the final folder structure, so `npm run dev` works before any livesplit-core work.

- [ ] Extend the existing `.gitignore` (keep its `livesplit*/` and `LiveSplit*/` entries): `node_modules/`, `dist/`, `dev-dist/`, `tmp/`.
- [ ] `package.json` (newest stable versions, verified against the npm registry): `vite`, `svelte@5`, `@sveltejs/vite-plugin-svelte`, `typescript@^5`, `svelte-check`, `vitest`, `idb`. livesplit-core is added in step 3, and the PWA plugin in step 11. Scripts: `dev`, `build`, `preview`, `check`, `test`.
- [ ] Ask permission to run `npm install`.
- [ ] `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `index.html`, `src/main.ts`, `src/App.svelte` with a hash router (`#/` Timer, `#/controls` Controls), and placeholder `pages/TimerPage.svelte` + `pages/ControlsPage.svelte` with navigation between them.
- [ ] `src/styles/tokens.css` (dark LiveSplit-like placeholder tokens: bg, text, ahead/behind gain/loss shades, gold, paused, not-running, fonts, spacing) + `global.css`. Components use tokens only.
- [ ] Folder structure from plan.md §5 (empty modules with a one-line comment are fine), plus `scripts/`, `vendor/`, `tests/fixtures/`, `docs/`.
- [ ] Copy these sample split files from `livesplit-core-master/tests/run_files/` into `tests/fixtures/`: `livesplit1.6.lss`, `livesplit1.6_gametime.lss`, `Celeste - Any% (1.2.1.5).lss`, `celeste_native_segment_groups.lss`. Also copy `LICENSE-MIT` / `LICENSE-APACHE` there, because these are livesplit-core test files.
- [ ] `README.md`: what the project is, prerequisites (Node 24; Podman only for rebuilding the core), `npm run dev/build/preview/check/test`, project structure overview, and the browser focus limitation.
- [ ] One trivial Vitest test so `npm run test` passes.

**Commands needing approval:** `npm install`, then `npm run dev` / `check` / `test` / `build`.
**Acceptance:** `npm run dev` serves both pages and the hash links switch between them; `npm run check`, `npm run test` and `npm run build` are clean.
**Commit:** `chore: project init (vite + svelte 5 + ts scaffold, readme)`

Notes / deviations:

---

## Step 2: Build livesplit-core to WASM in Podman

**Goal:** a reproducible, containerized build that outputs an npm-installable `vendor/livesplit-core/`.

- [ ] Work out the build from the livesplit-core sources (the `capi/` crate and its feature list, `capi/bind_gen` for the TypeScript bindings, and the wasm-bindgen CLI version matching the crate). Design our own build; don't copy the LiveSplit One scripts.
- [ ] `scripts/livesplit-core.Containerfile`: rust image (≥ 1.97), `wasm32-unknown-unknown` target, git, matching `wasm-bindgen-cli`.
- [ ] `scripts/build-livesplit-core.sh` (runs on host, calls podman). Inside the container it:
  - clones `https://github.com/LiveSplit/livesplit-core` and checks out the pinned `LSC_COMMIT` (variable at the top of the script; first run: pick current master HEAD and record it),
  - builds the bindings + wasm (`--target web`) with our feature list,
  - copies the output to `/out`, which is mounted to `vendor/livesplit-core/`,
  - uses a named podman volume for the cargo registry/target cache so rebuilds are fast.
- [ ] `docs/build-livesplit-core.md`: our own instructions: prerequisites (Podman only), how to run the script, how to bump `LSC_COMMIT`, how to change features, what the output contains, and troubleshooting.
- [ ] `vendor/livesplit-core/`: `livesplit_core.js`, `livesplit_core_bg.wasm`, `.d.ts` files, `index.ts`, `preload.ts`, `LICENSE-*`, a hand-written `package.json` (`name: livesplit-core`, `type: module`, `exports`/`types` pointing at the right entry), and `BUILD-INFO.md` (commit SHA, rust version, wasm-bindgen version, features, date, wasm size).
- [ ] Read the generated `index.ts`/`.d.ts` and write `vendor/livesplit-core/API-NOTES.md`: the exact names for parsing a run, Timer create/split/skip/undo/pause/reset, Layout/LayoutState JSON, comparisons, timing method, run save to `.lss`, and dispose. **Later steps rely on this file instead of memory.**
- [ ] README: add a short "Rebuilding livesplit-core" section that links to `docs/build-livesplit-core.md`.

**Commands needing approval:** `podman build …`, `podman run …` (the developer runs them or approves them).
**Acceptance:** the script runs end to end from a clean state; `vendor/livesplit-core/` contains the wasm + glue + API notes.
**If the build fails:** stop and report. Don't fall back to a hand-rolled timer (plan.md §4).
**Commit:** `build: containerized livesplit-core wasm build, vendored output`

Notes / deviations:

---

## Step 3: Core wrapper + smoke test

- [ ] Add `"livesplit-core": "file:./vendor/livesplit-core"` to `package.json` and ask permission to run `npm install`.
- [ ] `src/lib/timer/core.ts`: load the WASM once (`init()`), expose typed helpers based on `API-NOTES.md`: `parseRun(text)`, `createTimer(run)`, `saveRunAsLss(timer)`, plus a default `Layout` built in code (title, splits, timer, previous segment, sum of best, possible time save).
- [ ] Confirm that the `.wasm` loads in the Vite dev server **and** in `vite build && vite preview` with MIME type `application/wasm`. Add the wasm/TLA plugins only if needed and record that in Decisions.
- [ ] Vitest smoke test (Node): read `tests/fixtures/livesplit1.6.lss`, parse it, create a Timer, start, split, read the current time > 0, save to `.lss`, re-parse, and check that the segment names are equal. In Node, initialize with the wasm bytes from `fs`.

**Acceptance:** smoke test green; the browser console shows the parsed game name on the Timer page.
**Commit:** `feat(core): livesplit-core wrapper and smoke test`

Notes / deviations:

---

## Step 4: Timer store + Timer page rendering

- [ ] `timerStore.svelte.ts`: owns the Timer + Layout; a `requestAnimationFrame` loop that calls the layout's state update → JSON (or typed state accessors) → `$state`. Reuse/dispose the per-frame state objects (no per-frame WASM leaks). The loop pauses when `document.hidden`.
- [ ] Actions on the store: `splitOrStart`, `undo`, `skip`, `togglePause`, `reset` (and save-on-reset hook, a no-op for now).
- [ ] Timer page UI from the layout state: header (game, category, attempts), split list (name, delta, time, current highlighted, auto-scroll, configurable visible rows), big timer (tabular nums, color from the state's semantic color mapped to tokens), footer (previous segment, possible time save, sum of best).
- [ ] Temporary on-screen buttons for the 5 actions.
- [ ] Load `tests/fixtures/livesplit1.6.lss` by default (dev only) until import exists.

**Acceptance:** a full run with the buttons works; deltas and colors match what livesplit-core reports; no memory growth over a few minutes in devtools.
**Commit:** `feat(timer): reactive timer store and timer page`

Notes / deviations:

---

## Step 5: Import, empty state, comparison & timing method

- [ ] `lss.ts`: import from File (picker + drag-and-drop onto the page), with a readable error on parse failure; export to a `.lss` download (Blob + `<a download>`).
- [ ] Empty state: "Import a .lss file or create a new run" + import button. Remove the dev default fixture.
- [ ] Comparison switching (list what the run offers) and a Real Time / Game Time toggle (only if the run has game time; test with `livesplit1.6_gametime.lss`). Temporary placement on the Timer page; it moves to Controls in step 8.
- [ ] Screen Wake Lock while running (feature-detect; release on pause/reset/finish; re-acquire on `visibilitychange`).
- [ ] Vitest: lss round-trip (import → export → import keeps segment names and PB split times) for all 4 fixtures.

**Commit:** `feat(timer): lss import/export, comparisons, timing method, wake lock`

Notes / deviations:

---

## Step 6: Input layer + keyboard

- [ ] `input/types.ts` (`Action`), `bindings.ts` (model: per action, a list of `{kind:'key', code}` / `{kind:'pad', buttonIndex, padId?, label}`; defaults; serialize/parse with versioning).
- [ ] `inputManager.ts`: registers sources and dispatches Actions to the timer store; a de-dupe window so the same Action from two sources within ~50 ms fires once; enabled only on the Timer page (Controls page capture mode takes over).
- [ ] `keyboardSource.ts`: `keydown` on window, `event.code`, ignore `repeat` and editable targets, `preventDefault` only for bound keys on the Timer page.
- [ ] Remove/hide the on-screen buttons behind a small toggle (keep them for touch).
- [ ] Vitest: bindings serialization, de-dupe, keyboard filtering.

**Commit:** `feat(input): input manager and keyboard source`

Notes / deviations:

---

## Step 7: Gamepad source

- [ ] `gamepadSource.ts`: polled from the rAF loop (shared ticker; it must keep polling even when the timer isn't running), rising-edge detection per pad/button, per-button debounce, connect/disconnect events, padId matching that tolerates id changes (fall back to button index).
- [ ] Make the core logic pure (snapshot in → events out) so it can be tested without a browser.
- [ ] Vitest: edge detection and debounce with fake snapshots; disconnect mid-press.

**Commit:** `feat(input): gamepad source with edge detection`

Notes / deviations:

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

## Step 12: Prototype wrap-up

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
