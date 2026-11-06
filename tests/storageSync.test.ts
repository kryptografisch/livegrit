// StorageSync: restore + saving, with the real wasm, a real TimerStore/InputManager and
// fake-indexeddb.
import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { deleteDB } from 'idb';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { padButton, withBinding } from '../src/lib/input/bindings';
import { InputManager } from '../src/lib/input/inputManager';
import { SplitterDb } from '../src/lib/storage/db';
import {
  sameSplits,
  StorageSync,
  type PersistRequester,
} from '../src/lib/storage/storageSync.svelte';
import { ImportFlow } from '../src/lib/ui/importFlow.svelte';
import { ManualTicker } from '../src/lib/ticker';
import { initCore, parseRun, segmentNames } from '../src/lib/timer/core';
import { ATTEMPT_IN_PROGRESS_MESSAGE } from '../src/lib/timer/lss';
import { TimerStore } from '../src/lib/timer/timerStore.svelte';

const fixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url));
const file = async (name: string) => new File([await fixture(name)], name);
/** Lets pending IndexedDB writes finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

let wasm: Buffer;
beforeAll(async () => {
  wasm = await readFile(
    new URL('../vendor/livesplit-core/livesplit_core_bg.wasm', import.meta.url),
  );
  await initCore(wasm);
});

let dbName: string;
let counter = 0;
const apps: App[] = [];

beforeEach(() => {
  dbName = `sync-${++counter}`;
});

afterEach(async () => {
  for (const app of apps.splice(0)) {
    app.store.destroy();
    app.db?.close();
  }
  await deleteDB(dbName);
});

interface App {
  store: TimerStore;
  input: InputManager;
  ui: { showButtons: boolean };
  sync: StorageSync;
  db: SplitterDb | null;
  gesture: (() => void) | null;
  persistCalls: number;
}

/** A fresh "page load" on the same database. */
async function startApp(
  options: { persisted?: boolean; failOpen?: boolean; now?: () => number } = {},
): Promise<App> {
  const store = new TimerStore({ ticker: new ManualTicker() });
  await store.init(wasm);
  const input = new InputManager(store);
  const app: App = {
    store,
    input,
    ui: { showButtons: true },
    db: null,
    gesture: null,
    persistCalls: 0,
    sync: null as unknown as StorageSync,
  };
  const persistence: PersistRequester = {
    persisted: () => Promise.resolve(options.persisted ?? false),
    persist: () => {
      app.persistCalls++;
      return Promise.resolve(true);
    },
    onFirstGesture: (request) => (app.gesture = request),
  };
  app.sync = new StorageSync({
    store,
    input,
    ui: app.ui,
    now: options.now,
    persistence,
    openDb: async () => {
      if (options.failOpen) throw new Error('blocked');
      app.db = await SplitterDb.open({ name: dbName });
      return app.db;
    },
  });
  apps.push(app);
  await app.sync.start();
  return app;
}

/** Reads the database directly (a separate connection). */
async function readDb<T>(read: (db: SplitterDb) => Promise<T>): Promise<T> {
  const db = await SplitterDb.open({ name: dbName });
  try {
    return await read(db);
  } finally {
    db.close();
  }
}

