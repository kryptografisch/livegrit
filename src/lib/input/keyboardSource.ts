// Keyboard input source: `keydown` on window, matched by `event.code` (layout-independent).
//
// Ignored: key repeat, typing in editable fields, IME composition, and Ctrl/Alt/Meta
// combinations (so browser shortcuts like Ctrl+R keep working). `preventDefault` only for
// bound keys while the manager is enabled (Timer page), e.g. so Space doesn't scroll.

import type { InputManager, InputSource } from './inputManager';

/** The parts of a `KeyboardEvent` we read (lets tests pass plain objects). */
export interface KeyEventLike {
  code: string;
  repeat: boolean;
  isComposing?: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
}

/** Input types that don't take typing (keys on them may be timer keys). */
const NON_TEXT_INPUTS = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'image']);

/** Text fields, selects and contenteditable elements: keys there belong to the field. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: unknown; isContentEditable?: unknown; type?: unknown };
  if (el.isContentEditable === true) return true;
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = typeof el.type === 'string' ? el.type.toLowerCase() : 'text';
    return !NON_TEXT_INPUTS.has(type);
  }
  return false;
}

/** Whether the keyboard source looks at this event at all (before the binding lookup). */
export function isTimerKeyCandidate(event: KeyEventLike): boolean {
  if (event.code === '' || event.isComposing) return false;
  if (event.ctrlKey || event.altKey || event.metaKey) return false;
  return !isEditableTarget(event.target);
}

/** Handles one keydown; exported for tests. */
export function handleKeyDown(
  manager: InputManager,
  event: KeyEventLike & { preventDefault(): void },
): void {
  if (!isTimerKeyCandidate(event)) return;
  const action = manager.resolve({ kind: 'key', code: event.code });
  if (!action) return;
  // Also for repeats: holding Space must not scroll the page.
  event.preventDefault();
  if (event.repeat) return;
  manager.dispatch(action, 'keyboard');
}

export class KeyboardSource implements InputSource {
  readonly #target: EventTarget;

  /** `target` defaults to `window`. */
  constructor(target?: EventTarget) {
    this.#target = target ?? window;
  }

  connect(manager: InputManager): () => void {
    // Codes whose keydown we handled: their keyup is cancelled too, so Space on a focused
    // button doesn't also click it (browsers activate buttons on Space keyup).
    const handled = new Set<string>();
    const down = (event: Event) => {
      const e = event as KeyboardEvent;
      handleKeyDown(manager, e);
      if (e.defaultPrevented) handled.add(e.code);
    };
    const up = (event: Event) => {
      const e = event as KeyboardEvent;
      if (handled.delete(e.code)) e.preventDefault();
    };
    this.#target.addEventListener('keydown', down);
    this.#target.addEventListener('keyup', up);
    return () => {
      this.#target.removeEventListener('keydown', down);
      this.#target.removeEventListener('keyup', up);
    };
  }
}
