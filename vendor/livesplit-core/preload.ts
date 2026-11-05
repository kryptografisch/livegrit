import init, { type InitOutput } from "./livesplit_core.js";

let promise: Promise<InitOutput> | null = null;
export async function preloadWasm(): Promise<InitOutput> {
    if (!promise) {
        const precompiled = (globalThis as any).__lscPreload;
        if (precompiled) {
            delete (globalThis as any).__lscPreload;
            promise = init({ module_or_path: precompiled });
        } else {
            promise = init();
        }
    }
    return await promise;
}
