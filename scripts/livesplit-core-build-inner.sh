#!/usr/bin/env bash
# Runs INSIDE the build container (see livesplit-core.Containerfile).
# Do not run this on the host; use scripts/build-livesplit-core.sh.
#
# Inputs (environment, set by build-livesplit-core.sh):
#   LSC_REPO, LSC_COMMIT, LSC_FEATURES, CARGO_PROFILE, UPDATE_LOCK (0|1)
# Mounts:
#   /build                       named volume: source checkout, cargo target dir, staging
#   /usr/local/cargo/registry    named volume: crates.io cache
#   /out                         vendor/livesplit-core/ on the host
set -euo pipefail

: "${LSC_REPO:?}" "${LSC_COMMIT:?}" "${LSC_FEATURES:?}" "${CARGO_PROFILE:?}"
UPDATE_LOCK="${UPDATE_LOCK:-0}"

SRC=/build/livesplit-core
BINDINGS=/build/bindings
STAGE=/build/stage
OUT=/out
TARGET=wasm32-unknown-unknown
export CARGO_TARGET_DIR=/build/target

log() { printf '\n==> %s\n' "$*"; }

# Files this script owns in /out. Everything else there (package.json,
# API-NOTES.md, ...) is hand-written and never touched.
GENERATED_FILES=(
  livesplit_core.js
  livesplit_core.d.ts
  livesplit_core_bg.wasm
  livesplit_core_bg.wasm.d.ts
  index.ts
  index.js
  index.d.ts
  preload.ts
  preload.js
  preload.d.ts
  LICENSE-MIT
  LICENSE-APACHE
  Cargo.lock
  BUILD-INFO.md
)

# --- 1. source at the pinned commit -----------------------------------------
log "Fetching ${LSC_REPO} @ ${LSC_COMMIT}"
if [[ ! -d "${SRC}/.git" ]]; then
  rm -rf "${SRC}"
  git init --quiet "${SRC}"
  git -C "${SRC}" remote add origin "${LSC_REPO}"
fi
git -C "${SRC}" remote set-url origin "${LSC_REPO}"
git -C "${SRC}" fetch --quiet --depth 1 origin "${LSC_COMMIT}"
git -C "${SRC}" -c advice.detachedHead=false checkout --quiet --force FETCH_HEAD
git -C "${SRC}" clean --quiet -fdx
actual_commit="$(git -C "${SRC}" rev-parse HEAD)"
if [[ "${actual_commit}" != "${LSC_COMMIT}" ]]; then
  echo "error: checked out ${actual_commit}, expected ${LSC_COMMIT} (use the full 40-char SHA)" >&2
  exit 1
fi

# --- 2. Cargo.lock (upstream doesn't commit one; we vendor ours) -------------
if [[ "${UPDATE_LOCK}" != "1" && -f "${OUT}/Cargo.lock" ]]; then
  log "Reusing vendored Cargo.lock"
  cp "${OUT}/Cargo.lock" "${SRC}/Cargo.lock"
else
  log "Generating a fresh Cargo.lock"
  (cd "${SRC}" && cargo generate-lockfile)
fi

# `--locked` makes cargo fail instead of silently changing the lockfile.
if ! (cd "${SRC}" && cargo metadata --locked --format-version 1 >/dev/null); then
  echo "error: the vendored Cargo.lock doesn't fit commit ${LSC_COMMIT}." >&2
  echo "       Re-run with --update-lock (expected after bumping LSC_COMMIT)." >&2
  exit 1
fi

# --- 3. wasm-bindgen crate version must equal the CLI version ---------------
crate_wb="$(cd "${SRC}" && cargo pkgid --locked wasm-bindgen | sed 's/.*@//')"
cli_wb="$(wasm-bindgen --version | awk '{print $2}')"
if [[ "${crate_wb}" != "${cli_wb}" ]]; then
  echo "error: Cargo.lock resolves wasm-bindgen ${crate_wb}, but the CLI is ${cli_wb}." >&2
  echo "       Set WASM_BINDGEN_VERSION=${crate_wb} in scripts/build-livesplit-core.sh" >&2
  echo "       (or re-run with --update-lock to resolve the newest crate version)." >&2
  exit 1
