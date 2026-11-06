// Gamepad input source with edge detection.
//
// The Gamepad API has no button events, so the pads are polled once per frame from the
// shared ticker (it runs whenever the page is visible, not only while the timer runs).
// `gamepadconnected` / `gamepaddisconnected` trigger an extra poll so connects show up at
// once.
//
// The logic lives in `GamepadTracker`, which is pure: snapshots + time in, events out. It
// detects rising edges (pressed now, not pressed in the last snapshot) per pad and button,
// with a per-button debounce against bouncing switches and flaky connections.
//
// A pad that appears with a button already held reports that button as pressed: browsers
// hide pads until a button is pressed, so the first press is the one that reveals the pad
// (and it may be the run's start). The debounce times survive a disconnect, so a pad that
// drops out and comes back within the debounce window doesn't fire a phantom press.

import { rafTicker, type Ticker } from '../ticker';
import { CHORD_WINDOW_MS } from './bindings';
import type { InputManager, InputSource } from './inputManager';

/** One pad as read from `navigator.getGamepads()`. */
export interface PadSnapshot {
  /** `Gamepad.index`: the slot, stable while the pad stays connected. */
  index: number;
  /** `Gamepad.id`: a vendor/product string; differs between browsers and OSes. */
  id: string;
  /** `pressed` per button index. */
  buttons: readonly boolean[];
}

export type PadEvent =
  | { type: 'connected'; index: number; id: string }
  | { type: 'disconnected'; index: number; id: string }
  | {
      type: 'press';
      index: number;
      id: string;
      buttonIndex: number;
      /** The other buttons pressed in the same snapshot, ascending (for hold combos). */
      held: number[];
      /** The `held` buttons that went down within the chord window (for "together"). */
      together: number[];
    };

/** A second press of the same button within this many ms is ignored. */
export const PAD_DEBOUNCE_MS = 50;

interface PadState {
  id: string;
  buttons: boolean[];
  /** When each button last went down (ms). */
  downAt: number[];
}

/** Pure edge detection over successive gamepad snapshots. */
export class GamepadTracker {
  readonly #debounceMs: number;
  readonly #chordWindowMs: number;
  /** By `Gamepad.index`. */
  readonly #pads = new Map<number, PadState>();
  /** Last accepted press per pad + button (kept across disconnects). */
  readonly #lastPress = new Map<string, number>();

  constructor(debounceMs = PAD_DEBOUNCE_MS, chordWindowMs = CHORD_WINDOW_MS) {
    this.#debounceMs = debounceMs;
    this.#chordWindowMs = chordWindowMs;
  }

