import { describe, expect, it } from 'vitest';
import {
  BINDINGS_VERSION,
  actionFor,
  bindingLabel,
  keyLabel,
  defaultBindings,
  parseBindings,
  serializeBindings,
  type Bindings,
} from '../src/lib/input/bindings';

function withPads(): Bindings {
  const b = defaultBindings();
  b.split.push({ kind: 'pad', buttonIndex: 0, padId: 'Xbox Pad', label: 'A' });
  b.undo.push({ kind: 'pad', buttonIndex: 0, padId: 'PS Pad', label: 'Cross' });
  b.reset.push({ kind: 'pad', buttonIndex: 9, label: 'Start' });
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
      { kind: 'pad', buttonIndex: 3, label: 'Button 3' },
    ]);
    expect(parsed.undo).toEqual([]);
    // Invalid or missing lists get the defaults.
    expect(parsed.skip).toEqual(defaultBindings().skip);
    expect(parsed.reset).toEqual(defaultBindings().reset);
  });

  it('matches pad buttons by pad id first, then by button index alone', () => {
    const b = withPads();
    expect(actionFor(b, { kind: 'pad', buttonIndex: 0, padId: 'Xbox Pad' })).toBe('split');
    expect(actionFor(b, { kind: 'pad', buttonIndex: 0, padId: 'PS Pad' })).toBe('undo');
    // Unknown pad id (e.g. other browser): falls back to the first binding on that index.
    expect(actionFor(b, { kind: 'pad', buttonIndex: 0, padId: 'Renamed Pad' })).toBe('split');
    // A binding without pad id matches any pad.
    expect(actionFor(b, { kind: 'pad', buttonIndex: 9, padId: 'Xbox Pad' })).toBe('reset');
    expect(actionFor(b, { kind: 'pad', buttonIndex: 5, padId: 'Xbox Pad' })).toBeNull();
  });

  it('gives readable names for keys and pad buttons', () => {
    expect(keyLabel('KeyP')).toBe('P');
    expect(keyLabel('Digit3')).toBe('3');
    expect(keyLabel('Numpad1')).toBe('Numpad 1');
    expect(keyLabel('NumpadEnter')).toBe('Numpad Enter');
    expect(keyLabel('Space')).toBe('Space');
    expect(keyLabel('ArrowLeft')).toBe('Arrow Left');
    expect(bindingLabel({ kind: 'pad', buttonIndex: 0, label: 'A' })).toBe('A');
  });
});