fi

# --- 4. TypeScript bindings (bind_gen) --------------------------------------
log "Generating bindings (features: ${LSC_FEATURES})"
rm -rf "${BINDINGS}"
(cd "${SRC}/capi/bind_gen" && cargo run --locked --quiet -- \
  --no-default-features --features "${LSC_FEATURES}" --output-dir "${BINDINGS}")

# --- 5. WASM (cdylib only; the crate also declares staticlib) ----------------
log "Compiling livesplit-core-capi for ${TARGET} (profile ${CARGO_PROFILE})"
(cd "${SRC}" && cargo rustc --locked -p livesplit-core-capi --crate-type cdylib \
  --no-default-features --features "${LSC_FEATURES}" \
  --target "${TARGET}" --profile "${CARGO_PROFILE}")
wasm_in="${CARGO_TARGET_DIR}/${TARGET}/${CARGO_PROFILE}/livesplit_core.wasm"

# --- 6. wasm-bindgen glue (--target web: ES module, init() loads the .wasm) --
log "Running wasm-bindgen --target web"
rm -rf "${STAGE}"
mkdir -p "${STAGE}"
wasm-bindgen --target web --out-dir "${STAGE}" "${wasm_in}"

# --- 7. compile bind_gen's index.ts/preload.ts to JS + .d.ts -----------------
log "Compiling index.ts / preload.ts with tsc"
cp "${BINDINGS}/wasm_bindgen/web/index.ts" "${BINDINGS}/wasm_bindgen/web/preload.ts" "${STAGE}/"
# Browsers / Node ESM need explicit extensions on relative imports.
sed -i 's#from "./preload";#from "./preload.js";#' "${STAGE}/index.ts"
grep -q 'from "./preload.js";' "${STAGE}/index.ts" \
  || { echo "error: couldn't patch the preload import in index.ts" >&2; exit 1; }
(cd "${STAGE}" && tsc --target es2022 --module es2022 --moduleResolution bundler \
  --lib es2022,esnext.disposable,dom --declaration --skipLibCheck index.ts preload.ts)

# --- 8. licenses, lockfile, build info --------------------------------------
cp "${SRC}/LICENSE-MIT" "${SRC}/LICENSE-APACHE" "${SRC}/Cargo.lock" "${STAGE}/"

wasm_size="$(stat -c %s "${STAGE}/livesplit_core_bg.wasm")"
wasm_sha="$(sha256sum "${STAGE}/livesplit_core_bg.wasm" | awk '{print $1}')"
cat >"${STAGE}/BUILD-INFO.md" <<EOF
# livesplit-core build info

Generated by \`scripts/build-livesplit-core.sh\`. Do not edit by hand.

| Item                | Value |
| ------------------- | ----- |
| Source              | ${LSC_REPO} |
| Commit              | \`${LSC_COMMIT}\` |
| Built (UTC)         | $(date -u +%Y-%m-%dT%H:%M:%SZ) |
| rustc               | $(rustc --version) |
| cargo               | $(cargo --version) |
| wasm-bindgen CLI    | ${cli_wb} (\`--target web\`) |
| TypeScript (tsc)    | $(tsc --version | awk '{print $2}') |
| Cargo profile       | ${CARGO_PROFILE} |
| Features            | \`--no-default-features --features ${LSC_FEATURES}\` |
| Wasm size           | ${wasm_size} bytes ($((wasm_size / 1024)) KiB) |
| Wasm SHA-256        | \`${wasm_sha}\` |
EOF

# --- 9. publish to /out ------------------------------------------------------
log "Copying output to vendor/livesplit-core/"
for f in "${GENERATED_FILES[@]}"; do
  [[ -f "${STAGE}/${f}" ]] || { echo "error: expected output ${f} is missing" >&2; exit 1; }
  rm -f "${OUT:?}/${f}"
  cp "${STAGE}/${f}" "${OUT}/${f}"
done

log "Done"
cat "${OUT}/BUILD-INFO.md"
