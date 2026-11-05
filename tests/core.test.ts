// Smoke test for the livesplit-core wrapper, running the real wasm in Node.
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import type { LayoutStateJson } from 'livesplit-core';
import {
  core,
  createDefaultLayout,
  createTimer,
  initCore,
  parseRun,
  RunParseError,
  saveRunAsLss,
  segmentNames,
} from '../src/lib/timer/core';

const fixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

beforeAll(async () => {
  // In Node, fetch() can't load file: URLs, so hand the wasm bytes to the loader.
  const wasm = await readFile(
    new URL('../vendor/livesplit-core/livesplit_core_bg.wasm', import.meta.url),
  );
  await initCore(wasm);
});

describe('livesplit-core wrapper', () => {
  it('initializes only once', async () => {
    const a = await initCore();
    const b = await initCore();
    expect(a).toBe(b);
    expect(core()).toBe(a);
  });

  it('parses, times, saves and re-parses a run', async () => {
    const { TimerPhase, TimingMethod } = core();
    const run = parseRun(await fixture('real-time.lss'));
    const originalNames = segmentNames(run);
    expect(originalNames.length).toBeGreaterThan(1);

    const timer = createTimer(run); // consumes `run`
    try {
      timer.splitOrStart();
      expect(timer.currentPhase()).toBe(TimerPhase.Running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      timer.splitOrStart();
      expect(timer.currentSplitIndex()).toBe(1);

      // TimeRef is a shared output slot: read the value out immediately.
      const seconds = timer.currentTime().index(TimingMethod.RealTime)?.totalSeconds() ?? 0;
      expect(seconds).toBeGreaterThan(0);

      const lss = saveRunAsLss(timer);
      expect(lss).toContain('<Run');

      const reparsed = parseRun(lss);
      try {
        expect(segmentNames(reparsed)).toEqual(originalNames);
        expect(reparsed.gameName()).toBe(timer.getRun().gameName());
      } finally {
        reparsed[Symbol.dispose]();
      }
    } finally {
      timer[Symbol.dispose]();
    }
  });

  it('builds the default layout and renders its state', async () => {
    const { ImageCache, Language } = core();
    const timer = createTimer(parseRun(await fixture('real-time.lss')));
    const layout = createDefaultLayout();
    const imageCache = ImageCache.new();
    try {
      const state = layout.stateAsJson(imageCache, timer, Language.English) as LayoutStateJson;
      const kinds = state.components.map((c) => Object.keys(c)[0]);
      expect(kinds).toEqual(['Title', 'Splits', 'Timer', 'KeyValue', 'KeyValue', 'KeyValue']);
    } finally {
      imageCache[Symbol.dispose]();
      layout[Symbol.dispose]();
      timer[Symbol.dispose]();
    }
  });

  it('throws a RunParseError for an invalid file', async () => {
    const text = await fixture('invalid.lss');
    expect(() => parseRun(text)).toThrow(RunParseError);
  });
});
