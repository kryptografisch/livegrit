# Development

## Prerequisites

- Node.js 24+ and npm
- Podman, only if you want to rebuild livesplit-core (the built WASM is committed in `vendor/`)

## Getting started

```sh
npm install
npm run dev        # dev server with hot reload
npm run build      # production build into dist/
npm run preview    # serve dist/ (the service worker and offline mode only work here, not in dev)
```

Before committing: `npm run format`, `npm run check`, `npm run test`.

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
  main.ts, App.svelte      app entry + shell with hash router (#/ and #/settings)
  lib/
    routes.ts, router.svelte.ts  hash routes + router state
    sync/                  coordination between the app's windows (Timer + Settings)
    timer/                 livesplit-core wrapper, reactive timer store, .lss helpers
    input/                 actions, input manager, keyboard + gamepad sources, bindings
    storage/               IndexedDB + persistent storage
    pwa/                   service worker update prompt, install prompt + help
    ticker.ts, wakeLock.ts shared frame loop, screen wake lock during an attempt
    ui/                    small presentational components
  pages/                   TimerPage, SettingsPage (opens in its own window)
  styles/                  tokens.css (all design tokens), global.css
tests/                     Vitest tests; fixtures/ holds our own generated .lss files
vendor/                    built livesplit-core package (WASM + JS bindings)
scripts/                   build scripts (livesplit-core via Podman)
docs/                      reference docs
```

## Rebuilding livesplit-core

The built core (WASM + JS/TS bindings) is committed in `vendor/livesplit-core/`, so you don't need Rust.
To rebuild it (newer livesplit-core, other features), run `scripts/build-livesplit-core.sh`. It needs only Podman.
The pinned commit, toolchain versions and features are listed in `vendor/livesplit-core/BUILD-INFO.md`.
See [build-livesplit-core.md](build-livesplit-core.md) for details.

## Styling

All colors, fonts, sizes and spacing are CSS custom properties in `src/styles/tokens.css`.
Components don't hard-code colors, so a new design can be applied by changing the tokens.
