import { describe, expect, it, vi } from 'vitest';
import { defaultBindings } from '../src/lib/input/bindings';
import { GamepadSource, type PadSnapshot } from '../src/lib/input/gamepadSource';
import { InputDeviceStore, padLabel, padName } from '../src/lib/input/inputDevice.svelte';
import { InputManager, type ActionTarget } from '../src/lib/input/inputManager';
import { handleKeyDown } from '../src/lib/input/keyboardSource';
import { ManualTicker } from '../src/lib/ticker';

const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)';
const PS = '054c-09cc-Wireless Controller';

const pad = (index: number, id: string, held: number[] = []): PadSnapshot => ({
  index,
  id,
  buttons: Array.from({ length: 4 }, (_, i) => held.includes(i)),
});

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
  const bindings = defaultBindings();
  bindings.split.push({ kind: 'pad', combo: 'single', buttonIndex: 0 });
  manager.bindings = bindings;
  const ticker = new ManualTicker();
  const win = new EventTarget();
  const source = new GamepadSource({
    ticker,
    eventTarget: win,
    getGamepads: () => pads,
    now: () => now,
  });
  const devices = new InputDeviceStore();
  devices.attachPads(source);
  devices.attachInput(manager);
  manager.addSource(source);
  /** Sets the pads and runs one frame (announcing new pads like a browser does). */
  const frame = (next: PadSnapshot[]) => {
    const appeared = next.some((p) => !pads.some((q) => q.index === p.index && q.id === p.id));
    pads = next;
    now += 100;
    if (appeared) win.dispatchEvent(new Event('gamepadconnected'));
    ticker.tick(100);
  };
  const key = (code: string) => {
    now += 100;
    handleKeyDown(manager, {
      code,
      repeat: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      target: null,
      preventDefault() {},
    });
  };
  return { target, manager, devices, frame, key };
}

describe('padName', () => {
  it('strips browser-specific decorations', () => {
    expect(padName(XBOX)).toBe('Xbox Wireless Controller');
    expect(padName('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('Xbox 360 Controller');
    expect(padName('USB Gamepad (Vendor: 0079 Product: 0011)')).toBe('USB Gamepad');
    expect(padName(PS)).toBe('Wireless Controller');
    expect(padName('xinput')).toBe('XInput gamepad');
    expect(padName('  ')).toBe('Gamepad');
    expect(padName('8BitDo Pro 2 (Bluetooth)')).toBe('8BitDo Pro 2 (Bluetooth)');
  });
});

describe('InputDeviceStore', () => {
  it('lists connected pads by slot', () => {
    const { devices, frame } = setup();
    frame([pad(1, PS), pad(0, XBOX)]);
    expect(devices.pads).toEqual([
      { index: 0, id: XBOX, name: 'Xbox Wireless Controller', family: 'xbox' },
      { index: 1, id: PS, name: 'Wireless Controller', family: 'playstation' },
    ]);
    frame([pad(1, PS)]);
    expect(devices.pads.map((p) => p.index)).toEqual([1]);
  });

  it('tracks the device last used for an action', () => {
    const { target, devices, frame, key } = setup();
    expect(devices.lastUsed).toEqual({ kind: 'keyboard' });

    // The press that reveals a pad already counts.
    frame([pad(0, XBOX, [0]), pad(1, PS)]);
    expect(target.splitOrStart).toHaveBeenCalledTimes(1);
    expect(devices.lastUsed).toEqual({
      kind: 'pad',
      index: 0,
      id: XBOX,
      name: 'Xbox Wireless Controller',
      family: 'xbox',
    });

    // Any pad and the keyboard work.
    frame([pad(0, XBOX), pad(1, PS, [0])]);
    expect(target.splitOrStart).toHaveBeenCalledTimes(2);
    expect(devices.lastUsed).toMatchObject({ kind: 'pad', index: 1 });
    key('Space');
    expect(target.splitOrStart).toHaveBeenCalledTimes(3);
    expect(devices.lastUsed).toEqual({ kind: 'keyboard' });
  });

  it('names buttons for the last used pad, else the first connected, else Xbox', () => {
    const { devices, frame, key } = setup();
    expect(devices.labelFamily).toBe('xbox');
    frame([pad(0, PS)]);
    expect(devices.labelFamily).toBe('playstation');
    frame([pad(0, PS), pad(1, XBOX, [0])]);
    expect(devices.labelFamily).toBe('xbox');
    // Back to the keyboard: the first connected pad (PlayStation) again.
    key('Space');
    expect(devices.labelFamily).toBe('playstation');
  });

  it('ignores unbound input', () => {
    const { devices, frame, key } = setup();
    frame([pad(0, XBOX)]);
    frame([pad(0, XBOX, [3])]); // button 3 is unbound
    key('KeyQ');
    expect(devices.lastUsed).toEqual({ kind: 'keyboard' });
  });

  it('falls back to the keyboard when the last used pad disconnects', () => {
    const { devices, frame } = setup();
    frame([pad(0, XBOX, [0]), pad(1, PS)]);
    frame([pad(1, PS)]);
    expect(devices.lastUsed).toEqual({ kind: 'keyboard' });
  });

  it('picks up pads the source already knows when attached', () => {
    const devices = new InputDeviceStore();
    devices.attachPads({ pads: [pad(2, PS)], subscribe: () => () => {} });
    expect(devices.pads).toEqual([
      { index: 2, id: PS, name: 'Wireless Controller', family: 'playstation' },
    ]);
  });
});

describe('InputDeviceStore used pads', () => {
  it('lists only pads whose press triggered an action, until they disconnect', () => {
    const { devices, frame } = setup();
    // Three pads connected; button 3 isn't mapped, button 0 is (split).
    frame([pad(0, XBOX, [3]), pad(1, PS), pad(2, XBOX)]);
    expect(devices.pads).toHaveLength(3);
    expect(devices.usedPads).toEqual([]);

    frame([pad(0, XBOX), pad(1, PS), pad(2, XBOX, [0])]);
    frame([pad(0, XBOX), pad(1, PS), pad(2, XBOX)]);
    expect(devices.usedPads.map((p) => p.index)).toEqual([2]);
    frame([pad(0, XBOX), pad(1, PS, [0]), pad(2, XBOX)]);
    expect(devices.usedPads.map((p) => p.index)).toEqual([1, 2]);

    frame([pad(0, XBOX), pad(2, XBOX)]);
    expect(devices.usedPads.map((p) => p.index)).toEqual([2]);
  });
});

describe('padLabel', () => {
  it('numbers pads by slot, from 1', () => {
    expect(padLabel({ index: 0 })).toBe('Gamepad 1');
    expect(padLabel({ index: 3 })).toBe('Gamepad 4');
  });
});
