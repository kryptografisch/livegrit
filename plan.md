# Browser Speedrun Timer: Implementation Plan

Hand-off document for an implementing agent. Read fully before starting.

## 1. Goal

A browser-only, installable (PWA) speedrun split timer, similar in look and behavior to LiveSplit, built with **Svelte 5 + TypeScript + Vite**, using the **livesplit-core** Rust library compiled to WebAssembly for all timing and split logic.

### In scope (v1)

- Import a `.lss` file (LiveSplit split file); export it back to `.lss`.
- Running timer, split list, per-split time and **delta** against the chosen comparison.
- Controls: **start/split, undo split, skip split, pause/resume, reset**.
- Input from **keyboard** and **gamepad buttons** (Gamepad API), user-configurable.
- Two pages: **Timer** and **Controls/Settings** (input bindings, comparison, storage status, import/export).
- Persistent local storage (IndexedDB + persistent-storage request).
- PWA: installable, works offline.

### Out of scope (v1)

- Global OS-level hotkeys (impossible in a browser; a Tauri wrapper is a possible later phase, so keep input behind an interface, see 5).
- LiveSplit Server, auto-splitters, layouts editor, leaderboards/uploads, multi-user/cloud sync.
- Run-history graphs and other analytics beyond what the timer needs.

## 2. Decisions already made (do not revisit)

| Topic        | Decision                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Svelte 5 (runes) + TypeScript 5.x + Vite                                                                                              |
| Timing/logic | livesplit-core via WASM (no hand-rolled timer)                                                                                        |
| Platform     | Browser only, PWA, no backend                                                                                                         |
| Storage      | IndexedDB (via `idb`) + `navigator.storage.persist()`                                                                                 |
| Design       | Simple timer, very close to LiveSplit's look. **The design will be supplied by the user later**; build with swappable styling (see 7) |
| Pages        | Timer page + Controls page (hash-based routing is fine)                                                                               |

## 3. Current state of `/home/claude/splitter`

Already created (no source files yet):

- `package.json` with dev deps: `vite@8`, `svelte@5`, `@sveltejs/vite-plugin-svelte`, `typescript@^5` (**not 7**; `svelte-check` does not support TS 7 yet), `svelte-check`, `vite-plugin-pwa`, `vite-plugin-wasm`, `vite-plugin-top-level-await`.
- Runtime deps: `idb`, `livesplit-core@0.10.2`.

**Remove `livesplit-core@0.10.2` from the npm dependencies.** See section 4.

Environment notes: Node 22, npm 10. Check `which cargo rustc`; Rust may be present, but `rustup` and github.com may be unreachable in a sandbox (crates.io worked). pip/npm registries work.

## 4. FIRST BLOCKER: obtaining a current livesplit-core WASM build

The npm package `livesplit-core` is **stale**: latest is `0.10.2` (September 2018), an asm.js build. **Do not use it.** Current livesplit-core publishes its JS bindings only as source; LiveSplit One builds them from the Rust repo.

Resolve this before any other work:

1. Get the source from `https://github.com/LiveSplit/livesplit-core` (clone, or a vendored copy the user supplies).
2. Find the current WASM/JS bindings in the repo (look under `capi/bindings/` for the `wasm_bindgen` bindings; also read how `https://github.com/LiveSplit/LiveSplitOne` builds and consumes them: its `package.json`, build scripts, and `CI` workflow are the reference). **Verify paths and commands against the repo; they change.**
3. Build with `cargo` + the `wasm32-unknown-unknown` target + `wasm-bindgen` (match the `wasm-bindgen` CLI version to the crate version). Use only the features needed (parsing, `.lss` save, timer, layout/state); disable networking/hotkey/auto-splitting features so the binary stays small.
4. Put the output in `vendor/livesplit-core/` (an npm-installable package folder) and add it to `package.json` as `"livesplit-core": "file:./vendor/livesplit-core"`.
5. Add `scripts/build-livesplit-core.sh` that reproduces the build, and document the prerequisites in `README.md`.
6. **Commit/keep the built artifact in `vendor/`** so later steps and other machines don't need Rust installed.

