#!/usr/bin/env bash
# Builds livesplit-core to WASM + JS/TS bindings inside Podman and writes the
# result to vendor/livesplit-core/. Runs on the host; needs only Podman.
# Docs: docs/build-livesplit-core.md
set -euo pipefail

# --- pinned inputs (edit here) ----------------------------------------------
LSC_REPO="https://github.com/LiveSplit/livesplit-core"
LSC_COMMIT="f348cf69180ba910df9450c4d64079a7695572db" # master, 2026-10-31
LSC_FEATURES="parsing,run-saving,timing,run-editing,layouts,wasm-web"
CARGO_PROFILE="max-opt" # livesplit-core's own profile: release + LTO, 1 CGU, strip

RUST_IMAGE="docker.io/library/rust:1.99.1-trixie"
NODE_IMAGE="docker.io/library/node:24.19.0-trixie-slim"
WASM_BINDGEN_VERSION="0.2.130" # must equal the wasm-bindgen crate in Cargo.lock
TYPESCRIPT_VERSION="6.0.3"     # same as the app's devDependency

IMAGE_TAG="localhost/split-lite-lsc-builder:rust-1.99.1-wb-${WASM_BINDGEN_VERSION}"
VOLUME_BUILD="split-lite-lsc-build" # source checkout + cargo target dir
VOLUME_CARGO="split-lite-lsc-cargo" # crates.io registry cache
# -----------------------------------------------------------------------------

usage() {
  cat <<EOF
Usage: scripts/build-livesplit-core.sh [--update-lock] [--clean] [--help]

  --update-lock  ignore vendor/livesplit-core/Cargo.lock and resolve dependencies
                 fresh (needed after bumping LSC_COMMIT)
  --clean        remove the cache volumes (${VOLUME_BUILD}, ${VOLUME_CARGO})
                 before building, i.e. a build from a clean state
EOF
}

UPDATE_LOCK=0
CLEAN=0
for arg in "$@"; do
  case "${arg}" in
    --update-lock) UPDATE_LOCK=1 ;;
    --clean) CLEAN=1 ;;
    -h | --help) usage; exit 0 ;;
    *) echo "unknown argument: ${arg}" >&2; usage >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT}/vendor/livesplit-core"
mkdir -p "${OUT}"

command -v podman >/dev/null || { echo "error: podman not found" >&2; exit 1; }

if [[ "${CLEAN}" == "1" ]]; then
  echo "==> Removing cache volumes"
  podman volume rm --force "${VOLUME_BUILD}" "${VOLUME_CARGO}" >/dev/null
fi

echo "==> Building image ${IMAGE_TAG}"
podman build \
  --file "${ROOT}/scripts/livesplit-core.Containerfile" \
  --tag "${IMAGE_TAG}" \
  --build-arg "RUST_IMAGE=${RUST_IMAGE}" \
  --build-arg "NODE_IMAGE=${NODE_IMAGE}" \
  --build-arg "WASM_BINDGEN_VERSION=${WASM_BINDGEN_VERSION}" \
  --build-arg "TYPESCRIPT_VERSION=${TYPESCRIPT_VERSION}" \
  "${ROOT}/scripts"

echo "==> Running build container"
# :Z = private SELinux label so the container may write to the bind mount.
podman run --rm \
  --volume "${VOLUME_BUILD}:/build" \
  --volume "${VOLUME_CARGO}:/usr/local/cargo/registry" \
  --volume "${OUT}:/out:Z" \
  --env "LSC_REPO=${LSC_REPO}" \
  --env "LSC_COMMIT=${LSC_COMMIT}" \
  --env "LSC_FEATURES=${LSC_FEATURES}" \
  --env "CARGO_PROFILE=${CARGO_PROFILE}" \
  --env "UPDATE_LOCK=${UPDATE_LOCK}" \
  "${IMAGE_TAG}"

echo "==> Output in ${OUT}"
