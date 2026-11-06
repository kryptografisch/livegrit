# GENERAL RULES

- do not use git. onyl the developer runs git commands
- only work in this project directoy
- use edit/read/write and skills. if you need to run commandline tools, then prompt to allow so the developer can verify your commands before you run them
- do not install python or perl plugins or addons
- never install libararies yourself. always ask if that is the wanted way to do it
- use the tmp folder in this project
- do not start a server, do not run a (headless) browser, do not take screenshots or videos to analyze. the developer will check results and report back. you can start a server from commandline for checks.

# PROJECT

Browser-only PWA speedrun split timer (LiveSplit-like): Svelte 5 (runes) + TypeScript + Vite, timing/split logic from livesplit-core compiled to WASM.

- `docs/future-features.md`: everything after the prototype (design pass, hardening, known limits, optional ideas). Add new "later" items there.
- `docs/`: local reference docs (e.g. `docs/llms-small.txt` = Svelte 5). Use them instead of memory for Svelte 5 APIs. Missing docs: ask the developer or fetch on demand.
- `vendor/livesplit-core/API-NOTES.md`: the source of truth for livesplit-core API names. Read the generated `.d.ts` if unsure; never guess.
- `livesplit-core-master/`, `LiveSplitOne-master/`: local read-only references, git-ignored. Never depend on them in code or scripts. LiveSplit One is just an idea source; don't copy its code.
- livesplit-core is built only inside Podman (`scripts/build-livesplit-core.sh`, documented in `docs/build-livesplit-core.md`); there's no Rust on the host.
- npm packages: write them into `package.json` (newest stable versions), then ask before running `npm install`.
- After code changes: `npm run format`, `npm run check`, `npm run test` (and `npm run build` at the end of a task).
