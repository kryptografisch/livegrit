// Settings → Splits → Times: the attempt history from the core, removing one attempt from
// the .lss, and the formatting/sorting helpers of the table.
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { ManualTicker } from '../src/lib/ticker';
import {
  attemptHistory,
  attemptStats,
  coreTimeText,
  core,
  initCore,
  parseRun,
  parseTimeText,
  splitTimesOf,
} from '../src/lib/timer/core';
import { goldChanges, goldOptions, pbSegmentTime } from '../src/lib/timer/goldOptions';
import { removeAttemptFromLss } from '../src/lib/timer/lss';
import { TimerStore } from '../src/lib/timer/timerStore.svelte';
import { formatDuration } from '../src/lib/ui/format';
import { sortRuns } from '../src/lib/ui/runSort';

const fixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

beforeAll(async () => {
  const wasm = await readFile(
    new URL('../vendor/livesplit-core/livesplit_core_bg.wasm', import.meta.url),
  );
  await initCore(wasm);
});

/** The history of .lss text in Real Time. */
function historyOf(lss: string) {
  const run = parseRun(lss);
  try {
    return attemptHistory(run, core().TimingMethod.RealTime);
  } finally {
    run[Symbol.dispose]();
  }
}

describe('attemptHistory', () => {
  it('reads the attempts with dates, final times and segment times', async () => {
    const history = historyOf(await fixture('real-time.lss'));
    expect(history.map((a) => a.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(history.map((a) => a.time)).toEqual([433_900, null, 423_900, null, 423_100, null]);
    expect(history[0]!.started).toBe(Date.UTC(2026, 9, 1, 18));
    expect(history[0]!.ended).toBe(Date.UTC(2026, 9, 1, 18, 7, 13));
    // Reset after two splits: the rest has no times.
    expect(history[1]!.segments).toEqual([63_800, 78_400, 75_000, null, null]);
    // Reset before the first split.
    expect(history[3]!.segments).toEqual([null, null, null, null, null]);
    // A finished run: the split times add up to the final time.
    const finished = history[0]!;
    expect(finished.segments.every((t) => t !== null)).toBe(true);
    expect(splitTimesOf(finished.segments).at(-1)).toBe(finished.time);
  });

  it('is empty for a run without attempts', async () => {
    expect(historyOf(await fixture('new-run.lss'))).toEqual([]);
  });
});

describe('splitTimesOf', () => {
  it('sums the segment times and skips segments without a time', () => {
    expect(splitTimesOf([1000, null, 3000, 500])).toEqual([1000, null, 4000, 4500]);
    expect(splitTimesOf([])).toEqual([]);
  });
});

describe('removeAttemptFromLss', () => {
  it('removes the attempt, its segment times and one from the count (core output)', async () => {
    const run = parseRun(await fixture('real-time.lss'));
    let lss: string;
    try {
      lss = run.saveAsLss();
    } finally {
      run[Symbol.dispose]();
    }
    const before = historyOf(lss);

    for (const index of [2, 4]) {
      const text = removeAttemptFromLss(lss, index);
      expect(text).not.toBeNull();
      const after = historyOf(text!);
      expect(after).toEqual(before.filter((a) => a.index !== index));
      const parsed = parseRun(text!);
      try {
        expect(attemptStats(parsed)).toEqual({ attempts: 5, completed: 3 });
        expect(parsed.len()).toBe(5);
      } finally {
        parsed[Symbol.dispose]();
      }
    }
  });

  it('returns null for an attempt that is not in the history', async () => {
    const lss = await fixture('real-time.lss');
    expect(removeAttemptFromLss(lss, 99)).toBeNull();
    expect(removeAttemptFromLss(lss, 1.5)).toBeNull();
    expect(removeAttemptFromLss(await fixture('new-run.lss'), 1)).toBeNull();
  });

  it('does not touch attempts whose id only starts the same', async () => {
    const lss = await fixture('real-time.lss');
    const text = removeAttemptFromLss(lss.replace(/id="5"/g, 'id="15"'), 1)!;
    expect(text).toContain('<Attempt id="15"');
    expect(text).toContain('<Time id="15">');
    expect(text).not.toContain('<Attempt id="1"');
    expect(text).not.toContain('<Time id="1">');
  });
});

describe('TimerStore.history', () => {
  it('follows the loaded run and adds an attempt on reset', async () => {
    const store = new TimerStore({ ticker: new ManualTicker() });
    await store.init();
    try {
      store.loadSplits(await fixture('real-time.lss'));
      expect(store.history).toHaveLength(6);
      expect(store.segmentNames).toHaveLength(5);

      store.splitOrStart();
      store.splitOrStart();
      expect(store.history).toHaveLength(6); // running: not in the history yet
      store.reset();
      expect(store.history).toHaveLength(7);
      expect(store.history.at(-1)).toMatchObject({ index: 7, time: null });
      expect(store.history.at(-1)!.segments[0]).not.toBeNull();

      store.unloadRun();
      expect(store.history).toEqual([]);
      expect(store.segmentNames).toEqual([]);
    } finally {
      store.destroy();
    }
  });
});

describe('formatDuration', () => {
  it('formats run times with centiseconds, cut off', () => {
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(0)).toBe('0:00.00');
    expect(formatDuration(423_109)).toBe('7:03.10');
    expect(formatDuration(3_723_456)).toBe('1:02:03.45');
    expect(formatDuration(59_999)).toBe('0:59.99');
  });
});

describe('sortRuns tie-break', () => {
  it('orders runs with the same start by index, newest first', () => {
    const runs = [
      { index: 1, started: 0, time: 2000 },
      { index: 2, started: 0, time: 2000 },
      { index: 3, started: 0, time: null },
    ];
    expect(sortRuns(runs, 'latest').map((r) => r.index)).toEqual([3, 2, 1]);
    expect(sortRuns(runs, 'best').map((r) => r.index)).toEqual([2, 1, 3]);
  });
});

describe('goldOptions', () => {
  const attempt = (index: number, segments: (number | null)[]) => ({
    index,
    started: null,
    ended: null,
    time: null,
    segments,
  });

  it('skips times after a skipped segment and runs marked for removal', () => {
    const history = [attempt(1, [1000, 2000]), attempt(2, [900, null]), attempt(3, [null, 1500])];
    const times = [
      { index: 1, ms: 2000 },
      { index: 3, ms: 1500 }, // covers both segments (segment 0 was skipped)
    ];
    expect(goldOptions(1, history, times, [1000, 3000], new Set())).toEqual({
      fastest: { ms: 2000, run: 1 },
      limit: { ms: 1500, reason: 'run', run: 3 },
    });
    expect(goldOptions(1, history, times, [1000, 3000], new Set([3]))).toEqual({
      fastest: { ms: 2000, run: 1 },
      limit: { ms: 2000, reason: 'run', run: 1 },
    });
  });

  it('limits by the PB segment and history times that belong to no run', () => {
    expect(goldOptions(0, [], [{ index: -1, ms: 800 }], [900], new Set())).toEqual({
      fastest: null,
      limit: { ms: 800, reason: 'history' },
    });
    expect(goldOptions(0, [], [], [700], new Set()).limit).toEqual({ ms: 700, reason: 'pb' });
    expect(goldOptions(0, [], [], [null], new Set()).limit).toBeNull();
  });

  it('pbSegmentTime subtracts the previous PB split with a time', () => {
    expect(pbSegmentTime([1000, null, 4000], 2)).toBe(3000);
    expect(pbSegmentTime([1000, null, 4000], 1)).toBeNull();
    expect(pbSegmentTime([1000], 0)).toBe(1000);
  });
});

describe('core time text', () => {
  it('round-trips through the core parser', () => {
    for (const ms of [0, 60_905, 3_723_456]) expect(parseTimeText(coreTimeText(ms))).toBe(ms);
    expect(parseTimeText('1:02.45')).toBe(62_450);
    expect(parseTimeText('nope')).toBeNull();
  });
});

describe('goldChanges', () => {
  const attempt = (index: number, segments: (number | null)[]) => ({
    index,
    started: null,
    ended: null,
    time: null,
    segments,
  });
  const history = [attempt(1, [1000, 2000]), attempt(2, [900, 2100]), attempt(3, [950, null])];
  const times = [
    [
      { index: 1, ms: 1000 },
      { index: 2, ms: 900 },
      { index: 3, ms: 950 },
    ],
    [
      { index: 1, ms: 2000 },
      { index: 2, ms: 2100 },
    ],
  ];

  it('moves golds of removed runs to the next best time, or none', () => {
    expect(goldChanges([900, 2000], history, times, [null, null], new Set([2]))).toEqual([
      { segment: 0, from: 900, to: 950 },
    ]);
    expect(goldChanges([900, 2000], history, times, [null, null], new Set([1, 2]))).toEqual([
      { segment: 0, from: 900, to: 950 },
      { segment: 1, from: 2000, to: null },
    ]);
  });

  it('keeps a gold another run or the PB segment also has, and caps at the PB segment', () => {
    expect(goldChanges([900, 2000], history, times, [900, null], new Set([2]))).toEqual([]);
    expect(goldChanges([900, 2000], history, times, [920, null], new Set([2]))).toEqual([
      { segment: 0, from: 900, to: 920 },
    ]);
    expect(goldChanges([900, 2000], history, times, [null, null], new Set())).toEqual([]);
  });
});
