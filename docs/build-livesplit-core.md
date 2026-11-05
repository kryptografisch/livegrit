# Building livesplit-core (WASM)

split-lite uses [livesplit-core](https://github.com/LiveSplit/livesplit-core) compiled to WebAssembly for all timing and split logic.
The npm package `livesplit-core` is a stale 2018 build, so we build the core ourselves and commit the result to `vendor/livesplit-core/`.
You only need to rebuild when you want a newer livesplit-core, other features or a different toolchain.
Normal app development doesn't need any of this.

## Prerequisites

- **Podman** (rootless is fine). Nothing else: Rust, wasm-bindgen and TypeScript only exist inside the build container.
- Network access to `docker.io`, `github.com` and `crates.io` / `npmjs.org` (image build and first run).
- About 3 GB of disk space for the image and the cache volumes.

## Running the build

From the project root:

```sh
scripts/build-livesplit-core.sh                 # normal (incremental) build
scripts/build-livesplit-core.sh --clean         # drop cache volumes first: build from a clean state
scripts/build-livesplit-core.sh --update-lock   # re-resolve Cargo.lock (after bumping LSC_COMMIT)
```

The script:

1. Builds the image `localhost/split-lite-lsc-builder:…` from `scripts/livesplit-core.Containerfile`: the Rust image, the `wasm32-unknown-unknown` target, `wasm-bindgen-cli` (pinned version), and Node + TypeScript (pinned) copied from the official Node image.
2. Runs the container with the inner script `scripts/livesplit-core-build-inner.sh`, which:
   - fetches **only** the pinned commit `LSC_COMMIT` (shallow) into the cache volume,
   - reuses `vendor/livesplit-core/Cargo.lock` (or generates a fresh one with `--update-lock` / on first run) and builds with `--locked`,
   - checks that the `wasm-bindgen` crate version in `Cargo.lock` equals the CLI version (they must match exactly),
   - runs livesplit-core's `capi/bind_gen` with our feature list to generate the TypeScript bindings,
   - compiles `livesplit-core-capi` as a `cdylib` for `wasm32-unknown-unknown` with the `max-opt` profile,
   - runs `wasm-bindgen --target web`,
   - compiles the generated `index.ts` / `preload.ts` with `tsc` to `.js` + `.d.ts` (after patching the `./preload` import to `./preload.js`),
   - copies the generated files to `/out` = `vendor/livesplit-core/` and writes `BUILD-INFO.md`.

Two named volumes keep rebuilds fast:

| Volume                 | Mounted at                  | Holds                                           |
| ---------------------- | --------------------------- | ----------------------------------------------- |
| `split-lite-lsc-build` | `/build`                    | source checkout, cargo target dir, staging dirs |
| `split-lite-lsc-cargo` | `/usr/local/cargo/registry` | crates.io download cache                        |

Remove them with `--clean` or `podman volume rm split-lite-lsc-build split-lite-lsc-cargo`.

## Pinned inputs

All of them are variables at the top of `scripts/build-livesplit-core.sh`:

| Variable               | Meaning                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `LSC_COMMIT`           | full 40-char SHA of livesplit-core to build                              |
| `LSC_FEATURES`         | `capi` crate features (always built with `--no-default-features`)        |
| `CARGO_PROFILE`        | `max-opt` (livesplit-core's own profile: release + LTO, 1 CGU, strip)    |
| `RUST_IMAGE`           | Rust toolchain image (livesplit-core needs Rust ≥ 1.97)                  |
| `NODE_IMAGE`           | Node image that provides `node` + `npm` for `tsc`                        |
| `WASM_BINDGEN_VERSION` | `wasm-bindgen-cli` version, must equal the crate version in `Cargo.lock` |
| `TYPESCRIPT_VERSION`   | `tsc` used for the bindings (same as the app's devDependency)            |

Dependency versions of the Rust crates are pinned by the vendored `vendor/livesplit-core/Cargo.lock` (upstream doesn't commit a lockfile).

### Bumping livesplit-core

1. Find the new commit SHA (e.g. current `master` on GitHub) and set `LSC_COMMIT`.
2. Run `scripts/build-livesplit-core.sh --update-lock`.
3. If it fails with "Cargo.lock resolves wasm-bindgen X, but the CLI is Y", set `WASM_BINDGEN_VERSION=X` and run again (the image gets rebuilt with the new CLI).
4. If livesplit-core raised its `rust-version`, bump `RUST_IMAGE`.
5. Check the API diff (`git diff vendor/livesplit-core/index.d.ts`) and update `vendor/livesplit-core/API-NOTES.md` and the app code.

### Changing features

Edit `LSC_FEATURES`. The names are the features of `capi/Cargo.toml` in livesplit-core. The high-level groups are `parsing`, `run-saving`, `timing`, `run-editing`, `layouts`, `layout-editing`, `analysis`, `hotkeys`, plus the platform features (`wasm-web`, `web-rendering`, `server-protocol`, `auto-splitting`, `localization`, …).
The same list goes to `bind_gen` and `cargo`, so the bindings only contain the enabled API.

Our list is `parsing,run-saving,timing,run-editing,layouts,wasm-web`:

- the first five give us `.lss` parsing, saving, the timer, the run editor and the layout/component state.
- `wasm-web` adds **no API**. It switches the core's clock to `performance.now()` / `Date` via wasm-bindgen, including a fix for the clock drift after the device sleeps, and local-timezone support. Without it, the wasm imports `env.Date_now` / `env.Instant_now`, which we would have to provide ourselves.
- `localization` (non-English strings), hotkeys, the server protocol, web rendering, therun.gg and auto-splitting are deliberately off.

## Output (`vendor/livesplit-core/`)

| File                                        | Origin                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `livesplit_core_bg.wasm`                    | the compiled core                                                   |
| `livesplit_core.js`, `livesplit_core.d.ts`  | wasm-bindgen glue (`init()` loads the wasm via `import.meta.url`)   |
| `livesplit_core_bg.wasm.d.ts`               | wasm-bindgen: raw wasm export types                                 |
| `index.ts` → `index.js`, `index.d.ts`       | bind_gen: the high-level classes (`Run`, `Timer`, `Layout`, …)      |
| `preload.ts` → `preload.js`, `preload.d.ts` | bind_gen: `preloadWasm()`, called by `index.js` via top-level await |
| `LICENSE-MIT`, `LICENSE-APACHE`             | livesplit-core licenses                                             |
| `Cargo.lock`                                | the resolved Rust dependency versions (input for the next build)    |
| `BUILD-INFO.md`                             | commit, toolchain versions, features, date, wasm size + SHA-256     |
| `package.json`, `API-NOTES.md`              | **hand-written**, never touched by the build                        |

The package is consumed as `"livesplit-core": "file:./vendor/livesplit-core"`.
Importing `livesplit-core` runs `await preloadWasm()` at the top level, so the wasm is loaded before any class is used.
In Node (tests), set `globalThis.__lscPreload` to the wasm bytes / `WebAssembly.Module` before the first import, because `fetch()` of a `file:` URL isn't supported there.

## Troubleshooting

| Symptom                                                                    | Fix                                                                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `the vendored Cargo.lock doesn't fit commit …`                             | Run with `--update-lock` (normal after bumping `LSC_COMMIT`).                                                         |
| `Cargo.lock resolves wasm-bindgen X, but the CLI is Y`                     | Set `WASM_BINDGEN_VERSION=X` in the script and run again.                                                             |
| `rustc … is not supported by the following package` / `rust-version` error | Bump `RUST_IMAGE` to a newer `rust:<version>-trixie` tag.                                                             |
| `Permission denied` writing to `/out` (Fedora/SELinux)                     | The script mounts with `:Z`; make sure you didn't remove it. Check `ls -Z vendor/`.                                   |
| `fatal: … not our ref` / fetch fails                                       | `LSC_COMMIT` must be a full SHA that exists upstream.                                                                 |
| `unknown C API feature …` from bind_gen                                    | A feature name in `LSC_FEATURES` doesn't exist in that commit's `capi/Cargo.toml`.                                    |
| Weird incremental build errors                                             | Run with `--clean`.                                                                                                   |
| `tsc` errors on `index.ts`                                                 | The generated bindings changed; check the error, the `./preload` import patch in the inner script may need adjusting. |
