# Build image for livesplit-core -> WASM (+ JS/TS bindings).
# Built and run by scripts/build-livesplit-core.sh; all versions are passed in
# as build args from that script, which is the single place they are pinned.

ARG RUST_IMAGE
ARG NODE_IMAGE

# Node is only needed to run `tsc` on the generated TypeScript bindings.
FROM ${NODE_IMAGE} AS node

FROM ${RUST_IMAGE}

ARG WASM_BINDGEN_VERSION
ARG TYPESCRIPT_VERSION

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && npm install --global --no-fund --no-audit "typescript@${TYPESCRIPT_VERSION}" \
    && npm cache clean --force \
    && node --version && tsc --version

RUN rustup target add wasm32-unknown-unknown

# The CLI version must match the `wasm-bindgen` crate version in Cargo.lock
# exactly; the inner build script verifies that.
RUN cargo install wasm-bindgen-cli --version "${WASM_BINDGEN_VERSION}" --locked \
    && rm -rf /usr/local/cargo/registry /usr/local/cargo/git \
    && wasm-bindgen --version

COPY livesplit-core-build-inner.sh /usr/local/bin/livesplit-core-build-inner.sh
RUN chmod +x /usr/local/bin/livesplit-core-build-inner.sh

WORKDIR /build
CMD ["/usr/local/bin/livesplit-core-build-inner.sh"]
