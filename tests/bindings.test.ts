import { describe, expect, it } from 'vitest';
import {
  BINDINGS_VERSION,
  actionFor,
  bindingId,
  isBindableKey,
  padButton,
  padHold,
  padTogether,
  padLabelParts,
  padBindingText,
  withBinding,
  withoutBinding,
  bindingLabel,
  keyLabel,
  padButtonLabel,
  defaultBindings,
  parseBindings,
  serializeBindings,
  type Bindings,
} from '../src/lib/input/bindings';
import { padFamily } from '../src/lib/input/padLayout';

function withPads(): Bindings {
  const b = defaultBindings();
  b.split.push(padButton(10));
  b.skip.push(padButton(3));
  b.undo.push(padHold(8, 0));
  b.reset.push(padButton(20));
  return b;
}

describe('bindings', () => {
  it('has defaults for every action, and returns fresh copies', () => {
    const a = defaultBindings();
    expect(actionFor(a, { kind: 'key', code: 'Space' })).toBe('split');
    expect(actionFor(a, { kind: 'key', code: 'Numpad3' })).toBe('reset');
    expect(actionFor(a, { kind: 'key', code: 'KeyQ' })).toBeNull();
    a.split.length = 0;
    expect(defaultBindings().split.length).toBeGreaterThan(0);
  });

  it('round-trips through serialize/parse (object and JSON text)', () => {
    const b = withPads();
    expect(parseBindings(serializeBindings(b))).toEqual(b);
    expect(parseBindings(JSON.stringify(serializeBindings(b)))).toEqual(b);
    expect(serializeBindings(b).version).toBe(BINDINGS_VERSION);
  });

  it('falls back to defaults for unreadable data or another version', () => {
    for (const data of [null, 42, 'not json', '[]', {}, { version: 99, bindings: {} }]) {
      expect(parseBindings(data)).toEqual(defaultBindings());
    }
  });

  it('drops invalid entries and duplicates, keeps cleared actions empty', () => {
    const parsed = parseBindings({
      version: BINDINGS_VERSION,
      bindings: {
        split: [
          { kind: 'key', code: 'KeyS' },
          { kind: 'key', code: 'KeyS' },
          { kind: 'key', code: '' },
          { kind: 'mouse', button: 1 },
          { kind: 'pad', buttonIndex: -1 },
          { kind: 'pad', buttonIndex: 1.5 },
          { kind: 'pad', buttonIndex: 3 },
          'junk',
        ],
        undo: [],
        skip: 'nope',
      },
    });
    expect(parsed.split).toEqual([
      { kind: 'key', code: 'KeyS' },
      { kind: 'pad', combo: 'single', buttonIndex: 3 },
    ]);
    expect(parsed.undo).toEqual([]);
    // Invalid or missing lists get the defaults.
    expect(parsed.skip).toEqual(defaultBindings().skip);
    expect(parsed.reset).toEqual(defaultBindings().reset);
  });

  it('has no gamepad defaults', () => {
    const b = defaultBindings();
    for (let i = 0; i < 20; i++) {
      expect(actionFor(b, { kind: 'pad', buttonIndex: i, padId: 'Pad', padIndex: 0 })).toBeNull();
    }
  });

  it('matches pad buttons by button index, on any pad', () => {
    const b = withPads();
    const press = (buttonIndex: number, padId = 'Any pad') =>
      actionFor(b, { kind: 'pad', buttonIndex, padId, padIndex: 0 });
    expect(press(10)).toBe('split');
    expect(press(10, 'Other pad')).toBe('split');
    expect(press(3)).toBe('skip');
    expect(press(20)).toBe('reset');
    expect(press(5)).toBeNull();
  });

  it('first action in ACTIONS order wins a shared binding', () => {
    const b = defaultBindings();
    b.reset.push({ kind: 'key', code: 'Space' });
    expect(actionFor(b, { kind: 'key', code: 'Space' })).toBe('split');
  });

  it('gives readable names for keys and pad buttons', () => {
    expect(keyLabel('KeyP')).toBe('P');
    expect(keyLabel('Digit3')).toBe('3');
    expect(keyLabel('Numpad1')).toBe('Numpad 1');
    expect(keyLabel('NumpadEnter')).toBe('Numpad Enter');
    expect(keyLabel('Space')).toBe('Space');
    expect(keyLabel('ArrowLeft')).toBe('Arrow Left');
    expect(bindingLabel({ kind: 'pad', combo: 'single', buttonIndex: 0 })).toBe('A');
    expect(padButtonLabel(0)).toBe('A');
    expect(padButtonLabel(15)).toBe('D-pad Right');
    expect(padButtonLabel(0, 'playstation')).toBe('Cross');
    expect(padButtonLabel(8, 'playstation')).toBe('Share');
    expect(padButtonLabel(18)).toBe('Button 18');
  });
});