  /** The pads of the last snapshot, by index. */
  get pads(): PadSnapshot[] {
    return [...this.#pads]
      .sort(([a], [b]) => a - b)
      .map(([index, pad]) => ({ index, id: pad.id, buttons: [...pad.buttons] }));
  }

  /**
   * Feeds the current snapshot (all connected pads) taken at `now` (ms) and returns what
   * changed since the last one: disconnects first, then connects, then presses.
   */
  update(snapshots: readonly PadSnapshot[], now: number): PadEvent[] {
    const events: PadEvent[] = [];
    const current = new Map<number, PadSnapshot>();
    for (const snap of snapshots) current.set(snap.index, snap);

    // A pad that's gone, or whose slot now holds another pad, is disconnected.
    for (const [index, pad] of this.#pads) {
      if (current.get(index)?.id !== pad.id) {
        this.#pads.delete(index);
        events.push({ type: 'disconnected', index, id: pad.id });
      }
    }

    for (const snap of current.values()) {
      let pad = this.#pads.get(snap.index);
      if (!pad) {
        pad = { id: snap.id, buttons: [], downAt: [] };
        this.#pads.set(snap.index, pad);
        events.push({ type: 'connected', index: snap.index, id: snap.id });
      }
      const down = pressedButtons(snap.buttons);
      const rising = down.filter((i) => !(pad.buttons[i] ?? false));
      // First all edge times of this frame, so buttons pressed in the same frame see each
      // other as "together".
      for (const i of rising) pad.downAt[i] = now;
      for (const buttonIndex of rising) {
        if (!this.#acceptPress(snap, buttonIndex, now)) continue;
        const held = down.filter((i) => i !== buttonIndex);
        const together = held.filter(
          (i) => now - (pad.downAt[i] ?? -Infinity) <= this.#chordWindowMs,
        );
        events.push({
          type: 'press',
          index: snap.index,
          id: snap.id,
          buttonIndex,
          held,
          together,
        });
      }
      pad.buttons = [...snap.buttons];
    }

    this.#pruneLastPress(now);
    return events;
  }

  /** Forgets all pads (e.g. when the source is disconnected). */
  reset(): void {
    this.#pads.clear();
    this.#lastPress.clear();
  }

  #acceptPress(snap: PadSnapshot, buttonIndex: number, now: number): boolean {
    const key = `${snap.index}\u0000${snap.id}\u0000${buttonIndex}`;
    const last = this.#lastPress.get(key);
    if (last !== undefined && now - last < this.#debounceMs) return false;
    this.#lastPress.set(key, now);
    return true;
  }

  /** Entries older than the debounce window can't suppress anything any more. */
  #pruneLastPress(now: number): void {
    for (const [key, time] of this.#lastPress) {
      if (now - time >= this.#debounceMs) this.#lastPress.delete(key);
    }
  }
}

/** The indices of the pressed buttons, ascending. */
export function pressedButtons(buttons: readonly boolean[]): number[] {
  const out: number[] = [];
  buttons.forEach((pressed, i) => {
    if (pressed) out.push(i);
  });
  return out;
}

/** Reads the connected pads; never throws (no API, or blocked by a permissions policy). */
export function readGamepads(nav: Pick<Navigator, 'getGamepads'> | undefined): PadSnapshot[] {
  let list: readonly (Gamepad | null)[];
  try {
    list = nav?.getGamepads?.() ?? [];
  } catch {
    return [];
  }
  const out: PadSnapshot[] = [];
  for (const pad of list) {
    if (!pad?.connected) continue;
    out.push({ index: pad.index, id: pad.id, buttons: pad.buttons.map((b) => b.pressed) });
  }
  return out;
}

export type PadListener = (event: PadEvent) => void;

export interface GamepadSourceOptions {
  /** Defaults to the shared rAF ticker. */
  ticker?: Ticker;
  /** Defaults to reading `navigator.getGamepads()`. */
  getGamepads?: () => PadSnapshot[];
  /** Receives `gamepadconnected` / `gamepaddisconnected`; defaults to `window`. */
  eventTarget?: EventTarget;
  /** Defaults to `performance.now()`. */
  now?: () => number;
  debounceMs?: number;
}

export class GamepadSource implements InputSource {
  readonly #options: GamepadSourceOptions;
  readonly #tracker: GamepadTracker;
  readonly #listeners = new Set<PadListener>();
  #manager: InputManager | null = null;

  constructor(options: GamepadSourceOptions = {}) {
    this.#options = options;
    this.#tracker = new GamepadTracker(options.debounceMs);
  }

  /** The pads seen in the last poll, with their button states. */
  get pads(): PadSnapshot[] {
    return this.#tracker.pads;
  }

  /**
   * Listens to all pad events, also while the manager is disabled (the Settings page's
   * capture mode and live button view use this). Returns the unsubscribe function.
   */
  subscribe(listener: PadListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  connect(manager: InputManager): () => void {
    this.#manager = manager;
    const ticker = this.#options.ticker ?? rafTicker();
    const target = this.#options.eventTarget ?? window;
    const poll = () => this.poll();
    const unsubscribe = ticker.subscribe(poll);
    target.addEventListener('gamepadconnected', poll);
    target.addEventListener('gamepaddisconnected', poll);
    poll();
    return () => {
      unsubscribe();
      target.removeEventListener('gamepadconnected', poll);
      target.removeEventListener('gamepaddisconnected', poll);
      this.#manager = null;
      // Listeners (e.g. the device list) must not keep pads that are no longer tracked.
      for (const { index, id } of this.#tracker.pads) {
        this.#emit({ type: 'disconnected', index, id });
      }
      this.#tracker.reset();
    };
  }

  /** Reads the pads once and handles the changes. Called every frame while connected. */
  poll(): void {
    const read = this.#options.getGamepads ?? (() => readGamepads(globalThis.navigator));
    const now = (this.#options.now ?? (() => performance.now()))();
    for (const event of this.#tracker.update(read(), now)) {
      // Listeners first: the device store may switch the active pad on `connected`, so the
      // press that revealed the pad already counts.
      this.#emit(event);
      if (event.type !== 'press' || !this.#manager) continue;
      const action = this.#manager.resolve({
        kind: 'pad',
        buttonIndex: event.buttonIndex,
        padId: event.id,
        padIndex: event.index,
        held: event.held,
        together: event.together,
      });
      if (action) this.#manager.dispatch(action, 'gamepad');
    }
  }

  #emit(event: PadEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[gamepad] listener failed', error);
      }
    }
  }
}
