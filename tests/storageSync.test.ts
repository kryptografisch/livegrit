// StorageSync: restore + saving, with the real wasm, a real TimerStore/InputManager and
// fake-indexeddb.
import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { deleteDB } from 'idb';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { padButton, withBinding } from '../src/lib/input/bindings';
import { InputManager } from '../src/lib/input/inputManager';
import { SplitterDb } from '../src/lib/storage/db';
import { StorageSync, type PersistRequester } from '../src/lib/storage/storageSync.svelte';
import { ManualTicker } from '../src/lib/ticker';
import { initCore, parseRun } from '../src/lib/timer/core';
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
});
