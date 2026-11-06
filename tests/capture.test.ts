import { describe, expect, it } from 'vitest';
import { padButton, padHold, padTogether } from '../src/lib/input/bindings';
import { captureKey, PadComboRecorder } from '../src/lib/input/capture';
import type { PadSnapshot } from '../src/lib/input/gamepadSource';

const keyEvent = (code: string, extra: Partial<Parameters<typeof captureKey>[0]> = {}) => ({
  code,
  repeat: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...extra,
});

function pad(held: number[] = [], index = 0, id = 'Pad', count = 10): PadSnapshot {
  return { index, id, buttons: Array.from({ length: count }, (_, i) => held.includes(i)) };
}

describe('captureKey', () => {
  it('captures a plain key', () => {
    expect(captureKey(keyEvent('KeyS'))).toEqual({
      type: 'binding',
      binding: { kind: 'key', code: 'KeyS' },
    });
    expect(captureKey(keyEvent('ShiftLeft')).type).toBe('binding');
  });

  it('cancels on Escape, ignores repeats and IME', () => {
    expect(captureKey(keyEvent('Escape'))).toEqual({ type: 'cancel' });
    expect(captureKey(keyEvent('Enter', { repeat: true }))).toEqual({ type: 'ignore' });
    expect(captureKey(keyEvent('KeyA', { isComposing: true }))).toEqual({ type: 'ignore' });
    expect(captureKey(keyEvent(''))).toEqual({ type: 'ignore' });
  });

  it('refuses Ctrl/Alt/Meta keys and combinations', () => {
    expect(captureKey(keyEvent('ControlLeft', { ctrlKey: true })).type).toBe('invalid');
    expect(captureKey(keyEvent('MetaLeft')).type).toBe('invalid');
    expect(captureKey(keyEvent('KeyS', { ctrlKey: true })).type).toBe('invalid');
    expect(captureKey(keyEvent('KeyS', { altKey: true })).type).toBe('invalid');
  });
});

describe('PadComboRecorder', () => {
  /** Feeds frames as [heldButtons, timeMs]; returns every frame's result. */
  function feed(r: PadComboRecorder, frames: [number[], number][]) {
    return frames.map(([held, at]) => r.update([pad(held)], at));
  }

  it('records a single button on release (it could still become a hold combo)', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[0], 10],
        [[0], 500],
      ]),
    ).toEqual([null, null, null]);
    expect(r.holding).toBe(0);
    expect(r.update([pad()], 600)).toEqual(padButton(0));
    expect(r.holding).toBeNull();
  });

  it('records hold + press at the second press', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[8], 10],
        [[0, 8], 400],
      ]),
    ).toEqual([null, null, padHold(8, 0)]);
  });

  it('records together at the second press within the window, in any order', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[8], 10],
        [[0, 8], 60],
      ]).at(-1),
    ).toEqual(padTogether(0, 8));
    // Exactly at the window: still together.
    expect(
      feed(r, [
        [[], 1000],
        [[2], 1000],
        [[1, 2], 1100],
      ]).at(-1),
    ).toEqual(padTogether(1, 2));
    // A quick second press counts even if the first was already released.
    expect(
      feed(r, [
        [[], 2000],
        [[4], 2010],
        [[5], 2050],
      ]).at(-1),
    ).toEqual(padTogether(4, 5));
  });

  it('records two (or more) buttons in the same frame as the first two together', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[4, 5], 10],
      ]).at(-1),
    ).toEqual(padTogether(4, 5));
    expect(
      feed(r, [
        [[], 100],
        [[1, 2, 3], 110],
      ]).at(-1),
    ).toEqual(padTogether(1, 2));
  });

  it('a released button followed by a later one records the first as single', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[8], 10],
        [[], 50],
      ]).at(-1),
    ).toEqual(padButton(8));
    // The same frame as a late second press: the first is single.
    expect(
      feed(r, [
        [[], 100],
        [[8], 110],
        [[0], 400],
      ]).at(-1),
    ).toEqual(padButton(8));
  });

  it('keeps a held combo button as the hold button for the next press', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[5], 10],
        [[0, 5], 400],
        [[5], 450],
        [[1, 5], 460], // RB still held, B pressed (also quickly after: still hold)
        [[5], 500],
        [[], 600], // RB released: it was used in a combo, no single press
        [[3], 610],
        [[], 620],
      ]),
    ).toEqual([null, null, padHold(5, 0), null, padHold(5, 1), null, null, null, padButton(3)]);
  });

  it('continues after together with the button that stays held', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[4, 5], 10],
        [[5], 50],
        [[2, 5], 60],
        [[], 100],
      ]),
    ).toEqual([null, padTogether(4, 5), null, padHold(5, 2), null]);
  });

  it('ignores a third button pressed with a held combo', () => {
    const r = new PadComboRecorder(100);
    expect(
      feed(r, [
        [[], 0],
        [[5], 10],
        [[0, 5], 400],
        [[0, 1, 5], 500], // still holding A: B makes "Hold RB + B"
      ]).at(-1),
    ).toEqual(padHold(5, 1));
  });

  it('buttons held when a pad is first seen are a baseline', () => {
    const r = new PadComboRecorder(100);
    expect(r.update([pad([8])], 0)).toBeNull();
    expect(r.holding).toBeNull();
    expect(r.update([pad()], 100)).toBeNull();
    expect(
      feed(r, [
        [[8], 200],
        [[], 300],
      ]).at(-1),
    ).toEqual(padButton(8));
    // A baseline button doesn't become a hold button either.
    const r2 = new PadComboRecorder(100);
    expect(
      feed(r2, [
        [[8], 0],
        [[0, 8], 500],
        [[8], 600],
      ]).at(-1),
    ).toEqual(padButton(0));
  });

  it('works with any pad and forgets disconnected ones', () => {
    const r = new PadComboRecorder(100);
    r.update([pad([], 0), pad([], 1, 'Other')], 0);
    r.update([pad([], 0), pad([2], 1, 'Other')], 10);
    // Pad 1 disconnects mid-press: nothing recorded.
    expect(r.update([pad([], 0)], 20)).toBeNull();
    expect(r.holding).toBeNull();
    // It comes back holding the button: baseline, no recording.
    expect(r.update([pad([], 0), pad([2], 1, 'Other')], 30)).toBeNull();
    expect(r.update([pad([], 0), pad([], 1, 'Other')], 40)).toBeNull();
    r.update([pad([3], 0), pad([], 1, 'Other')], 50);
    expect(r.update([pad([], 0), pad([], 1, 'Other')], 60)).toEqual(padButton(3));
  });

  it('another pad in the same slot starts over', () => {
    const r = new PadComboRecorder(100);
    r.update([pad()], 0);
    r.update([pad([1])], 10);
    expect(r.update([pad([], 0, 'New pad')], 20)).toBeNull();
    expect(r.holding).toBeNull();
  });
});