describe('pad combos', () => {
  const press = (b: Bindings, buttonIndex: number, held: number[] = [], together: number[] = []) =>
    actionFor(b, { kind: 'pad', buttonIndex, padId: 'Pad', padIndex: 0, held, together });

  it('builds normalized, labelled bindings', () => {
    expect(padButton(0)).toEqual({
      kind: 'pad',
      combo: 'single',
      buttonIndex: 0,
    });
    expect(padHold(8, 0)).toEqual({
      kind: 'pad',
      combo: 'hold',
      hold: 8,
      buttonIndex: 0,
    });
    expect(padTogether(5, 4)).toEqual({
      kind: 'pad',
      combo: 'together',
      buttons: [4, 5],
    });
    expect(padHold(3, 3)).toEqual(padButton(3));
    expect(padTogether(3, 3)).toEqual(padButton(3));
    expect([padButton(0), padHold(8, 0), padTogether(8, 0)].map(bindingId)).toEqual([
      'pad:0',
      'pad:8>0',
      'pad:0&8',
    ]);
  });

  it('matches hold + press only in that order', () => {
    const b = defaultBindings();
    b.split.push(padHold(8, 0));
    expect(press(b, 0)).toBeNull();
    expect(press(b, 0, [8])).toBe('split');
    expect(press(b, 0, [3, 8])).toBe('split');
    // Wrong order: A held, Select pressed.
    expect(press(b, 8, [0])).toBeNull();
  });

  it('matches together in any order, only within the chord window', () => {
    const b = defaultBindings();
    b.split.push(padTogether(4, 5));
    expect(press(b, 5, [4], [4])).toBe('split');
    expect(press(b, 4, [5], [5])).toBe('split');
    // 4 held for longer than the window: not together.
    expect(press(b, 5, [4], [])).toBeNull();
    expect(press(b, 5)).toBeNull();
  });

  it('prefers together over hold over single', () => {
    const b = defaultBindings();
    b.split.push(padButton(0));
    b.undo.push(padHold(8, 0));
    b.reset.push(padTogether(0, 8));
    expect(press(b, 0)).toBe('split');
    expect(press(b, 0, [9])).toBe('split');
    expect(press(b, 0, [8])).toBe('undo');
    expect(press(b, 0, [8], [8])).toBe('reset');
  });

  it('round-trips combos, rebuilds labels and drops invalid ones', () => {
    const b = withPads();
    b.pause.push(padTogether(1, 2));
    expect(parseBindings(JSON.stringify(serializeBindings(b)))).toEqual(b);
    const parsed = parseBindings({
      version: BINDINGS_VERSION,
      bindings: {
        split: [
          { kind: 'pad', combo: 'hold', hold: 8, buttonIndex: 0, label: 'stale' },
          { kind: 'pad', combo: 'hold', hold: 0, buttonIndex: 0 },
          { kind: 'pad', combo: 'hold', hold: -1, buttonIndex: 1 },
          { kind: 'pad', combo: 'together', buttons: [9, 2] },
          { kind: 'pad', combo: 'together', buttons: [2, 2] },
          { kind: 'pad', combo: 'together', buttons: [1, 2, 3] },
          { kind: 'pad', combo: 'chord3', buttons: [1, 2, 3] },
        ],
      },
    });
    expect(parsed.split).toEqual([padHold(8, 0), padTogether(2, 9)]);
  });
});

