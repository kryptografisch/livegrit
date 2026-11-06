# Future features

Things that are not part of the prototype (steps 1–13 in `open-todos.md`).
Collected from `plan.md` and the "Notes / deviations" of the steps. Nothing here is planned in detail yet.

## Design

- Design pass (plan.md milestone 7): apply the developer's design via `src/styles/tokens.css` and the components. Wait for the design; don't invent a final look.

## Hardening (plan.md milestone 8, §9)

- Manual matrix: Chrome, Firefox, Safari (desktop), Chrome Android; keyboard and one real gamepad (Xbox/PS style) mapped and used for a full run.
- Behavioral checks:
  - timer matches wall-clock within a few ms over a 5-minute run; no drift when the tab is backgrounded and foregrounded
  - reload while idle restores the last run and bindings
  - offline start works after the first load
  - no console errors; no WASM memory growth over a 30-minute run (heap in DevTools)
- A manual test checklist (`docs/manual-tests.md`) with what was actually verified.

## Known limits to revisit

- Exporting the loaded splits from the Settings window gives their last saved state; the Timer window's running attempt isn't saved until reset/finish.
- Without Web Locks (no secure context, e.g. the dev server via LAN IP over http) a crashed Settings window that the Timer window didn't open isn't noticed; its modal "Close" hides it.

## Further features

- `wasm-opt` size pass for the livesplit-core WASM.
- Tauri wrapper for global (OS-level) hotkeys. Input already goes through `inputManager`, so a native hotkey source would be a drop-in addition.
