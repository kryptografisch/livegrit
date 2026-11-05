# split-lite

A browser-only, installable (PWA) speedrun split timer that looks and behaves similar to LiveSplit.
It's built with Svelte 5, TypeScript and Vite, and uses [livesplit-core](https://github.com/LiveSplit/livesplit-core), compiled to WebAssembly, for all timing and split logic.

Status: early prototype. See `open-todos.md` for the step plan and `plan.md` for the full spec.

## Prerequisites

- Node.js 24+ and npm
- Podman, only if you want to rebuild livesplit-core (the built WASM is committed in `vendor/`)

## Scripts

| Command                | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `npm install`          | Install dependencies                              |
| `npm run dev`          | Start the dev server                              |
| `npm run build`        | Production build into `dist/`                     |
| `npm run preview`      | Serve the production build locally                |
| `npm run check`        | Type-check TypeScript and Svelte (`svelte-check`) |
| `npm run test`         | Run unit tests once (Vitest)                      |
| `npm run test:watch`   | Run unit tests in watch mode                      |
| `npm run format`       | Format all files with Prettier                    |
| `npm run format:check` | Check formatting without changing files           |

## Project structure

```
src/
  main.ts, App.svelte      app entry + shell with hash router (#/ and #/controls)
  lib/
    router.svelte.ts       hash router state
    timer/                 livesplit-core wrapper, reactive timer store, .lss helpers
    input/                 actions, input manager, keyboard + gamepad sources, bindings
    storage/               IndexedDB + persistent storage
    ui/                    small presentational components
  pages/                   TimerPage, ControlsPage
  styles/                  tokens.css (all design tokens), global.css
tests/                     Vitest tests; fixtures/ holds sample .lss files
vendor/                    built livesplit-core package (WASM + JS bindings)
scripts/                   build scripts (livesplit-core via Podman)
docs/                      reference docs
```

## Styling

All colors, fonts, sizes and spacing are CSS custom properties in `src/styles/tokens.css`.
Components don't hard-code colors, so a new design can be applied by changing the tokens.
