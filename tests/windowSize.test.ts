import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WindowSize } from '../src/lib/storage/settings';
import { WindowSizeMemory } from '../src/lib/ui/windowSize.svelte';

let size: WindowSize;
let saved: WindowSize | null;
let saves: WindowSize[];

const storage = {
  get timerWindowSize() {
    return saved;
  },
  saveTimerWindowSize(next: WindowSize) {
    saved = next;
    saves.push(next);
  },
};

function memory() {
  return new WindowSizeMemory({ storage, read: () => size, settleMs: 2000 });
}

function resizeTo(m: WindowSizeMemory, width: number, height: number) {
  size = { width, height };
  m.resize();
}

beforeEach(() => {
  vi.useFakeTimers();
  size = { width: 400, height: 600 };
  saved = null;
  saves = [];
});

afterEach(() => vi.useRealTimers());

describe('WindowSizeMemory', () => {
  it('saves the first size only when none is saved yet', () => {
    const m = memory();
    m.start();
    expect(m.hint).toBe(false);
    expect(saves).toEqual([{ width: 400, height: 600 }]);
  });

  it('never saves on resize; shows the hint whenever the size differs', () => {
    saved = { width: 400, height: 600 };
    const m = memory();
    m.start();
    expect(m.hint).toBe(false);

    resizeTo(m, 420, 600);
    vi.advanceTimersByTime(10_000);
    expect(m.hint).toBe(true);
    expect(m.hintState).toBe('differs');
    expect(m.current).toEqual({ width: 420, height: 600 });
    expect(m.last).toEqual({ width: 400, height: 600 });
    expect(saves).toEqual([]);
  });

  it('turns matched, then hides once the window settles', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    expect(m.hintState).toBe('differs');

    resizeTo(m, 300, 500);
    expect(m.hint).toBe(true);
    expect(m.hintState).toBe('matched');
    vi.advanceTimersByTime(1999);
    expect(m.hintState).toBe('matched');
    vi.advanceTimersByTime(1);
    expect(m.hint).toBe(false);
    expect(saves).toEqual([]);
  });

  it('goes back to differs when resized away before it is gone', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    resizeTo(m, 300, 500);
    vi.advanceTimersByTime(1500);
    expect(m.hintState).toBe('matched');
    resizeTo(m, 310, 500);
    expect(m.hintState).toBe('differs');
    vi.advanceTimersByTime(10_000);
    expect(m.hint).toBe(true);
  });

  it('restarts the settle wait on every resize while matched', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    resizeTo(m, 300, 500);
    vi.advanceTimersByTime(1500);
    resizeTo(m, 300, 500);
    vi.advanceTimersByTime(1500);
    expect(m.hintState).toBe('matched');
  });

  it('keeps the current size on accept', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    m.accept();
    expect(m.hint).toBe(false);
    expect(saved).toEqual({ width: 400, height: 600 });
  });

  it('shows no hint after stop', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    m.stop();
    expect(m.hint).toBe(false);
    resizeTo(m, 320, 500);
    expect(m.hint).toBe(false);
    expect(saves).toEqual([]);
  });
});