describe('editing bindings', () => {
  it('adds a binding without touching the input', () => {
    const b = defaultBindings();
    const { bindings, movedFrom } = withBinding(b, 'skip', { kind: 'key', code: 'KeyS' });
    expect(bindings.skip.map(bindingId)).toEqual(['key:Numpad2', 'key:KeyS']);
    expect(movedFrom).toEqual([]);
    expect(b.skip.map(bindingId)).toEqual(['key:Numpad2']);
  });

  it('moves a binding that another action has', () => {
    const { bindings, movedFrom } = withBinding(defaultBindings(), 'reset', {
      kind: 'key',
      code: 'Space',
    });
    expect(movedFrom).toEqual(['split']);
    expect(bindings.split.map(bindingId)).toEqual(['key:Numpad1']);
    expect(actionFor(bindings, { kind: 'key', code: 'Space' })).toBe('reset');
  });

  it('keeps the three pad kinds apart, ignores duplicates', () => {
    let b = withBinding(defaultBindings(), 'split', padButton(0)).bindings;
    const hold = withBinding(b, 'reset', padHold(8, 0));
    expect(hold.movedFrom).toEqual([]);
    const together = withBinding(hold.bindings, 'undo', padTogether(0, 8));
    expect(together.movedFrom).toEqual([]);
    b = withBinding(together.bindings, 'reset', padHold(8, 0)).bindings;
    expect(b.reset.map(bindingId)).toEqual(['key:Numpad3', 'pad:8>0']);
  });

  it('removes a single binding', () => {
    const b = withoutBinding(defaultBindings(), 'split', 'key:Space');
    expect(b.split.map(bindingId)).toEqual(['key:Numpad1']);
    expect(withoutBinding(b, 'split', 'key:Nope')).toEqual(b);
  });

  it('refuses Escape and Ctrl/Alt/Meta keys', () => {
    expect(isBindableKey('Space')).toBe(true);
    expect(isBindableKey('ShiftLeft')).toBe(true);
    for (const code of ['', 'Escape', 'ControlLeft', 'AltRight', 'MetaLeft', 'OSRight']) {
      expect(isBindableKey(code)).toBe(false);
    }
  });
});

describe('padLabelParts', () => {
  it('tags each button with press or hold, named for the family', () => {
    expect(padLabelParts(padButton(0))).toEqual([{ tag: 'press', button: 'A' }]);
    expect(padLabelParts(padHold(5, 0), 'playstation')).toEqual([
      { tag: 'hold', button: 'R1' },
      { tag: 'press', button: 'Cross' },
    ]);
    expect(padLabelParts(padTogether(5, 4))).toEqual([
      { tag: 'press', button: 'LB' },
      { tag: 'press', button: 'RB' },
    ]);
  });

  it('gives plain text for each kind', () => {
    expect(padBindingText(padButton(2), 'playstation')).toBe('Square');
    expect(padBindingText(padHold(5, 0))).toBe('Hold RB + A');
    expect(padBindingText(padTogether(4, 5))).toBe('LB + RB together');
    expect(bindingLabel(padHold(8, 3), 'playstation')).toBe('Hold Share + Triangle');
  });
});

describe('padFamily', () => {
  it('detects PlayStation pads, everything else uses Xbox names', () => {
    for (const id of [
      'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',
      'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)',
      '054c-09cc-Wireless Controller',
      'DUALSHOCK 4 Wireless Controller',
      'PS5 Controller',
    ]) {
      expect(padFamily(id)).toBe('playstation');
    }
    for (const id of [
      'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)',
      'xinput',
      '045e-028e-Microsoft X-Box 360 pad',
      'Some Generic Pad',
    ]) {
      expect(padFamily(id)).toBe('xbox');
    }
  });
});
