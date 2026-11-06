import { describe, expect, it, vi } from 'vitest';
import { defaultBindings } from '../src/lib/input/bindings';
import {
  GamepadSource,
  GamepadTracker,
  readGamepads,
  type PadEvent,
  type PadSnapshot,
} from '../src/lib/input/gamepadSource';
import { InputManager, type ActionTarget } from '../src/lib/input/inputManager';
import { ManualTicker } from '../src/lib/ticker';

const ID = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)';

/** A pad snapshot with the given buttons held (out of `count`). */
function pad(held: number[] = [], index = 0, id = ID, count = 4): PadSnapshot {
  return { index, id, buttons: Array.from({ length: count }, (_, i) => held.includes(i)) };
}

const presses = (events: PadEvent[]) =>
  events.filter((e) => e.type === 'press').map((e) => [e.index, e.buttonIndex]);

describe('GamepadTracker', () => {
  it('reports connects and only rising edges', () => {
    const t = new GamepadTracker(50);
    expect(t.update([pad()], 0)).toEqual([{ type: 'connected', index: 0, id: ID }]);
    expect(t.update([pad([1])], 100)).toEqual([
      { type: 'press', index: 0, id: ID, buttonIndex: 1 },
    ]);
    // Held: no new press.
    expect(t.update([pad([1])], 200)).toEqual([]);
    expect(t.update([pad([1])], 300)).toEqual([]);
    // Released, then pressed again.
    expect(t.update([pad()], 400)).toEqual([]);
    expect(presses(t.update([pad([1])], 500))).toEqual([[0, 1]]);
  });

  it('tracks buttons and pads independently', () => {
    const t = new GamepadTracker(50);
    t.update([pad([], 0), pad([], 1, 'Other pad')], 0);
    expect(presses(t.update([pad([0, 2], 0), pad([0], 1, 'Other pad')], 100))).toEqual([
      [0, 0],
      [0, 2],
      [1, 0],
    ]);
    // Button 2 released, button 3 pressed; 0 held on both pads.
    expect(presses(t.update([pad([0, 3], 0), pad([0], 1, 'Other pad')], 200))).toEqual([[0, 3]]);
  });

  it('counts a button held when the pad appears (that press reveals the pad)', () => {
    const t = new GamepadTracker(50);
    expect(t.update([], 0)).toEqual([]);
    expect(t.update([pad([0])], 16)).toEqual([
      { type: 'connected', index: 0, id: ID },
      { type: 'press', index: 0, id: ID, buttonIndex: 0 },
    ]);
  });

  it('debounces a bouncing button', () => {
    const t = new GamepadTracker(50);
    t.update([pad()], 0);
    expect(presses(t.update([pad([0])], 100))).toEqual([[0, 0]]);
    expect(presses(t.update([pad()], 116))).toEqual([]);
    expect(presses(t.update([pad([0])], 132))).toEqual([]); // 32 ms after the press
    expect(presses(t.update([pad()], 148))).toEqual([]);
    expect(presses(t.update([pad([0])], 150))).toEqual([[0, 0]]); // 50 ms: accepted
  });

  it('debounces per button, not per pad', () => {
    const t = new GamepadTracker(50);
    t.update([pad()], 0);
    expect(presses(t.update([pad([0])], 100))).toEqual([[0, 0]]);
    expect(presses(t.update([pad([0, 1])], 110))).toEqual([[0, 1]]);
  });

  it('handles a disconnect mid-press without phantom or stuck presses', () => {
    const t = new GamepadTracker(50);
    t.update([pad()], 0);
    expect(presses(t.update([pad([0])], 100))).toEqual([[0, 0]]);
    expect(t.update([], 200)).toEqual([{ type: 'disconnected', index: 0, id: ID }]);
    expect(t.pads).toEqual([]);
    // Back, button released: no press. Then a normal press works.
    expect(t.update([pad()], 300)).toEqual([{ type: 'connected', index: 0, id: ID }]);
    expect(presses(t.update([pad([0])], 400))).toEqual([[0, 0]]);
  });

  it('ignores a held button when the pad drops out and returns within the debounce', () => {
    const t = new GamepadTracker(50);
    t.update([pad()], 0);
    expect(presses(t.update([pad([0])], 100))).toEqual([[0, 0]]);
    t.update([], 116);
    expect(presses(t.update([pad([0])], 132))).toEqual([]);
    // Still held: nothing. Released and pressed later: fires.
    expect(presses(t.update([pad([0])], 300))).toEqual([]);
    t.update([pad()], 316);
    expect(presses(t.update([pad([0])], 332))).toEqual([[0, 0]]);
  });

  it('treats another pad in the same slot as disconnect + connect', () => {
    const t = new GamepadTracker(50);
    t.update([pad([0])], 0);
    expect(t.update([pad([0], 0, 'New pad')], 100)).toEqual([
      { type: 'disconnected', index: 0, id: ID },
      { type: 'connected', index: 0, id: 'New pad' },
      { type: 'press', index: 0, id: 'New pad', buttonIndex: 0 },
    ]);
  });

  it('exposes the current pads and reset forgets them', () => {
    const t = new GamepadTracker(50);
    t.update([pad([1], 1, 'B'), pad([], 0, 'A')], 0);
    expect(t.pads).toEqual([pad([], 0, 'A'), pad([1], 1, 'B')]);
    t.reset();
    expect(t.pads).toEqual([]);
    expect(t.update([pad([1], 1, 'B')], 10).map((e) => e.type)).toEqual(['connected', 'press']);
  });
});

