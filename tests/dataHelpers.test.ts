// Data page helpers: new empty runs, split name parsing, unloading a run, formatting.
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { ManualTicker } from '../src/lib/ticker';
import { createRun, createTimer, initCore, segmentNames } from '../src/lib/timer/core';
import { parseSegmentNames } from '../src/lib/timer/lss';
import { TimerStore } from '../src/lib/timer/timerStore.svelte';
import { formatAttempts, formatBytes, formatPercent, usagePercent } from '../src/lib/ui/format';

let wasm: Buffer;
beforeAll(async () => {
  wasm = await readFile(
    new URL('../vendor/livesplit-core/livesplit_core_bg.wasm', import.meta.url),
  );
  await initCore(wasm);
});

describe('createRun', () => {
  it('builds a run with game, category and segments', () => {
    const run = createRun('Game', 'Any%', ['A', 'B']);
    try {
      expect(run.gameName()).toBe('Game');
      expect(run.categoryName()).toBe('Any%');
      expect(segmentNames(run)).toEqual(['A', 'B']);
      expect(run.saveAsLss()).toContain('<Name>A</Name>');
    } finally {
      run[Symbol.dispose]();
    }
  });

  it('gives a run without segments that the timer refuses', () => {
    expect(() => createTimer(createRun('Game', '', []))).toThrow(/no segments/);
  });
});

describe('parseSegmentNames', () => {
  it('takes one trimmed name per line and skips empty lines', () => {
    expect(parseSegmentNames(' One \r\n\nTwo\rThree\n   \n')).toEqual(['One', 'Two', 'Three']);
    expect(parseSegmentNames('')).toEqual([]);
  });
});

describe('TimerStore.unloadRun', () => {
  it('goes back to the empty state and can load again', async () => {
    const store = new TimerStore({ ticker: new ManualTicker() });
    await store.init(wasm);
    try {
      store.loadRun(createRun('Game', '', ['A']));
      expect(store.view).not.toBeNull();
      store.unloadRun();
      expect(store.hasRun).toBe(false);
      expect(store.view).toBeNull();
      expect(store.comparisons).toEqual([]);
      expect(store.exportLss()).toBeNull();
      store.splitOrStart(); // no run: nothing happens
      expect(store.phase).toBe('NotRunning');
      store.loadRun(createRun('Game', '', ['A']));
      expect(store.hasRun).toBe(true);
    } finally {
      store.destroy();
    }
  });
});

describe('formatBytes', () => {
  it('uses binary units with a few digits', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(15.25 * 1024 * 1024)).toBe('15.3 MB');
    expect(formatBytes(300 * 1024 ** 3)).toBe('300 GB');
    expect(formatBytes(-1)).toBe('?');
  });
});

describe('formatAttempts', () => {
  it('counts runs and completed runs', () => {
    expect(formatAttempts(18, 5)).toBe('18 runs (5 complete)');
    expect(formatAttempts(1, 0)).toBe('1 run (0 complete)');
    expect(formatAttempts(0, 0)).toBe('0 runs (0 complete)');
  });
});

describe('usage percent', () => {
  it('computes and formats the filled share of the quota', () => {
    expect(usagePercent(50, 200)).toBe(25);
    expect(usagePercent(300, 200)).toBe(100);
    expect(usagePercent(10, 0)).toBe(0);
    expect(formatPercent(usagePercent(1024 ** 2, 10 * 1024 ** 3))).toBe('< 0.01%'); // 0.0098%
    expect(formatPercent(0.001)).toBe('< 0.01%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(3.46)).toBe('3.5%');
    expect(formatPercent(42.4)).toBe('42%');
  });
});
