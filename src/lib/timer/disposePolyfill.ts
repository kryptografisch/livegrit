// `Symbol.dispose` polyfill for browsers without explicit resource management.
// livesplit-core's classes define `[Symbol.dispose]()` as a computed key that is evaluated
// when the module loads, so this must run before `livesplit-core` is imported
// (core.ts imports this module first; see vendor/livesplit-core/API-NOTES.md).

const symbolCtor = Symbol as unknown as { dispose?: symbol };
symbolCtor.dispose ??= Symbol.for('Symbol.dispose');

export {};
