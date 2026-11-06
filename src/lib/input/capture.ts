// Capture mode of the Controls page: turns the next key or pad button (combo) into a
// binding. Pure (events / snapshots in, results out), the page wires it to the browser.

import {
  CHORD_WINDOW_MS,
  isBindableKey,
  padButton,
  padHold,
  padTogether,
  type KeyBinding,
  type PadBinding,
} from './bindings';
import { pressedButtons, type PadSnapshot } from './gamepadSource';
import type { KeyEventLike } from './keyboardSource';

export type KeyCaptureResult =
  /** Not a key press to look at (repeat, IME): keep waiting. */
  | { type: 'ignore' }
  /** Escape: stop capturing. */
  | { type: 'cancel' }
  /** A key that can't be bound: keep waiting, show the message. */
  | { type: 'invalid'; message: string }
  | { type: 'binding'; binding: KeyBinding };

/** What a keydown means while capturing a key (or a pad button: only Escape counts there). */
export function captureKey(event: Omit<KeyEventLike, 'target'>): KeyCaptureResult {
  if (event.repeat || event.isComposing || event.code === '') return { type: 'ignore' };
  if (event.code === 'Escape') return { type: 'cancel' };
  if (!isBindableKey(event.code)) {
    return { type: 'invalid', message: 'Ctrl, Alt and Meta are left to the browser.' };
  }
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return {
      type: 'invalid',
      message: 'Combinations with Ctrl, Alt or Meta are left to the browser.',
    };
  }
  return { type: 'binding', binding: { kind: 'key', code: event.code } };
}

interface RecorderPad {
  id: string;
  buttons: readonly boolean[];
  /**
   * The first (or hold) button of the current gesture and when it went down (ms).
   * `used`: it was already part of a combo, so releasing it records nothing.
   */
  first: { button: number; at: number; used: boolean } | null;
}

/**
 * Records pad bindings from successive snapshots. A binding is returned as soon as it's
 * clear:
 * - a second button within `CHORD_WINDOW_MS` of the first → together (at that press);
 * - a second button later, while the first is still held → hold first + press second;
 * - the first button released without a second one → single (at the release: until then
 *   it could still become a hold combo).
 *
 * Detection goes on after a result (the Controls page test shows every one; capture mode
 * stops at the first): while a combo's button stays held, it is the hold button for the
 * next press (hold RB, press A, press B → "Hold RB + A", then "Hold RB + B"), and its
 * release records nothing. Only two buttons count per binding; others are ignored.
 * Buttons already down when a pad is first seen are a baseline: they don't start a
 * gesture (pressing them again later does).
 */
export class PadComboRecorder {
  readonly #chordWindowMs: number;
  readonly #pads = new Map<number, RecorderPad>();

  constructor(chordWindowMs = CHORD_WINDOW_MS) {
    this.#chordWindowMs = chordWindowMs;
  }

  /** The button held so far with no binding clear yet (shown as "[hold] A"); else `null`. */
  get holding(): number | null {
    for (const pad of this.#pads.values()) {
      if (pad.first && !pad.first.used) return pad.first.button;
    }
    return null;
  }

  /** Feeds the current pads taken at `now` (ms); returns a binding once one is clear. */
  update(snapshots: readonly PadSnapshot[], now: number): PadBinding | null {
    const seen = new Set<number>();
    let result: PadBinding | null = null;
    for (const snap of snapshots) {
      seen.add(snap.index);
      const pad = this.#pads.get(snap.index);
      if (!pad || pad.id !== snap.id) {
        // New pad (or another pad in that slot): its current state is the baseline.
        this.#pads.set(snap.index, { id: snap.id, buttons: [...snap.buttons], first: null });
        continue;
      }
      const rising = pressedButtons(snap.buttons).filter((i) => !(pad.buttons[i] ?? false));
      pad.buttons = [...snap.buttons];
      // Every pad steps (keeps its state current); the first result wins.
      const binding = this.#step(pad, rising, now);
      result ??= binding;
    }
    for (const index of [...this.#pads.keys()]) {
      if (!seen.has(index)) this.#pads.delete(index);
    }
    return result;
  }

  /** Forgets everything (the next snapshot is the new baseline). */
  reset(): void {
    this.#pads.clear();
  }

  #step(pad: RecorderPad, rising: number[], now: number): PadBinding | null {
    const held = (i: number) => pad.buttons[i] ?? false;
    if (!pad.first) {
      const [a, b] = rising;
      if (a === undefined) return null;
      if (b !== undefined) {
        // Two buttons in the same frame: together.
        pad.first = { button: a, at: -Infinity, used: true };
        return padTogether(a, b);
      }
      pad.first = { button: a, at: now, used: false };
      return null;
    }
    const first = pad.first;
    const second = rising.find((i) => i !== first.button);
    if (second !== undefined) {
      let binding: PadBinding | null = null;
      if (now - first.at <= this.#chordWindowMs) binding = padTogether(first.button, second);
      else if (held(first.button)) binding = padHold(first.button, second);
      if (binding) {
        // Whichever button stays held is the hold button for the next press.
        const keep = held(first.button) ? first.button : held(second) ? second : null;
        pad.first = keep === null ? null : { button: keep, at: -Infinity, used: true };
        return binding;
      }
    }
    if (held(first.button)) return null;
    if (first.used) {
      // A combo button released: another button still held takes over as the hold button
      // (e.g. after "LB + RB together", keep holding RB). No single press.
      const next = pressedButtons(pad.buttons)[0];
      pad.first = next === undefined ? null : { button: next, at: -Infinity, used: true };
      return null;
    }
    // Released without a combo: a single press.
    pad.first = null;
    return padButton(first.button);
  }
}
