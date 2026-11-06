// Timer store + layout view, running the real wasm in Node with a manual ticker.
import { readFile } from 'node:fs/promises';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { LayoutStateJson } from 'livesplit-core';
import { ManualTicker } from '../src/lib/ticker';
import { createDefaultLayout, createTimer, core, initCore, parseRun } from '../src/lib/timer/core';
import { semanticColorVar, toLayoutView } from '../src/lib/timer/layoutView';
import { TimerStore } from '../src/lib/timer/timerStore.svelte';

const fixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  const wasm = await readFile(
    new URL('../vendor/livesplit-core/livesplit_core_bg.wasm', import.meta.url),
  );
  await initCore(wasm);
});

describe('layout view', () => {
  it('maps the default layout state of a fresh run', async () => {
    const { ImageCache, Language } = core();
    const timer = createTimer(parseRun(await fixture('real-time.lss')));
    const layout = createDefaultLayout();
    const imageCache = ImageCache.new();
    try {
      const json = layout.stateAsJson(imageCache, timer, Language.English) as LayoutStateJson;
      const view = toLayoutView(json);
      const run = timer.getRun();
      expect(view.title?.game).toBe(run.gameName());
      expect(view.title?.category).toBe(run.categoryName());
      expect(view.title?.attempts).toBe(run.attemptCount());
      expect(view.splits?.rows.map((r) => r.name)).toEqual(
        Array.from({ length: run.len() }, (_, i) => run.segment(i).name()),
      );
      // Default splits component: delta + split time, left to right.
      expect(view.splits?.columnCount).toBe(2);
      expect(view.splits?.rows.some((r) => r.isCurrent)).toBe(false);
      expect(view.timer?.color).toBe('NotRunning');
      expect(view.info.map((i) => [i.id, i.key])).toEqual([
        ['previousSegment', 'Previous Segment'],
        ['sumOfBest', 'Sum of Best Segments'],
        ['possibleTimeSave', 'Possible Time Save'],
      ]);
    } finally {
      imageCache[Symbol.dispose]();
      layout[Symbol.dispose]();
      timer[Symbol.dispose]();
    }
  });

  it('shows segment groups collapsed into header rows when not running', async () => {
    const { ImageCache, Language } = core();
    const timer = createTimer(parseRun(await fixture('segment-groups.lss')));
    const layout = createDefaultLayout({ visibleRows: 0 });
    const imageCache = ImageCache.new();
    try {
      const json = layout.stateAsJson(imageCache, timer, Language.English) as LayoutStateJson;
      const names = toLayoutView(json).splits?.rows.map((r) => r.name);
      // World 1, World 2, then the ungrouped last segment.
      expect(names?.length).toBe(3);
      expect(names?.slice(0, 2)).toEqual(['World 1', 'World 2']);
    } finally {
      imageCache[Symbol.dispose]();
      layout[Symbol.dispose]();
      timer[Symbol.dispose]();
    }
  });

  it('maps semantic colors to tokens', () => {
    expect(semanticColorVar('AheadGainingTime')).toBe('var(--color-ahead-gaining)');
    expect(semanticColorVar('BehindLosingTime')).toBe('var(--color-behind-losing)');
    expect(semanticColorVar('BestSegment')).toBe('var(--color-best-segment)');
    expect(semanticColorVar('Default')).toBe('var(--color-text)');
  });
});

