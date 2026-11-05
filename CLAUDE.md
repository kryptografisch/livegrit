# GENERAL RULES

- do not use git. onyl the developer runs git commands
- only work in this project directoy
- use edit/read/write and skills. if you need to run commandline tools, then prompt to allow so the developer can verify your commands before you run them
- do not install python or perl plugins or addons
- never install libararies yourself. always ask if that is the wanted way to do it
- use the tmp folder in this project

# PROJECT

Browser-only PWA speedrun split timer (LiveSplit-like): Svelte 5 (runes) + TypeScript + Vite, timing/split logic from livesplit-core compiled to WASM.

- `plan.md`: full spec (goal, architecture, features). Where it conflicts with `open-todos.md` → Decisions, the Decisions win.
- `open-todos.md`: the step-by-step work. Each session works on **one** step the developer names. When done, tick the boxes and fill in that step's "Notes / deviations". The developer commits after each step.
- `docs/`: local reference docs (e.g. `docs/llms-small.txt` = Svelte 5). Use them instead of memory for Svelte 5 APIs. Missing docs: ask the developer or fetch on demand.
- `vendor/livesplit-core/API-NOTES.md` (after step 1): the source of truth for livesplit-core API names. Read the generated `.d.ts` if unsure; never guess.
- `livesplit-core-master/`, `LiveSplitOne-master/`: local read-only references, git-ignored. Never depend on them in code or scripts. LiveSplit One is just an idea source; don't copy its code.
- livesplit-core is built only inside Podman (`scripts/build-livesplit-core.sh`, documented in `docs/build-livesplit-core.md`); there's no Rust on the host.
- npm packages: write them into `package.json` (newest stable versions), then ask before running `npm install`.
- After code changes: `npm run format`, `npm run check`, `npm run test` (and `npm run build` at the end of a step).
