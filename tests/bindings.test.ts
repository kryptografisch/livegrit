import { describe, expect, it } from 'vitest';
import {
  BINDINGS_VERSION,
  actionFor,
  bindingLabel,
  keyLabel,
  padButtonLabel,
  defaultBindings,
  parseBindings,
  serializeBindings,
  type Bindings,
} from '../src/lib/input/bindings';

function withPads(): Bindings {
  const b = defaultBindings();
  b.split.push({ kind: 'pad', buttonIndex: 10, label: 'Left stick' });
  b.skip.push({ kind: 'pad', buttonIndex: 3, label: 'Y' });
  b.reset.push({ kind: 'pad', buttonIndex: 20, label: 'Button 20' });
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
      { kind: 'pad', buttonIndex: 3, label: 'Y / Triangle' },
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
    expect(bindingLabel({ kind: 'pad', buttonIndex: 0, label: 'A' })).toBe('A');
    expect(padButtonLabel(0)).toBe('A / Cross');
    expect(padButtonLabel(15)).toBe('D-pad right');
    expect(padButtonLabel(17)).toBe('Button 17');
  });
});
