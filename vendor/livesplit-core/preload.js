import init from "./livesplit_core.js";
let promise = null;
export async function preloadWasm() {
    if (!promise) {
        const precompiled = globalThis.__lscPreload;
        if (precompiled) {
            delete globalThis.__lscPreload;
            promise = init({ module_or_path: precompiled });
        }
        else {
            promise = init();
        }
    }
    return await promise;
}
