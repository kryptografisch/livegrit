# LiveGrit

A browser-only, installable (PWA) speedrun split timer that looks and behaves similar to LiveSplit.
It's built with Svelte 5, TypeScript and Vite, and uses [livesplit-core](https://github.com/LiveSplit/livesplit-core), compiled to WebAssembly, for all timing and split logic.

Status: prototype. See `plan.md` for the full spec, `open-todos.md` for the steps done so far and [docs/future-features.md](docs/future-features.md) for what's next.

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
See [docs/build-livesplit-core.md](docs/build-livesplit-core.md) for details.

## Browser limitations

- **Storage eviction:** runs and settings live in IndexedDB. Safari may delete storage written by scripts after about 7 days without use unless the app is installed to the Home Screen. The persistent-storage request is best effort (its status is shown in Settings → Data). Export your splits as `.lss` regularly.
- **No global hotkeys:** a browser only gets key presses while the page has focus. Gamepads are read through the Gamepad API, which also needs the page to be visible (and in some browsers focused).
- **Background tabs:** browsers throttle hidden tabs, so the display stops updating, but the time stays correct (livesplit-core uses timestamps).
- **Installing:** only Chromium browsers (Chrome, Edge, Android) offer a real install button. Safari, Firefox on Android and Samsung Internet install through their menus (the app shows instructions). Desktop Firefox can't install PWAs. Installing and offline mode need https (or `localhost`).
- **Several windows:** the app can only reliably tell whether a Settings window is open when Web Locks are available, which needs a secure context (https or `localhost`).
- **Screen wake lock:** the screen stays awake during an attempt only in browsers that support the Screen Wake Lock API.

## Styling

All colors, fonts, sizes and spacing are CSS custom properties in `src/styles/tokens.css`.
Components don't hard-code colors, so a new design can be applied by changing the tokens.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

Exception: `vendor/livesplit-core/` is the built [livesplit-core](https://github.com/LiveSplit/livesplit-core), licensed under MIT or Apache-2.0 (`LICENSE-MIT`, `LICENSE-APACHE` in that folder).