describe('StorageSync', () => {
  it('starts empty with the defaults', async () => {
    const app = await startApp();
    expect(app.sync.restored).toBe(true);
    expect(app.sync.error).toBeNull();
    expect(app.store.hasRun).toBe(false);
    expect(app.sync.activeRunId).toBeNull();
    expect(app.ui.showButtons).toBe(true); // device default kept
  });

  it('saves an imported run and restores it on the next start', async () => {
    let time = 1000;
    const app = await startApp({ now: () => time });
    expect(await app.sync.importFile(await file('real-time.lss'))).toBeNull();
    const id = app.sync.activeRunId;
    expect(id).toBeTruthy();
    await settle();

    const runs = await readDb((db) => db.listRuns());
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ id, updatedAt: 1000 });
    expect(runs[0]?.name).toBe(`${runs[0]?.game} - ${runs[0]?.category}`);
    expect(runs[0]?.lss).toContain('<Run');

    time = 2000;
    const again = await startApp();
    expect(again.sync.activeRunId).toBe(id);
    expect(again.store.hasRun).toBe(true);
    expect(again.store.exportLss()?.text).toBe(app.store.exportLss()?.text);
  });

  it('does not import while an attempt is in progress', async () => {
    const app = await startApp();
    await app.sync.importFile(await file('real-time.lss'));
    const id = app.sync.activeRunId;
    app.store.splitOrStart();
    expect(await app.sync.importFile(await file('game-time.lss'))).toMatch(/Reset/);
    expect(app.sync.activeRunId).toBe(id);
  });

  it('saves the run on reset and when an attempt finishes, not on every split', async () => {
    let time = 1;
    const app = await startApp({ now: () => time });
    await app.sync.importFile(await file('new-run.lss'));
    const id = app.sync.activeRunId!;
    await settle();
    const saved = () => readDb((db) => db.getRun(id));
    const historyOf = (lss: string | undefined) => {
      const run = parseRun(lss ?? '');
      try {
        return run.attemptHistoryLen();
      } finally {
        run[Symbol.dispose]();
      }
    };
    expect(historyOf((await saved())?.lss)).toBe(0);

    time = 2;
    app.store.splitOrStart(); // start
    app.store.splitOrStart(); // split 1
    await settle();
    expect((await saved())?.updatedAt).toBe(1);

    app.store.splitOrStart();
    app.store.splitOrStart(); // last split: Ended
    expect(app.store.phase).toBe('Ended');
    await settle();
    const ended = await saved();
    expect(ended?.updatedAt).toBe(2);
    // The finished attempt is already in the saved history (as LiveSplit saves it).
    expect(historyOf(ended?.lss)).toBe(1);

    time = 3;
    app.store.reset();
    await settle();
    const reset = await saved();
    expect(reset?.updatedAt).toBe(3);
    expect(historyOf(reset?.lss)).toBe(1);
  });

  it('saves and restores bindings, visible rows and the buttons toggle', async () => {
    const app = await startApp();
    const bindings = withBinding(app.input.bindings, 'split', padButton(0)).bindings;
    app.input.bindings = bindings;
    app.store.visibleRows = 4;
    app.sync.setShowButtons(false);
    await settle();

    const again = await startApp();
    expect(again.input.bindings).toEqual(bindings);
    expect(again.store.visibleRows).toBe(4);
    expect(again.ui.showButtons).toBe(false);
  });

  it('applies the stored comparison and timing method to restored and imported runs', async () => {
    const app = await startApp();
    await app.sync.importFile(await file('game-time.lss'));
    expect(app.store.setComparison('Best Segments')).toBe(true);
    app.store.setTimingMethod('GameTime');
    await settle();

    const again = await startApp();
    expect(again.store.comparison).toBe('Best Segments');
    expect(again.store.timingMethod).toBe('GameTime');

    // A run without Game Time shows Real Time, but the preference stays.
    expect(await again.sync.importFile(await file('real-time.lss'))).toBeNull();
    expect(again.store.timingMethod).toBe('RealTime');
    expect(again.store.comparison).toBe('Best Segments');
    await settle();
    const settings = await readDb((db) => db.getSettings());
    expect(settings.timingMethod).toBe('GameTime');
    expect(settings.comparison).toBe('Best Segments');
    expect(settings.lastRunId).toBe(again.sync.activeRunId);
  });

  it('forgets a last run that no longer exists', async () => {
    const app = await startApp();
    await app.sync.importFile(await file('new-run.lss'));
    const id = app.sync.activeRunId!;
    await settle();
    await readDb((db) => db.deleteRun(id));

    const again = await startApp();
    expect(again.store.hasRun).toBe(false);
    expect(again.sync.error).toBeNull();
    await settle();
    expect((await readDb((db) => db.getSettings())).lastRunId).toBeNull();
  });

  it('reports a run that cannot be restored and keeps working', async () => {
    const app = await startApp();
    await app.sync.importFile(await file('new-run.lss'));
    const id = app.sync.activeRunId!;
    await settle();
    await readDb(async (db) => db.putRun({ ...(await db.getRun(id))!, lss: 'garbage' }));

    const again = await startApp();
    expect(again.store.hasRun).toBe(false);
    expect(again.sync.error).toMatch(/could not be restored/);
    expect(await again.sync.importFile(await file('real-time.lss'))).toBeNull();
  });

  it('keeps the timer working in memory when the database cannot be opened', async () => {
    const app = await startApp({ failOpen: true });
    expect(app.sync.restored).toBe(true);
    expect(app.sync.error).toMatch(/not available/);
    expect(await app.sync.importFile(await file('new-run.lss'))).toBeNull();
    expect(app.store.hasRun).toBe(true);
    app.store.splitOrStart();
    app.store.reset();
    expect(app.gesture).toBeNull(); // nothing to persist
  });

  it('requests persistent storage once, on the first gesture', async () => {
    const app = await startApp();
    expect(app.persistCalls).toBe(0);
    app.gesture?.();
    await settle();
    expect(app.persistCalls).toBe(1);
    expect((await readDb((db) => db.getSettings())).persistRequested).toBe(true);

    const again = await startApp();
    expect(again.gesture).toBeNull();
  });

  it('does not request persistence when it is already granted', async () => {
    const app = await startApp({ persisted: true });
    app.gesture?.();
    await settle();
    expect(app.persistCalls).toBe(0);
  });

  describe('run management', () => {
    it('lists saved runs, newest first, without their .lss', async () => {
      let time = 10;
      const app = await startApp({ now: () => time });
      expect(app.sync.runs).toEqual([]);
      expect(app.sync.available).toBe(true);
      await app.sync.importFile(await file('real-time.lss'));
      const first = app.sync.activeRunId;
      time = 20;
      await app.sync.importFile(await file('game-time.lss'));
      const second = app.sync.activeRunId;
      expect(app.sync.runs.map((r) => r.id)).toEqual([second, first]);
      expect(app.sync.runs[0]).not.toHaveProperty('lss');
      expect(app.sync.runs[0]?.updatedAt).toBe(20);

      const again = await startApp();
      expect(again.sync.runs.map((r) => r.id)).toEqual([second, first]);
    });

    it('opens a saved run and remembers it as the last run', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const first = app.sync.activeRunId!;
      const firstLss = app.store.exportLss()?.text;
      await app.sync.importFile(await file('game-time.lss'));

      expect(await app.sync.openRun(first)).toBeNull();
      expect(app.sync.activeRunId).toBe(first);
      expect(app.store.exportLss()?.text).toBe(firstLss);
      await settle();
      expect((await readDb((db) => db.getSettings())).lastRunId).toBe(first);
    });

    it('refuses to open another run during an attempt', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const first = app.sync.activeRunId!;
      await app.sync.importFile(await file('game-time.lss'));
      const second = app.sync.activeRunId;
      app.store.splitOrStart();
      expect(await app.sync.openRun(first)).toBe(ATTEMPT_IN_PROGRESS_MESSAGE);
      expect(app.sync.activeRunId).toBe(second);
    });

    it('treats a finished attempt as done: resets (and saves) it, then opens, imports or creates', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('new-run.lss'));
      const first = app.sync.activeRunId!;
      await app.sync.importFile(await file('real-time.lss'));
      const second = app.sync.activeRunId!;
      const finish = () => {
        while (app.store.phase !== 'Ended') app.store.splitOrStart();
        expect(app.store.attemptInProgress).toBe(false);
      };
      const historyOf = async (id: string) => {
        const run = parseRun((await readDb((db) => db.getRun(id)))?.lss ?? '');
        try {
          return run.attemptHistoryLen();
        } finally {
          run[Symbol.dispose]();
        }
      };
      const before = await historyOf(second);

      finish();
      expect(await app.sync.openRun(first)).toBeNull();
      expect(app.sync.activeRunId).toBe(first);
      expect(app.store.phase).toBe('NotRunning');
      await settle();
      expect(await historyOf(second)).toBe(before + 1);

      finish();
      expect(await app.sync.importFile(await file('game-time.lss'))).toBeNull();
      finish();
      expect(await app.sync.createRun('Game', '', ['A'])).toBeNull();
      await settle();
      expect(await historyOf(first)).toBe(1);
      expect(app.sync.runs).toHaveLength(4);
    });

    it('deletes the current run after a finished attempt', async () => {
      const app = await startApp();
      await app.sync.createRun('Game', '', ['A']);
      app.store.splitOrStart();
      app.store.splitOrStart();
      expect(app.store.phase).toBe('Ended');
      expect(await app.sync.deleteRun(app.sync.activeRunId!)).toBeNull();
      expect(app.store.hasRun).toBe(false);
      await settle();
      expect(await readDb((db) => db.listRuns())).toEqual([]);
    });

    it('reports a missing run when opening it', async () => {
      const app = await startApp();
      expect(await app.sync.openRun('nope')).toMatch(/no longer exist/);
    });

    it('deletes another run and keeps the current one', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const first = app.sync.activeRunId!;
      await app.sync.importFile(await file('game-time.lss'));
      const second = app.sync.activeRunId;
      expect(await app.sync.deleteRun(first)).toBeNull();
      expect(app.sync.runs.map((r) => r.id)).toEqual([second]);
      expect(app.sync.activeRunId).toBe(second);
      expect(app.store.hasRun).toBe(true);
      expect(await readDb((db) => db.getRun(first))).toBeUndefined();
    });

    it('deletes the current run: unloads it and forgets it as the last run', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const id = app.sync.activeRunId!;
      expect(await app.sync.deleteRun(id)).toBeNull();
      expect(app.store.hasRun).toBe(false);
      expect(app.store.view).toBeNull();
      expect(app.sync.activeRunId).toBeNull();
      expect(app.sync.runs).toEqual([]);
      await settle();
      expect((await readDb((db) => db.getSettings())).lastRunId).toBeNull();
      // A reset without a run saves nothing (and doesn't throw).
      app.store.reset();
    });

    it('refuses to delete the current run during an attempt', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const id = app.sync.activeRunId!;
      app.store.splitOrStart();
      expect(await app.sync.deleteRun(id)).toBe(ATTEMPT_IN_PROGRESS_MESSAGE);
      expect(app.sync.runs).toHaveLength(1);
    });

    it('creates an empty run, loads and saves it', async () => {
      const app = await startApp();
      expect(await app.sync.createRun(' My Game ', 'Any%', ['One', 'Two', 'Three'])).toBeNull();
      expect(app.store.hasRun).toBe(true);
      const id = app.sync.activeRunId!;
      expect(app.sync.runs).toMatchObject([{ id, name: 'My Game - Any%', game: 'My Game' }]);
      const record = await readDb((db) => db.getRun(id));
      const run = parseRun(record?.lss ?? '');
      try {
        expect(segmentNames(run)).toEqual(['One', 'Two', 'Three']);
      } finally {
        run[Symbol.dispose]();
      }
      await settle();
      expect((await readDb((db) => db.getSettings())).lastRunId).toBe(id);
    });

    it('refuses an empty run without splits or during an attempt', async () => {
      const app = await startApp();
      expect(await app.sync.createRun('Game', '', [])).toMatch(/at least one/);
      expect(app.store.hasRun).toBe(false);
      await app.sync.createRun('Game', '', ['A']);
      app.store.splitOrStart();
      expect(await app.sync.createRun('Other', '', ['B'])).toBe(ATTEMPT_IN_PROGRESS_MESSAGE);
      expect(app.sync.runs).toHaveLength(1);
    });

    it('exports the current run from the timer and others from the database', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const first = app.sync.activeRunId!;
      const firstLss = app.store.exportLss()!;
      await app.sync.importFile(await file('game-time.lss'));
      const second = app.sync.activeRunId!;

      expect(await app.sync.exportRun(first)).toEqual({
        text: firstLss.text,
        fileName: firstLss.fileName,
      });
      app.store.splitOrStart(); // the current state, incl. the running attempt
      expect((await app.sync.exportRun(second))?.text).toBe(app.store.exportLss()?.text);
      expect(app.sync.exportActiveRun()?.text).toBe(app.store.exportLss()?.text);
      expect(await app.sync.exportRun('nope')).toBeNull();
    });

    it('has no saved runs without a database, but still creates runs in memory', async () => {
      const app = await startApp({ failOpen: true });
      expect(app.sync.available).toBe(false);
      expect(await app.sync.createRun('Game', '', ['A'])).toBeNull();
      expect(app.store.hasRun).toBe(true);
      expect(app.sync.runs).toEqual([]);
      expect(await app.sync.openRun('x')).toMatch(/not available/);
    });

    it('stores the attempt counts with every save', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('new-run.lss'));
      const stats = () => {
        const { attempts, completed } = app.sync.runs[0]!;
        return { attempts, completed };
      };
      expect(stats()).toEqual({ attempts: 0, completed: 0 });

      while (app.store.phase !== 'Ended') app.store.splitOrStart();
      await settle();
      expect(stats()).toEqual({ attempts: 1, completed: 1 }); // finished, not reset yet

      app.store.reset();
      await settle();
      expect(stats()).toEqual({ attempts: 1, completed: 1 });

      app.store.splitOrStart();
      app.store.splitOrStart();
      app.store.reset(); // reset before the end
      await settle();
      expect(stats()).toEqual({ attempts: 2, completed: 1 });
      expect(await readDb((db) => db.getRun(app.sync.activeRunId!))).toMatchObject({
        attempts: 2,
        completed: 1,
      });
    });

    it('fills in the counts of records saved without them, keeping the order', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('new-run.lss'));
      while (app.store.phase !== 'Ended') app.store.splitOrStart();
      app.store.reset();
      await settle();
      const id = app.sync.activeRunId!;
      const { attempts: _a, completed: _c, ...old } = (await readDb((db) => db.getRun(id)))!;
      await readDb((db) => db.putRun(old));

      const again = await startApp();
      expect(again.sync.runs[0]).toMatchObject({ id, attempts: 1, completed: 1 });
      expect(await readDb((db) => db.getRun(id))).toMatchObject({
        attempts: 1,
        completed: 1,
        updatedAt: old.updatedAt,
      });
    });
  });

  describe('import with duplicate check', () => {
    /** The same file under another name, with the game in other case and extra spaces. */
    const renamed = async (name: string, newName: string, edit: (text: string) => string) =>
      new File([edit((await fixture(name)).toString('utf8'))], newName);

    it('matches game and category ignoring case and spaces', () => {
      const a = { game: 'Mario Kart 8', category: '150cc' };
      expect(sameSplits(a, { game: ' mario kart 8 ', category: '150CC' })).toBe(true);
      expect(sameSplits(a, { game: 'Mario Kart 8', category: '200cc' })).toBe(false);
      expect(sameSplits({ game: '', category: '' }, { game: ' ', category: '' })).toBe(true);
    });

    it('prepares without changing anything and finds the duplicate', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const saved = app.sync.runs[0]!;
      await app.sync.createRun('Other', '', ['A']);
      const loaded = app.sync.activeRunId;

      const prepared = await app.sync.prepareImport(
        await renamed('real-time.lss', 'copy.lss', (text) =>
          text.replace(
            `<GameName>${saved.game}</GameName>`,
            `<GameName> ${saved.game.toUpperCase()} </GameName>`,
          ),
        ),
      );
      if (typeof prepared === 'string') throw new Error(prepared);
      expect(prepared.duplicate?.id).toBe(saved.id);
      expect(prepared.fileName).toBe('copy.lss');
      expect(app.sync.activeRunId).toBe(loaded);
      expect(app.sync.runs).toHaveLength(2);

      const fresh = await app.sync.prepareImport(await file('game-time.lss'));
      expect(typeof fresh !== 'string' && fresh.duplicate).toBeNull();
    });

    it('replaces the saved entry with the file, or keeps both', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('new-run.lss'));
      const id = app.sync.activeRunId!;
      while (app.store.phase !== 'Ended') app.store.splitOrStart();
      app.store.reset();
      await app.sync.createRun('Other', '', ['A']);
      await settle();
      expect(app.sync.runs.find((r) => r.id === id)?.attempts).toBe(1);

      // The original file (0 runs) over the saved splits (1 run).
      const replace = await app.sync.prepareImport(await file('new-run.lss'));
      if (typeof replace === 'string') throw new Error(replace);
      expect(replace).toMatchObject({ attempts: 0, duplicate: { id, attempts: 1 } });
      expect(await app.sync.commitImport(replace, 'replace')).toBeNull();
      await settle();
      expect(app.sync.activeRunId).toBe(id);
      expect(app.sync.runs).toHaveLength(2);
      expect(app.sync.runs.find((r) => r.id === id)?.attempts).toBe(0);
      expect((await readDb((db) => db.getSettings())).lastRunId).toBe(id);

      const both = await app.sync.prepareImport(await file('new-run.lss'));
      if (typeof both === 'string') throw new Error(both);
      expect(await app.sync.commitImport(both, 'new')).toBeNull();
      expect(app.sync.runs).toHaveLength(3);
      expect(app.sync.activeRunId).not.toBe(id);
    });

    it('refuses during an attempt, before and after preparing', async () => {
      const app = await startApp();
      await app.sync.importFile(await file('real-time.lss'));
      const prepared = await app.sync.prepareImport(await file('real-time.lss'));
      if (typeof prepared === 'string') throw new Error(prepared);
      app.store.splitOrStart();
      expect(await app.sync.prepareImport(await file('real-time.lss'))).toBe(
        ATTEMPT_IN_PROGRESS_MESSAGE,
      );
      expect(await app.sync.commitImport(prepared, 'replace')).toBe(ATTEMPT_IN_PROGRESS_MESSAGE);
      expect(app.store.phase).toBe('Running');
    });

    it('reports unreadable files when preparing', async () => {
      const app = await startApp();
      expect(await app.sync.prepareImport(await file('invalid.lss'))).toMatch(
        /could not be read as a splits file/,
      );
    });

    it('ImportFlow imports right away without a duplicate, else asks', async () => {
      const app = await startApp();
      const flow = new ImportFlow(app.sync);
      await flow.start(await file('real-time.lss'));
      expect(flow.pending).toBeNull();
      expect(flow.error).toBeNull();
      expect(app.sync.runs).toHaveLength(1);
      const id = app.sync.activeRunId;

      await flow.start(await file('real-time.lss'));
      expect(flow.pending?.duplicate?.id).toBe(id);
      await flow.choose('cancel');
      expect(flow.pending).toBeNull();
      expect(app.sync.runs).toHaveLength(1);

      await flow.start(await file('real-time.lss'));
      await flow.choose('new');
      expect(app.sync.runs).toHaveLength(2);

      await flow.start(await file('real-time.lss'));
      await flow.choose('replace');
      expect(flow.error).toBeNull();
      expect(app.sync.runs).toHaveLength(2);

      await flow.start(await file('invalid.lss'));
      expect(flow.error).toMatch(/could not be read/);
    });
  });
});
