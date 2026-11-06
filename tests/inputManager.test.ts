import { describe, expect, it, vi } from 'vitest';
import { defaultBindings } from '../src/lib/input/bindings';
import { InputManager, type ActionTarget, type InputSource } from '../src/lib/input/inputManager';

function setup() {
  let now = 1000;
  const target: ActionTarget = {
    splitOrStart: vi.fn(),
    undo: vi.fn(),
    skip: vi.fn(),
    togglePause: vi.fn(),
    reset: vi.fn(),
  };
  const manager = new InputManager(target, { now: () => now });
  const advance = (ms: number) => (now += ms);
  return { target, manager, advance };
}

describe('input manager', () => {
  it('maps each action to the target', () => {
    const { target, manager, advance } = setup();
    for (const action of ['split', 'undo', 'skip', 'pause', 'reset'] as const) {
      manager.dispatch(action);
      advance(10);
    }
    expect(target.splitOrStart).toHaveBeenCalledOnce();
    expect(target.undo).toHaveBeenCalledOnce();
    expect(target.skip).toHaveBeenCalledOnce();
    expect(target.togglePause).toHaveBeenCalledOnce();
    expect(target.reset).toHaveBeenCalledOnce();
  });

  it('fires the same action from two sources within the window once', () => {
    const { target, manager, advance } = setup();
    expect(manager.dispatch('split', 'keyboard')).toBe(true);
    advance(30);
    expect(manager.dispatch('split', 'gamepad')).toBe(false);
    // Other actions are not affected.
    expect(manager.dispatch('pause', 'gamepad')).toBe(true);
    advance(25); // 55 ms after the first split
    expect(manager.dispatch('split', 'gamepad')).toBe(true);
    expect(target.splitOrStart).toHaveBeenCalledTimes(2);
    expect(target.togglePause).toHaveBeenCalledOnce();
  });

  it('resolves and dispatches nothing while disabled', () => {
    const { target, manager } = setup();
    manager.enabled = false;
    expect(manager.resolve({ kind: 'key', code: 'Space' })).toBeNull();
    expect(manager.dispatch('split')).toBe(false);
    expect(target.splitOrStart).not.toHaveBeenCalled();
    manager.enabled = true;
    expect(manager.resolve({ kind: 'key', code: 'Space' })).toBe('split');
  });

  it('uses the bindings it was given (copied)', () => {
    const { manager } = setup();
    const b = defaultBindings();
    b.skip = [{ kind: 'key', code: 'KeyK' }];
    manager.bindings = b;
    b.skip = [];
    expect(manager.resolve({ kind: 'key', code: 'KeyK' })).toBe('skip');
    expect(manager.resolve({ kind: 'key', code: 'Numpad2' })).toBeNull();
  });

  it('keeps going when the target throws', () => {
    const { target, manager } = setup();
    vi.mocked(target.reset).mockImplementation(() => {
      throw new Error('boom');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(manager.dispatch('reset')).toBe(true);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it('connects a source once and disconnects it', () => {
    const { manager } = setup();
    const disconnect = vi.fn();
    const source: InputSource = { connect: vi.fn(() => disconnect) };
    manager.addSource(source);
    manager.addSource(source);
    expect(source.connect).toHaveBeenCalledOnce();
    manager.removeSource(source);
    manager.removeSource(source);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('reports resolved input to onInput listeners (only bound input, only while enabled)', () => {
    const { manager } = setup();
    const bindings = defaultBindings();
    bindings.split.push({ kind: 'pad', buttonIndex: 0, label: 'A' });
    manager.bindings = bindings;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen = vi.fn();
    manager.onInput(() => {
      throw new Error('boom');
    });
    const off = manager.onInput(seen);
    const pad = { kind: 'pad', buttonIndex: 0, padId: 'Pad', padIndex: 1 } as const;
    expect(manager.resolve(pad)).toBe('split');
    expect(seen).toHaveBeenCalledWith(pad, 'split');
    manager.resolve({ kind: 'key', code: 'KeyQ' });
    manager.enabled = false;
    manager.resolve({ kind: 'key', code: 'Space' });
    expect(seen).toHaveBeenCalledOnce();
    manager.enabled = true;
    off();
    manager.resolve({ kind: 'key', code: 'Space' });
    expect(seen).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