describe('readGamepads', () => {
  const fake = (index: number, pressed: boolean[], connected = true) =>
    ({
      index,
      id: `pad ${index}`,
      connected,
      buttons: pressed.map((p) => ({ pressed: p, touched: p, value: p ? 1 : 0 })),
    }) as unknown as Gamepad;

  it('skips empty slots and disconnected pads', () => {
    const nav = { getGamepads: () => [null, fake(1, [true, false]), fake(2, [true], false)] };
    expect(readGamepads(nav)).toEqual([{ index: 1, id: 'pad 1', buttons: [true, false] }]);
  });

  it('never throws', () => {
    expect(readGamepads(undefined)).toEqual([]);
    expect(readGamepads({} as Navigator)).toEqual([]);
    const blocked = {
      getGamepads: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(readGamepads(blocked)).toEqual([]);
  });
});

describe('GamepadSource', () => {
  function setup() {
    let now = 0;
    let pads: PadSnapshot[] = [];
    const target: ActionTarget = {
      splitOrStart: vi.fn(),
      undo: vi.fn(),
      skip: vi.fn(),
      togglePause: vi.fn(),
      reset: vi.fn(),
    };
    const manager = new InputManager(target, { now: () => now });
    // No pad defaults: button 0 splits, button 1 undoes.
    const bindings = defaultBindings();
    bindings.split.push({ kind: 'pad', buttonIndex: 0, label: 'A' });
    bindings.undo.push({ kind: 'pad', buttonIndex: 1, label: 'B' });
    manager.bindings = bindings;
    const ticker = new ManualTicker();
    const win = new EventTarget();
    const source = new GamepadSource({
      ticker,
      eventTarget: win,
      getGamepads: () => pads,
      now: () => now,
      debounceMs: 50,
    });
    manager.addSource(source);
    /** Sets the pads and runs one frame. */
    const frame = (next: PadSnapshot[], ms = 100) => {
      pads = next;
      now += ms;
      ticker.tick(ms);
    };
    return {
      target,
      manager,
      source,
      ticker,
      win,
      frame,
      setPads: (p: PadSnapshot[]) => (pads = p),
    };
  }

  it('polls every frame and dispatches bound presses', () => {
    const { target, frame } = setup();
    frame([pad()]);
    frame([pad([0])]);
    frame([pad([0])]);
    expect(target.splitOrStart).toHaveBeenCalledTimes(1);
    frame([pad()]);
    frame([pad([1])]);
    expect(target.undo).toHaveBeenCalledTimes(1);
    frame([pad([1, 3])]); // button 3 is unbound
    expect(target.skip).not.toHaveBeenCalled();
  });

  it('works with any pad (bindings are independent of the device)', () => {
    const { target, frame } = setup();
    frame([pad([], 0, 'Other pad'), pad([], 1)]);
    frame([pad([0], 0, 'Other pad'), pad([], 1)]);
    expect(target.splitOrStart).toHaveBeenCalledTimes(1);
    frame([pad([], 0, 'Other pad'), pad([1], 1)]);
    expect(target.undo).toHaveBeenCalledTimes(1);
  });

  it('keeps tracking but fires nothing while the manager is disabled', () => {
    const { target, manager, source, frame } = setup();
    const events: PadEvent[] = [];
    source.subscribe((e) => events.push(e));
    manager.enabled = false;
    frame([pad()]);
    frame([pad([0])]);
    expect(target.splitOrStart).not.toHaveBeenCalled();
    expect(events.map((e) => e.type)).toEqual(['connected', 'press']);
    // Still held when re-enabled: no press (no edge).
    manager.enabled = true;
    frame([pad([0])]);
    expect(target.splitOrStart).not.toHaveBeenCalled();
    expect(source.pads).toEqual([pad([0])]);
  });

  it('polls at once on gamepadconnected / gamepaddisconnected', () => {
    const { source, win, setPads } = setup();
    const events: PadEvent[] = [];
    source.subscribe((e) => events.push(e));
    setPads([pad()]);
    win.dispatchEvent(new Event('gamepadconnected'));
    setPads([]);
    win.dispatchEvent(new Event('gamepaddisconnected'));
    expect(events.map((e) => e.type)).toEqual(['connected', 'disconnected']);
  });

  it('isolates listener errors', () => {
    const { target, source, frame } = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    source.subscribe(() => {
      throw new Error('boom');
    });
    frame([pad()]);
    frame([pad([0])]);
    expect(target.splitOrStart).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('stops polling and forgets pads (reported as disconnected) on disconnect', () => {
    const { manager, source, ticker, frame } = setup();
    const events: PadEvent[] = [];
    source.subscribe((e) => events.push(e));
    frame([pad([0])]);
    expect(source.pads).toHaveLength(1);
    manager.removeSource(source);
    expect(ticker.listenerCount).toBe(0);
    expect(source.pads).toEqual([]);
    expect(events.at(-1)).toEqual({ type: 'disconnected', index: 0, id: ID });
  });
});