If the build cannot be done in the environment, **stop and ask the user** to either supply the built package or choose a fallback (own TypeScript timer plus `.lss` XML parser, which loses livesplit-core's edge-case fidelity). Do not silently fall back.

Acceptance: a Node/Vite smoke test imports the package, parses a sample `.lss`, creates a `Timer`, calls start/split, and reads the current time.

## 5. Architecture

```
src/
  main.ts
  App.svelte                  # hash router, shell
  lib/
    timer/
      core.ts                 # loads WASM once; wraps livesplit-core
      timerStore.svelte.ts    # reactive state exposed to UI
      lss.ts                  # import/export helpers
    input/
      types.ts                # Action = 'split'|'undo'|'skip'|'pause'|'reset'
      inputManager.ts         # merges sources, dispatches Actions
      keyboardSource.ts
      gamepadSource.ts
      bindings.ts             # binding model + defaults
    storage/
      db.ts                   # IndexedDB (idb)
      persist.ts              # navigator.storage.persist()/persisted()/estimate()
    ui/                       # small presentational components
  pages/
    TimerPage.svelte
    ControlsPage.svelte
  styles/
    tokens.css                # design tokens (colors, fonts, sizes)
public/                       # icons, manifest assets
```

### Key rules

- **livesplit-core is the single source of truth** for time, split state, comparisons and deltas. The UI never keeps its own clock. Render loop: `requestAnimationFrame` → read current timer state from the core → update reactive state.
- All input sources emit abstract **Actions** into `inputManager`; only `inputManager` calls the timer. This keeps a future native/global-hotkey source (e.g. Tauri) a drop-in addition.
- Free WASM objects explicitly (`.dispose()` / equivalent per the generated bindings) to avoid leaks, especially for per-frame state objects. Verify the API in the generated `index.d.ts`.
- Delta/split display: use livesplit-core's own comparison and layout state (the timer, splits and delta component states) rather than recomputing. Confirm exact API names from the built bindings; do not rely on memory.

## 6. Features in detail

### 6.1 Timer page

- Header: game name, category, attempt count (from the `.lss`).
- Split list: segment name, delta, split time (per comparison); current split highlighted; list scrolls to keep the current split visible; configurable number of visible rows.
- Main timer: large time with hundredths; color by state (not started / running / ahead / behind / finished / paused).
- Footer info: previous segment delta, possible time save, sum of best (nice to have, only if cheap via layout state).
- Empty state: "Import a .lss file or create a new run" with an import button; drag-and-drop of `.lss` onto the page.
- Keep screen awake while running: Screen Wake Lock API (feature-detect; fail silently).

### 6.2 Controls page

- Table of Actions with **keyboard binding** and **gamepad binding**, each with "Press a key/button…" capture mode, clear, and reset-to-defaults. Allow multiple bindings per action.
- Gamepad: show connected pads, live button state for easy mapping, and a note that some browsers hide pads until a button is pressed once.
- Comparison selector (Personal Best, Best Segments, Average Segments, etc., whatever the loaded run offers).
- Timing method toggle (real time / game time) if the loaded run has game time.
- Run management: import `.lss`, export `.lss`, list/delete saved runs, "new empty run" (name + split names).
- Storage status: `persisted()` result, `estimate()` usage, "Request persistent storage" button.

### 6.3 Input handling

- **Keyboard:** `keydown` listener on `window`; ignore when typing in inputs; ignore `event.repeat`; prevent default for bound keys (e.g. Space) only on the Timer page; capture by `event.code` (layout-independent).
- **Gamepad:** poll `navigator.getGamepads()` once per animation frame; detect rising edges (pressed this frame, not last frame) per pad/button index; debounce to avoid double triggers; handle connect/disconnect events. Store bindings as `{ padId?, buttonIndex }`; match on button index plus optionally a pad id string, and be tolerant when the pad id changes between sessions.
- Dispatching the same Action from both sources must not double-fire within a short window.

### 6.4 Storage

IndexedDB database `splitter` with stores:

- `runs`: `{ id, name, game, category, lss: string, updatedAt }`
- `settings`: single record: bindings, comparison, timing method, visible rows, last active run id

Behavior:

- Save the run's `.lss` (via the core's save function) when an attempt **ends or is reset**, and after edits. Do not write on every frame.
- On first launch call `navigator.storage.persist()` (after a user gesture if the browser needs one) and show the result on the Controls page.
- Persistent storage does not survive the user clearing site data, so `.lss` export is the real backup. Surface an "Export backup" action prominently.
- Use schema versioning in `onupgradeneeded` from day one.

