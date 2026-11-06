// Binding model, defaults and (versioned) serialization.
//
// Every Action has a list of bindings (several keys and/or pad buttons). Keys are stored by
// `KeyboardEvent.code` (layout-independent). Pad bindings store raw button indices only;
// their names depend on the pad they're shown for (`padLayout.ts`). Which pad they apply to
// is not part of the binding: every pad works (see `inputDevice.svelte.ts`).
//
// Pad bindings come in three kinds (on a controller shared with the game, a combo is often
// the only binding the game doesn't trigger by accident):
// - single:   press one button.
// - hold:     hold one button, then press a second one (e.g. hold Select, press A).
// - together: press two buttons at (nearly) the same time, in any order: the second press
//             within `CHORD_WINDOW_MS` of the first fires the action.

import { padButtonLabel, type PadFamily } from './padLayout';
import { ACTIONS, type Action } from './types';

export { padButtonLabel, type PadFamily } from './padLayout';

export interface KeyBinding {
  kind: 'key';
  /** `KeyboardEvent.code`, e.g. "Space", "Numpad1". */
  code: string;
}

export type PadBinding =
  | {
      kind: 'pad';
      combo: 'single';
      buttonIndex: number;
    }
  | {
      kind: 'pad';
      combo: 'hold';
      /** Held first… */
      hold: number;
      /** …then this one is pressed (≠ `hold`). */
      buttonIndex: number;
    }
  | {
      kind: 'pad';
      combo: 'together';
      /** Two different buttons, ascending. */
      buttons: [number, number];
    };

export type Binding = KeyBinding | PadBinding;

export type Bindings = Record<Action, Binding[]>;

/** Raw input from a source, matched against the bindings. */
export type RawInput =
  | { kind: 'key'; code: string }
  | {
      kind: 'pad';
      buttonIndex: number;
      padId: string;
      padIndex: number;
      /** The other buttons held on that pad at the moment of the press. */
      held?: readonly number[];
      /** The held buttons that went down within `CHORD_WINDOW_MS` before this press. */
      together?: readonly number[];
    };

/**
 * Two pad buttons going down within this many ms count as pressed together. Also the
 * line between "together" and "hold + press" when recording a combo.
 */
export const CHORD_WINDOW_MS = 100;

export const BINDINGS_VERSION = 1;

const key = (code: string): KeyBinding => ({ kind: 'key', code });

/** A single pad button. */
export function padButton(buttonIndex: number): PadBinding {
  return { kind: 'pad', combo: 'single', buttonIndex };
}

/** Hold `hold`, then press `buttonIndex` (the same button twice gives a single button). */
export function padHold(hold: number, buttonIndex: number): PadBinding {
  if (hold === buttonIndex) return padButton(buttonIndex);
  return { kind: 'pad', combo: 'hold', hold, buttonIndex };
}

/** Two buttons pressed together (order doesn't matter; the same button twice = single). */
export function padTogether(a: number, b: number): PadBinding {
  if (a === b) return padButton(a);
  return { kind: 'pad', combo: 'together', buttons: a < b ? [a, b] : [b, a] };
}

/** One button of a pad binding for display: what to do with it, and its name. */
export interface PadLabelPart {
  tag: 'press' | 'hold';
  button: string;
}

/**
 * A pad binding as tagged parts with the button names of `family`, shown as
 * "[hold] RB + [press] A": single → one press; hold → hold + press; together → two presses.
 */
export function padLabelParts(binding: PadBinding, family: PadFamily = 'xbox'): PadLabelPart[] {
  const part = (tag: PadLabelPart['tag'], i: number): PadLabelPart => ({
    tag,
    button: padButtonLabel(i, family),
  });
  switch (binding.combo) {
    case 'single':
      return [part('press', binding.buttonIndex)];
    case 'hold':
      return [part('hold', binding.hold), part('press', binding.buttonIndex)];
    case 'together':
      return [part('press', binding.buttons[0]), part('press', binding.buttons[1])];
  }
}

/** A pad binding as plain text, e.g. "A", "Hold RB + A", "LB + RB together". */
export function padBindingText(binding: PadBinding, family: PadFamily = 'xbox'): string {
  const name = (i: number) => padButtonLabel(i, family);
  switch (binding.combo) {
    case 'single':
      return name(binding.buttonIndex);
    case 'hold':
      return `Hold ${name(binding.hold)} + ${name(binding.buttonIndex)}`;
    case 'together':
      return `${name(binding.buttons[0])} + ${name(binding.buttons[1])} together`;
  }
}