describe('timer store', () => {
  let ticker: ManualTicker;
  let store: TimerStore;

  beforeEach(async () => {
    ticker = new ManualTicker();
    store = new TimerStore({ ticker });
    await store.init();
    store.loadSplits(await fixture('real-time.lss'));
  });

  afterEach(() => store.destroy());

  it('renders the loaded run before the first frame', () => {
    expect(store.hasRun).toBe(true);
    expect(store.phase).toBe('NotRunning');
    expect(store.view?.timer?.color).toBe('NotRunning');
    expect(ticker.listenerCount).toBe(1);
  });

  it('runs a full attempt with all five actions', async () => {
    const segments = store.timer!.getRun().len();
    // The core counts an attempt when it starts.
    const attemptsBefore = store.timer!.getRun().attemptCount();

    store.splitOrStart();
    expect(store.timer!.getRun().attemptCount()).toBe(attemptsBefore + 1);
    expect(store.phase).toBe('Running');
    await wait(15);
    ticker.tick();
    expect(store.view?.splits?.rows.find((r) => r.isCurrent)?.key).toBe(0);
    expect(store.view?.timer?.time).toBeTruthy();

    store.splitOrStart();
    ticker.tick();
    expect(store.view?.splits?.rows.find((r) => r.isCurrent)?.key).toBe(1);

    store.undo();
    ticker.tick();
    expect(store.view?.splits?.rows.find((r) => r.isCurrent)?.key).toBe(0);

    store.skip();
    ticker.tick();
    expect(store.view?.splits?.rows.find((r) => r.isCurrent)?.key).toBe(1);

    store.togglePause();
    expect(store.phase).toBe('Paused');
    ticker.tick();
    expect(store.view?.timer?.color).toBe('Paused');
    store.togglePause();
    expect(store.phase).toBe('Running');

    for (let i = 1; i < segments; i++) store.splitOrStart();
    expect(store.phase).toBe('Ended');

    let resets = 0;
    store.onReset = () => resets++;
    const historyBefore = store.timer!.getRun().attemptHistoryLen();
    store.reset();
    expect(store.phase).toBe('NotRunning');
    expect(resets).toBe(1);
    // reset(true) stores the finished attempt in the run's history.
    expect(store.timer!.getRun().attemptHistoryLen()).toBe(historyBefore + 1);
    ticker.tick();
    expect(store.view?.splits?.rows.some((r) => r.isCurrent)).toBe(false);
  });

  it('does not call the reset hook when nothing was reset', () => {
    let resets = 0;
    store.onReset = () => resets++;
    store.reset();
    expect(resets).toBe(0);
  });

  it('only re-renders while running or after a change', () => {
    const before = store.view;
    ticker.tick();
    expect(store.view).toBe(before);

    store.splitOrStart();
    ticker.tick();
    const running = store.view;
    expect(running).not.toBe(before);
    ticker.tick();
    expect(store.view).not.toBe(running);
  });

  it('rebuilds the layout when the visible rows change', () => {
    const segments = store.timer!.getRun().len();
    store.visibleRows = 0;
    ticker.tick();
    expect(store.view?.splits?.rows.length).toBe(segments);
    store.visibleRows = 3;
    ticker.tick();
    expect(store.view?.splits?.rows.length).toBe(3);
    // The window follows the current split and keeps the last split visible.
    store.splitOrStart();
    store.splitOrStart();
    store.splitOrStart();
    ticker.tick();
    const rows = store.view?.splits?.rows ?? [];
    expect(rows.some((r) => r.isCurrent && r.key === 2)).toBe(true);
    expect(rows.at(-1)?.key).toBe(segments - 1);
  });

  it('drops the blank filler rows the core adds', () => {
    store.visibleRows = 20;
    ticker.tick();
    expect(store.view?.splits?.rows.length).toBe(store.timer!.getRun().len());
  });

  it('lists the comparisons of the run and switches between them', () => {
    expect(store.comparisons).toContain('Personal Best');
    expect(store.comparisons).toContain('Best Segments');
    expect(store.comparisons).toContain('Goal'); // custom comparison of the fixture
    expect(store.comparison).toBe('Personal Best');

    expect(store.setComparison('Best Segments')).toBe(true);
    expect(store.comparison).toBe('Best Segments');
    expect(store.setComparison('Does Not Exist')).toBe(false);
    expect(store.comparison).toBe('Best Segments');
  });

  it('only offers game time when the run has it', async () => {
    expect(store.hasGameTime).toBe(false);
    store.loadSplits(await fixture('game-time.lss'));
    expect(store.hasGameTime).toBe(true);
    expect(store.timingMethod).toBe('RealTime');

    ticker.tick();
    const realSob = store.view?.info.find((i) => i.key === 'Sum of Best Segments')?.value;
    store.setTimingMethod('GameTime');
    expect(store.timingMethod).toBe('GameTime');
    ticker.tick();
    const gameSob = store.view?.info.find((i) => i.key === 'Sum of Best Segments')?.value;
    expect(gameSob).toBeTruthy();
    expect(gameSob).not.toBe(realSob);

    store.setTimingMethod('RealTime');
    expect(store.timingMethod).toBe('RealTime');
  });

  it('stops ticking and frees everything on destroy', () => {
    store.destroy();
    expect(ticker.listenerCount).toBe(0);
    expect(store.hasRun).toBe(false);
    expect(store.view).toBeNull();
  });
});
