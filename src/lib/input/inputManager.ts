// Merges input sources, de-dupes and dispatches Actions to the timer.
//
// Sources either hand in raw input (`resolve` → matched against the bindings, then
// `dispatch`), or emit Actions directly (`dispatch`, e.g. the on-screen buttons or a future
// native hotkey source). Only this manager calls the timer.
//
// `enabled` is true only on the Timer page; on the Controls page nothing reaches the timer
// (step 8's capture mode reads the raw input itself).

import {
  actionFor,
  cloneBindings,
  defaultBindings,
  type Bindings,
  type RawInput,
} from './bindings';
import type { Action } from './types';

/** What the manager drives. `TimerStore` implements it. */
export interface ActionTarget {
  splitOrStart(): void;
  undo(): void;
  skip(): void;
  togglePause(): void;
  reset(): void;
}

/** A source of input, e.g. the keyboard. `connect` starts it and returns `disconnect`. */
export interface InputSource {
  connect(manager: InputManager): () => void;
}

/** The same Action within this many ms fires only once (e.g. key + pad pressed together). */
export const DEDUPE_WINDOW_MS = 50;

export interface InputManagerOptions {
  /** Defaults to `performance.now()`. */
  now?: () => number;
  dedupeWindowMs?: number;
}

export type InputListener = (input: RawInput, action: Action) => void;

export class InputManager {
  enabled = true;

  readonly #target: ActionTarget;
  readonly #now: () => number;
  readonly #window: number;
  #bindings: Bindings = defaultBindings();
  readonly #lastFired = new Map<Action, number>();
  readonly #disconnects = new Map<InputSource, () => void>();
  readonly #inputListeners = new Set<InputListener>();
  readonly #bindingsListeners = new Set<(bindings: Bindings) => void>();

  constructor(target: ActionTarget, options: InputManagerOptions = {}) {
    this.#target = target;
    this.#now = options.now ?? (() => performance.now());
    this.#window = options.dedupeWindowMs ?? DEDUPE_WINDOW_MS;
  }

  /** A copy of the current bindings. */
  get bindings(): Bindings {
    return cloneBindings(this.#bindings);
  }

  set bindings(bindings: Bindings) {
    this.#bindings = cloneBindings(bindings);
    for (const listener of this.#bindingsListeners) {
      try {
        listener(this.bindings);
      } catch (error) {
        console.error('[input] bindings listener failed', error);
      }
    }
  }

  /**
   * Listens to binding changes (e.g. to save them, or to show restored ones). Gets a copy.
   * Returns the unsubscribe function.
   */
  onBindingsChange(listener: (bindings: Bindings) => void): () => void {
    this.#bindingsListeners.add(listener);
    return () => this.#bindingsListeners.delete(listener);
  }

  /** Starts a source (once). */
  addSource(source: InputSource): void {
    if (this.#disconnects.has(source)) return;
    this.#disconnects.set(source, source.connect(this));
  }

  removeSource(source: InputSource): void {
    this.#disconnects.get(source)?.();
    this.#disconnects.delete(source);
  }

  /**
   * Listens to raw input that resolved to an Action (e.g. to show the last used device).
   * Returns the unsubscribe function.
   */
  onInput(listener: InputListener): () => void {
    this.#inputListeners.add(listener);
    return () => this.#inputListeners.delete(listener);
  }

  /**
   * The Action bound to `input` while enabled, else `null`. Any keyboard and any pad work:
   * bindings don't depend on the device. Doesn't fire the action.
   */
  resolve(input: RawInput): Action | null {
    if (!this.enabled) return null;
    const action = actionFor(this.#bindings, input);
    if (action) {
      for (const listener of this.#inputListeners) {
        try {
          listener(input, action);
        } catch (error) {
          console.error('[input] input listener failed', error);
        }
      }
    }
    return action;
  }

  /**
   * Fires `action` on the target. Returns false if disabled or if the same action already
   * fired within the de-dupe window (from any source).
   */
  dispatch(action: Action, source = 'unknown'): boolean {
    if (!this.enabled) return false;
    const now = this.#now();
    const last = this.#lastFired.get(action);
    if (last !== undefined && now - last < this.#window) return false;
    this.#lastFired.set(action, now);
    try {
      this.#run(action);
    } catch (error) {
      console.error(`[input] ${action} from ${source} failed`, error);
    }
    return true;
  }

  #run(action: Action): void {
    const t = this.#target;
    switch (action) {
      case 'split':
        return t.splitOrStart();
      case 'undo':
        return t.undo();
      case 'skip':
        return t.skip();
      case 'pause':
        return t.togglePause();
      case 'reset':
        return t.reset();
    }
  }
}