/**
 * Keys that can't be bound: Escape cancels the capture, and Ctrl/Alt/Meta are left to the
 * browser (the keyboard source ignores every key pressed with them).
 */
const UNBINDABLE_KEYS = new Set([
  'Escape',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
]);

export function isBindableKey(code: string): boolean {
  return code !== '' && !UNBINDABLE_KEYS.has(code);
}

/**
 * Keys: LiveSplit's numpad layout, plus Space (split), Backspace (undo) and P (pause).
 * No gamepad defaults on purpose: the game also receives every pad press, and games use
 * most buttons, so any default could trigger the timer by accident (a wrong default is
 * worse than none). The user binds pad buttons on the Controls page.
 */
const DEFAULTS: Bindings = {
  split: [key('Space'), key('Numpad1')],
  undo: [key('Backspace'), key('Numpad8')],
  skip: [key('Numpad2')],
  pause: [key('KeyP'), key('Numpad5')],
  reset: [key('Numpad3')],
};

/** A fresh copy of the default bindings. */
export function defaultBindings(): Bindings {
  return cloneBindings(DEFAULTS);
}

export function cloneBindings(bindings: Bindings): Bindings {
  const out = {} as Bindings;
  for (const action of ACTIONS) out[action] = bindings[action].map(cloneBinding);
  return out;
}

function cloneBinding(binding: Binding): Binding {
  if (binding.kind === 'pad' && binding.combo === 'together') {
    return { ...binding, buttons: [binding.buttons[0], binding.buttons[1]] };
  }
  return { ...binding };
}

/**
 * Stable identity of a binding (button indices only), e.g. "key:Space", "pad:0",
 * "pad:8>0" (hold 8, press 0), "pad:0&8" (0 and 8 together).
 */
export function bindingId(binding: Binding): string {
  if (binding.kind === 'key') return `key:${binding.code}`;
  switch (binding.combo) {
    case 'single':
      return `pad:${binding.buttonIndex}`;
    case 'hold':
      return `pad:${binding.hold}>${binding.buttonIndex}`;
    case 'together':
      return `pad:${binding.buttons[0]}&${binding.buttons[1]}`;
  }
}

export function sameBinding(a: Binding, b: Binding): boolean {
  return bindingId(a) === bindingId(b);
}

/**
 * `binding` added to `action`. The same binding on another action is removed there (one
 * input, one action); those actions are returned in `movedFrom`. Already bound to `action`:
 * unchanged. Doesn't modify `bindings`.
 */
export function withBinding(
  bindings: Bindings,
  action: Action,
  binding: Binding,
): { bindings: Bindings; movedFrom: Action[] } {
  const out = cloneBindings(bindings);
  const id = bindingId(binding);
  const movedFrom: Action[] = [];
  for (const other of ACTIONS) {
    if (other === action) continue;
    const kept = out[other].filter((b) => bindingId(b) !== id);
    if (kept.length !== out[other].length) {
      out[other] = kept;
      movedFrom.push(other);
    }
  }
  if (!out[action].some((b) => bindingId(b) === id)) out[action].push(cloneBinding(binding));
  return { bindings: out, movedFrom };
}

/** `bindings` without the binding with id `id` on `action`. Doesn't modify `bindings`. */
export function withoutBinding(bindings: Bindings, action: Action, id: string): Bindings {
  const out = cloneBindings(bindings);
  out[action] = out[action].filter((b) => bindingId(b) !== id);
  return out;
}

/** Display names of the actions. */
export const ACTION_LABELS: Record<Action, string> = {
  split: 'Start / Split',
  undo: 'Undo split',
  skip: 'Skip split',
  pause: 'Pause / Resume',
  reset: 'Reset',
};

/** A readable name for a `KeyboardEvent.code` ("KeyP" → "P", "Numpad1" → "Numpad 1"). */
export function keyLabel(code: string): string {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1] ?? code;
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1] ?? code;
  const numpad = /^Numpad(.+)$/.exec(code);
  if (numpad) return `Numpad ${numpad[1]}`;
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** A readable name for any binding (pad buttons named for `family`). */
export function bindingLabel(binding: Binding, family: PadFamily = 'xbox'): string {
  return binding.kind === 'key' ? keyLabel(binding.code) : padBindingText(binding, family);
}

