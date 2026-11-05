// .lss import/export: round trip through the timer store, readable errors, file names.
import { readFile } from 'node:fs/promises';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RunRef } from 'livesplit-core';
import { ManualTicker } from '../src/lib/ticker';
import { initCore, parseRun, segmentNames } from '../src/lib/timer/core';
import {
  ATTEMPT_IN_PROGRESS_MESSAGE,
  importErrorMessage,
  importSplitsFile,
  lssFileName,
  MAX_SPLITS_FILE_BYTES,
  readSplitsFile,
} from '../src/lib/timer/lss';
import { TimerStore } from '../src/lib/timer/timerStore.svelte';

const fixtureFile = async (name: string) =>
  new File([await readFile(new URL(`./fixtures/${name}`, import.meta.url))], name);

/** PB split times per segment as `[real, game]` seconds (`null` = no time). */
function pbSplitTimes(run: RunRef): [number | null, number | null][] {
  const times: [number | null, number | null][] = [];
  for (let i = 0; i < run.len(); i++) {
    // Shared output slot: read both values out before the next Time call.
    const pb = run.segment(i).personalBestSplitTime();
    const real = pb.realTime()?.totalSeconds() ?? null;
    const game = pb.gameTime()?.totalSeconds() ?? null;
    times.push([real, game]);
  }
  return times;
}

beforeAll(async () => {
  const wasm = await readFile(
    new URL('../vendor/livesplit-core/livesplit_core_bg.wasm', import.meta.url),
  );
  await initCore(wasm);
});

describe('lss import/export', () => {
  let store: TimerStore;

  beforeEach(async () => {
    store = new TimerStore({ ticker: new ManualTicker() });
    await store.init();
  });

  afterEach(() => store.destroy());

  it.each(['real-time.lss', 'game-time.lss', 'segment-groups.lss', 'new-run.lss'])(
    'round-trips %s (segment names and PB split times)',
    async (name) => {
      expect(await importSplitsFile(store, await fixtureFile(name))).toBeNull();
      const run = store.timer!.getRun();
      const names = segmentNames(run);
      const pb = pbSplitTimes(run);
      expect(names.length).toBeGreaterThan(0);

      const exported = store.exportLss()!;
      expect(exported.fileName).toMatch(/\.lss$/);

      // Import the export again, like a user would.
      const file = new File([exported.text], exported.fileName);
      expect(await importSplitsFile(store, file)).toBeNull();
      expect(segmentNames(store.timer!.getRun())).toEqual(names);
      expect(pbSplitTimes(store.timer!.getRun())).toEqual(pb);

      // And directly through the core, as a second opinion.
      const reparsed = parseRun(exported.text);
      try {
        expect(segmentNames(reparsed)).toEqual(names);
        expect(pbSplitTimes(reparsed)).toEqual(pb);
      } finally {
        reparsed[Symbol.dispose]();
      }
    },
  );

  it('keeps game time in the round trip', async () => {
    await importSplitsFile(store, await fixtureFile('game-time.lss'));
    const pb = pbSplitTimes(store.timer!.getRun());
    expect(pb.every(([real, game]) => real !== null && game !== null && game < real)).toBe(true);
  });

  it('reports a readable error for invalid.lss and keeps the current run', async () => {
    await importSplitsFile(store, await fixtureFile('real-time.lss'));
    const game = store.timer!.getRun().gameName();

    const message = await importSplitsFile(store, await fixtureFile('invalid.lss'));
    expect(message).toBe(
      '"invalid.lss" could not be read as a splits file. Use a LiveSplit .lss file (or another split format livesplit-core supports).',
    );
    expect(store.timer!.getRun().gameName()).toBe(game);
  });

  it('reports a run without segments', async () => {
    const lss = await readFile(new URL('./fixtures/new-run.lss', import.meta.url), 'utf8');
    const empty = lss.replace(/<Segments>[\s\S]*<\/Segments>/, '<Segments />');
    expect(empty).not.toBe(lss);
    const message = await importSplitsFile(store, new File([empty], 'empty.lss'));
    expect(message).toBe('"empty.lss" has no segments.');
    expect(store.hasRun).toBe(false);
  });

  it('refuses to import while an attempt is in progress', async () => {
    await importSplitsFile(store, await fixtureFile('real-time.lss'));
    store.splitOrStart();
    const message = await importSplitsFile(store, await fixtureFile('game-time.lss'));
    expect(message).toBe(ATTEMPT_IN_PROGRESS_MESSAGE);
    expect(store.phase).toBe('Running');
    store.reset();
    expect(await importSplitsFile(store, await fixtureFile('game-time.lss'))).toBeNull();
  });

  it('refuses files that are too large before reading them', async () => {
    const huge = { size: MAX_SPLITS_FILE_BYTES + 1 } as Blob;
    await expect(readSplitsFile(huge)).rejects.toThrow('too large');
    expect(importErrorMessage(new Error('boom'), 'x.lss')).toBe(
      '"x.lss" could not be imported: boom',
    );
  });
});

describe('lssFileName', () => {
  it('builds "Game - Category.lss"', () => {
    expect(lssFileName('Pixel Quest', 'Any%')).toBe('Pixel Quest - Any%.lss');
  });

  it('removes characters that are invalid in file names', () => {
    expect(lssFileName('A: B/C', 'Any% <Glitchless>?')).toBe('A B C - Any% Glitchless.lss');
    expect(lssFileName('Game.', '')).toBe('Game.lss');
  });

  it('falls back to splits.lss', () => {
    expect(lssFileName('', '  ')).toBe('splits.lss');
  });
});
