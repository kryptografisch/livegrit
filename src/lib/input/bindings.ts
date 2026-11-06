// Binding model, defaults and (versioned) serialization.
//
// Every Action has a list of bindings (several keys and/or pad buttons). Keys are stored by
// `KeyboardEvent.code` (layout-independent). Pad buttons store the raw button index, plus
// optionally the pad id they were captured on and a human-readable label.

import { ACTIONS, type Action } from './types';

export interface KeyBinding {
  kind: 'key';
  /** `KeyboardEvent.code`, e.g. "Space", "Numpad1". */
  code: string;
}

export interface PadBinding {
  kind: 'pad';
  buttonIndex: number;
  /** `Gamepad.id` it was captured on; without it any pad matches. */
  padId?: string;
  /** Shown in the UI, e.g. "Button 0". */
  label: string;
}

export type Binding = KeyBinding | PadBinding;

export type Bindings = Record<Action, Binding[]>;

/** Raw input from a source, matched against the bindings. */
export type RawInput =
  { kind: 'key'; code: string } | { kind: 'pad'; buttonIndex: number; padId: string };

export const BINDINGS_VERSION = 1;

const key = (code: string): KeyBinding => ({ kind: 'key', code });

/** LiveSplit's numpad layout, plus Space (split), Backspace (undo) and P (pause). */
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
  for (const action of ACTIONS) out[action] = bindings[action].map((b) => ({ ...b }));
  return out;
}

/** Stable identity of a binding (ignores the label). */
export function bindingId(binding: Binding): string {
  return binding.kind === 'key'
    ? `key:${binding.code}`
    : `pad:${binding.buttonIndex}:${binding.padId ?? ''}`;
}

export function sameBinding(a: Binding, b: Binding): boolean {
  return bindingId(a) === bindingId(b);
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

/** A readable name for any binding. */
export function bindingLabel(binding: Binding): string {
  return binding.kind === 'key' ? keyLabel(binding.code) : binding.label;
}

/**
 * The action bound to `input`, or `null`. If two actions share a binding, the first in
 * `ACTIONS` order wins. Pad buttons: a binding for exactly this pad (or for any pad) wins;
 * if none, a binding with the same button index on another pad id matches too, so a pad
 * whose id string changed (other browser/OS/driver) keeps working.
 */
export function actionFor(bindings: Bindings, input: RawInput): Action | null {
  if (input.kind === 'key') {
    for (const action of ACTIONS) {
      if (bindings[action].some((b) => b.kind === 'key' && b.code === input.code)) return action;
    }
    return null;
  }
  let fallback: Action | null = null;
  for (const action of ACTIONS) {
    for (const b of bindings[action]) {
      if (b.kind !== 'pad' || b.buttonIndex !== input.buttonIndex) continue;
      if (b.padId === undefined || b.padId === input.padId) return action;
      fallback ??= action;
    }
  }
  return fallback;
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
  if (entry.kind === 'pad') {
    const { buttonIndex, padId, label } = entry;
    if (typeof buttonIndex !== 'number' || !Number.isInteger(buttonIndex) || buttonIndex < 0) {
      return null;
    }
    const binding: PadBinding = {
      kind: 'pad',
      buttonIndex,
      label: typeof label === 'string' && label !== '' ? label : `Button ${buttonIndex}`,
    };
    if (typeof padId === 'string' && padId !== '') binding.padId = padId;
    return binding;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