/** How specific a match is: together and hold need two buttons, single one. */
const SPECIFICITY = { single: 0, hold: 1, together: 2 } as const;

/** Whether pad binding `b` matches the press `input`. */
function padMatches(b: PadBinding, input: Extract<RawInput, { kind: 'pad' }>): boolean {
  const pressed = input.buttonIndex;
  switch (b.combo) {
    case 'single':
      return b.buttonIndex === pressed;
    case 'hold':
      return b.buttonIndex === pressed && (input.held ?? []).includes(b.hold);
    case 'together': {
      const [x, y] = b.buttons;
      const other = x === pressed ? y : y === pressed ? x : null;
      return other !== null && (input.together ?? []).includes(other);
    }
  }
}

/**
 * The action bound to `input`, or `null`. Pad bindings match on any pad; other held
 * buttons don't matter (players hold buttons all the time). The most specific match wins:
 * together > hold + press > single (so hold Select + A beats plain A). Together beats hold
 * because a quick double press also has the first button held. On a tie the first action
 * in `ACTIONS` order wins.
 */
export function actionFor(bindings: Bindings, input: RawInput): Action | null {
  if (input.kind === 'key') {
    return (
      ACTIONS.find((action) =>
        bindings[action].some((b) => b.kind === 'key' && b.code === input.code),
      ) ?? null
    );
  }
  let best: Action | null = null;
  let bestScore = -1;
  for (const action of ACTIONS) {
    for (const b of bindings[action]) {
      if (b.kind !== 'pad' || !padMatches(b, input)) continue;
      const score = SPECIFICITY[b.combo];
      if (score > bestScore) {
        best = action;
        bestScore = score;
      }
    }
  }
  return best;
}

interface StoredBindings {
  version: number;
  bindings: Bindings;
}

/** Bindings as a versioned plain object (for IndexedDB / JSON). */
export function serializeBindings(bindings: Bindings): StoredBindings {
  return { version: BINDINGS_VERSION, bindings: cloneBindings(bindings) };
}

/**
 * Reads stored bindings (a `serializeBindings` object or its JSON text). Never throws:
 * unreadable data or an unknown version gives the defaults; invalid entries are dropped,
 * duplicates removed; an action missing from the data gets its defaults (an empty list
 * stays empty, the user cleared it).
 */
export function parseBindings(data: unknown): Bindings {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return defaultBindings();
    }
  }
  if (!isRecord(data) || data.version !== BINDINGS_VERSION || !isRecord(data.bindings)) {
    return defaultBindings();
  }
  const stored = data.bindings;
  const out = defaultBindings();
  for (const action of ACTIONS) {
    const list = stored[action];
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    out[action] = [];
    for (const entry of list) {
      const binding = parseBinding(entry);
      if (!binding) continue;
      const id = bindingId(binding);
      if (seen.has(id)) continue;
      seen.add(id);
      out[action].push(binding);
    }
  }
  return out;
}

function parseBinding(entry: unknown): Binding | null {
  if (!isRecord(entry)) return null;
  if (entry.kind === 'key') {
    return typeof entry.code === 'string' && entry.code !== '' ? key(entry.code) : null;
  }
  if (entry.kind !== 'pad') return null;
  // A stored label (older data) is ignored: names depend on the pad they are shown for.
  const { combo, buttonIndex, hold, buttons } = entry;
  if (combo === 'single' || combo === undefined) {
    return isButtonIndex(buttonIndex) ? padButton(buttonIndex) : null;
  }
  if (combo === 'hold') {
    if (!isButtonIndex(buttonIndex) || !isButtonIndex(hold) || hold === buttonIndex) return null;
    return padHold(hold, buttonIndex);
  }
  if (combo === 'together') {
    if (!Array.isArray(buttons) || buttons.length !== 2) return null;
    const [a, b] = buttons as unknown[];
    if (!isButtonIndex(a) || !isButtonIndex(b) || a === b) return null;
    return padTogether(a, b);
  }
  return null;
}

function isButtonIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
