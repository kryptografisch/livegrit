import { describe, expect, it, vi } from 'vitest';
import { InputManager, type ActionTarget } from '../src/lib/input/inputManager';
import {
  KeyboardSource,
  isEditableTarget,
  isTimerKeyCandidate,
} from '../src/lib/input/keyboardSource';

function setup() {
  let now = 0;
  const target: ActionTarget = {
    splitOrStart: vi.fn(),
    undo: vi.fn(),
    skip: vi.fn(),
    togglePause: vi.fn(),
    reset: vi.fn(),
  };
  const manager = new InputManager(target, { now: () => now });
  const win = new EventTarget();
  manager.addSource(new KeyboardSource(win));
  const advance = (ms: number) => (now += ms);
  /** Dispatches a fake key event on the fake window; returns it (for `defaultPrevented`). */
  const key = (type: 'keydown' | 'keyup', code: string, extra: Record<string, unknown> = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      code,
      repeat: false,
      isComposing: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      ...extra,
    });
    win.dispatchEvent(event);
    return event;
  };
  return { target, manager, key, advance };
}

const base = { code: 'Space', repeat: false, ctrlKey: false, altKey: false, metaKey: false };

describe('keyboard filtering', () => {
  it('treats text fields, selects and contenteditable as editable', () => {
    expect(isEditableTarget({ tagName: 'INPUT', type: 'text' } as never)).toBe(true);
    expect(isEditableTarget({ tagName: 'INPUT', type: 'number' } as never)).toBe(true);
    expect(isEditableTarget({ tagName: 'input' } as never)).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' } as never)).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' } as never)).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true } as never)).toBe(true);
  });

  it('does not treat buttons, checkboxes or the page as editable', () => {
    expect(isEditableTarget({ tagName: 'INPUT', type: 'checkbox' } as never)).toBe(false);
    expect(isEditableTarget({ tagName: 'BUTTON' } as never)).toBe(false);
    expect(isEditableTarget({ tagName: 'BODY', isContentEditable: false } as never)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  it('skips modifier combinations, IME composition and empty codes', () => {
    expect(isTimerKeyCandidate({ ...base, target: null })).toBe(true);
    expect(isTimerKeyCandidate({ ...base, target: null, ctrlKey: true })).toBe(false);
    expect(isTimerKeyCandidate({ ...base, target: null, altKey: true })).toBe(false);
    expect(isTimerKeyCandidate({ ...base, target: null, metaKey: true })).toBe(false);
    expect(isTimerKeyCandidate({ ...base, target: null, isComposing: true })).toBe(false);
    expect(isTimerKeyCandidate({ ...base, target: null, code: '' })).toBe(false);
    const field = { tagName: 'INPUT', type: 'text' } as never;
    expect(isTimerKeyCandidate({ ...base, target: field })).toBe(false);
  });
});

describe('keyboard source', () => {
  it('dispatches bound keys and prevents their default', () => {
    const { target, key } = setup();
    const down = key('keydown', 'Space');
    expect(target.splitOrStart).toHaveBeenCalledOnce();
    expect(down.defaultPrevented).toBe(true);
    // The matching keyup is cancelled too (no click on a focused button).
    expect(key('keyup', 'Space').defaultPrevented).toBe(true);
  });

  it('leaves unbound keys alone', () => {
    const { target, key } = setup();
    expect(key('keydown', 'KeyQ').defaultPrevented).toBe(false);
    expect(key('keyup', 'KeyQ').defaultPrevented).toBe(false);
    expect(target.splitOrStart).not.toHaveBeenCalled();
  });

  it('ignores repeats but still prevents their default', () => {
    const { target, key, advance } = setup();
    key('keydown', 'Numpad5');
    advance(500);
    const repeat = key('keydown', 'Numpad5', { repeat: true });
    expect(repeat.defaultPrevented).toBe(true);
    expect(target.togglePause).toHaveBeenCalledOnce();
  });

  it('ignores Ctrl combinations (browser shortcuts keep working)', () => {
    const { target, key } = setup();
    expect(key('keydown', 'KeyP', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(target.togglePause).not.toHaveBeenCalled();
  });

  it('does nothing while the manager is disabled (not on the Timer page)', () => {
    const { target, manager, key } = setup();
    manager.enabled = false;
    expect(key('keydown', 'Space').defaultPrevented).toBe(false);
    expect(target.splitOrStart).not.toHaveBeenCalled();
  });

  it('de-dupes two bound keys for the same action pressed together', () => {
    const { target, key, advance } = setup();
    key('keydown', 'Space');
    advance(10);
    key('keydown', 'Numpad1');
    expect(target.splitOrStart).toHaveBeenCalledOnce();
  });

  it('stops listening after disconnect', () => {
    const { target, manager } = setup();
    const win = new EventTarget();
    const source = new KeyboardSource(win);
    manager.addSource(source);
    manager.removeSource(source);
    win.dispatchEvent(Object.assign(new Event('keydown'), { ...base }));
    expect(target.splitOrStart).not.toHaveBeenCalled();
  });
});
