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
  return new WindowSizeMemory({ storage, read: () => size, debounceMs: 100 });
}

beforeEach(() => {
  vi.useFakeTimers();
  size = { width: 400, height: 600 };
  saved = null;
  saves = [];
});

afterEach(() => vi.useRealTimers());

describe('WindowSizeMemory', () => {
  it('saves the first size and later resizes (debounced), without a hint', () => {
    const m = memory();
    m.start();
    expect(m.hint).toBe(false);
    expect(saves).toEqual([{ width: 400, height: 600 }]);

    size = { width: 410, height: 600 };
    m.resize();
    size = { width: 420, height: 600 };
    m.resize();
    expect(saves).toHaveLength(1);
    vi.advanceTimersByTime(100);
    expect(saves).toEqual([
      { width: 400, height: 600 },
      { width: 420, height: 600 },
    ]);
    expect(m.hint).toBe(false);
  });

  it('shows both sizes when they differ and keeps the saved one meanwhile', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    expect(m.hint).toBe(true);
    expect(m.current).toEqual({ width: 400, height: 600 });
    expect(m.last).toEqual({ width: 300, height: 500 });

    size = { width: 350, height: 550 };
    m.resize();
    vi.advanceTimersByTime(1000);
    expect(saves).toEqual([]);
    expect(saved).toEqual({ width: 300, height: 500 });
  });

  it('hides the hint once the window has the saved size again, then tracks', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    size = { width: 300, height: 500 };
    m.resize();
    expect(m.hint).toBe(false);
    size = { width: 320, height: 500 };
    m.resize();
    expect(m.hint).toBe(false);
    vi.advanceTimersByTime(100);
    expect(saved).toEqual({ width: 320, height: 500 });
  });

  it('keeps the current size when the hint is closed', () => {
    saved = { width: 300, height: 500 };
    const m = memory();
    m.start();
    m.accept();
    expect(m.hint).toBe(false);
    expect(saved).toEqual({ width: 400, height: 600 });
  });

  it('saves nothing after stop', () => {
    const m = memory();
    m.start();
    size = { width: 500, height: 600 };
    m.resize();
    m.stop();
    vi.advanceTimersByTime(1000);
    expect(saves).toHaveLength(1);
  });
});