### 6.5 PWA

- `vite-plugin-pwa` with `registerType: 'autoUpdate'` (or prompt-for-update if simpler to reason about while a run is active; **never reload mid-run**).
- Manifest: name, short_name, `display: standalone`, theme/background colors, 192/512 and maskable icons (generate placeholders).
- Precache the app shell **and the `.wasm` file**; verify the app starts offline.
- Configure `vite-plugin-wasm` + `vite-plugin-top-level-await` (or the bindings' own loader) as needed; make sure the WASM file is emitted and served with `application/wasm`.

## 7. Styling / design handoff

- The user will provide the visual design later. Until then, build a clean dark LiveSplit-like placeholder.
- All colors, fonts, sizes, spacing and the ahead/behind/gold/paused palette live as **CSS custom properties in `styles/tokens.css`**. Components must not hard-code colors.
- Use a monospace/tabular-figures font setting for the timer so digits don't jitter (`font-variant-numeric: tabular-nums`).
- Layout must be resizable and fit narrow widths (mobile) and a small always-on-top window; fix the sizing/instability problems of the original LiveSplit One by using plain CSS flex/grid and `rem`/`clamp()`, no fixed pixel layout.

## 8. Milestones (do in order; each ends with a runnable state)

1. **Core available.** Section 4 done; smoke test passes. Remove stale npm package.
2. **Skeleton.** Vite + Svelte + TS config, router, two empty pages, `svelte-check` clean, dev server runs.
3. **Timer engine.** `core.ts` + `timerStore`; import `.lss`, show timer + splits + delta; start/split/undo/skip/pause/reset via on-screen buttons. Test with a real `.lss` (use any public LiveSplit sample or a hand-written one).
4. **Input.** Keyboard source, gamepad source, `inputManager`, Controls page with capture UI and persisted bindings.
5. **Storage.** IndexedDB runs and settings, persistent-storage request and status, `.lss` export, auto-restore of the last run on reload.
6. **PWA.** Manifest, service worker, offline start, icons. Test via `vite build && vite preview` and Lighthouse PWA checks.
7. **Design pass.** Apply the user's design via tokens/components. (Wait for the design; do not invent a final look.)
8. **Hardening.** See 9.

## 9. Testing and acceptance

- **Unit (Vitest):** bindings serialization, input edge detection (feed fake gamepad snapshots), debounce, `lss` round-trip (import → export → import preserves split names and times).
- **Manual matrix:** Chrome, Firefox, Safari (desktop), Chrome Android; keyboard and one real gamepad (Xbox/PS style) mapped and used to complete a full run.
- **Behavioral checks:**
  - Timer matches wall-clock within a few ms over a 5-minute run; no drift when the tab is backgrounded and foregrounded (the core uses absolute timestamps; verify).
  - Reload mid-idle restores the last run and bindings.
  - Offline start works after first load.
  - No console errors; no WASM memory growth over a 30-minute run (watch the heap in devtools).
- `npm run build`, `svelte-check`, and Vitest all pass in CI-style order.

## 10. Risks and notes

- **livesplit-core build tooling is the biggest risk** (section 4). API names in the new bindings differ from the 2018 npm typings; always read the generated `.d.ts`.
- Browsers throttle timers in background tabs; rendering via `requestAnimationFrame` stops when hidden, but the core's time stays correct because it uses timestamps.
- Safari may evict script-written storage after about 7 days of non-use unless installed to the Home Screen; the persistent-storage request is best-effort. Keep export prominent.
- Gamepad IDs and button indices differ across browsers and OSes; store raw index plus a human-readable label and let the user remap.
- Licensing: livesplit-core is MIT/Apache-style; keep license files in `vendor/`. Do not copy LiveSplit/LiveSplit One UI assets or code without checking their licenses; use them only as a reference for how the core is wired.

## 11. Deliverables

- Working app in `splitter/` with the structure in section 5.
- `README.md`: install, dev, build, how to rebuild livesplit-core, browser limitations.
- `scripts/build-livesplit-core.sh`.
- Short `CHANGELOG`-style note of any deviations from this plan and why.

## 12. Questions to ask the user only if blocked

- Fallback choice if the livesplit-core build is impossible (section 4).
- The design assets/mockup (needed for milestone 7).
