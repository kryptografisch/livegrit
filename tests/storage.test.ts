// IndexedDB layer (fake-indexeddb) and settings parsing.
import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultBindings, padHold, serializeBindings } from '../src/lib/input/bindings';
import {
  DB_VERSION,
  newRunId,
  runDisplayName,
  SETTINGS_KEY,
  SplitterDb,
  type RunRecord,
} from '../src/lib/storage/db';
import {
  defaultSettings,
  parseSettings,
  serializeSettings,
  SETTINGS_VERSION,
} from '../src/lib/storage/settings';
import { defaultTimerLayout } from '../src/lib/ui/timerLayout';

let counter = 0;
const opened: { db: SplitterDb; name: string }[] = [];

async function freshDb(): Promise<{ db: SplitterDb; name: string }> {
  const name = `test-${++counter}`;
  const db = await SplitterDb.open({ name });
  opened.push({ db, name });
  return { db, name };
}

afterEach(async () => {
  for (const { db, name } of opened.splice(0)) {
    db.close();
    await deleteDB(name);
  }
});

const run = (id: string, updatedAt: number): RunRecord => ({
  id,
  name: `Game ${id} - Any%`,
  game: `Game ${id}`,
  category: 'Any%',
  lss: `<Run id="${id}"/>`,
  updatedAt,
});

describe('SplitterDb', () => {
  it('creates the v1 schema', async () => {
    const { db, name } = await freshDb();
    db.close();
    const raw = await openDB(name);
    try {
      expect(raw.version).toBe(DB_VERSION);
      expect([...raw.objectStoreNames].sort()).toEqual(['runs', 'settings']);
      const tx = raw.transaction('runs');
      expect(tx.store.keyPath).toBe('id');
      expect([...tx.store.indexNames]).toEqual(['updatedAt']);
      await tx.done;
    } finally {
      raw.close();
    }
  });

  it('stores, replaces, lists (newest first) and deletes runs', async () => {
    const { db } = await freshDb();
    expect(await db.listRuns()).toEqual([]);
    await db.putRun(run('a', 100));
    await db.putRun(run('b', 300));
    await db.putRun(run('c', 200));
    expect((await db.listRuns()).map((r) => r.id)).toEqual(['b', 'c', 'a']);

    await db.putRun({ ...run('a', 400), lss: 'updated' });
    expect(await db.getRun('a')).toMatchObject({ lss: 'updated', updatedAt: 400 });
    expect((await db.listRuns()).map((r) => r.id)).toEqual(['a', 'b', 'c']);

    await db.deleteRun('b');
    expect(await db.getRun('b')).toBeUndefined();
    expect((await db.listRuns()).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('returns default settings when none are stored', async () => {
    const { db } = await freshDb();
    expect(await db.getSettings()).toEqual(defaultSettings());
  });

  it('round-trips settings', async () => {
    const { db } = await freshDb();
    const settings = defaultSettings();
    settings.bindings.split.push(padHold(8, 0));
    settings.comparison = 'Best Segments';
    settings.timingMethod = 'GameTime';
    settings.timerLayout = {
      ...settings.timerLayout,
      header: false,
      compactSplits: true,
      splitRows: 4,
      timerScale: 150,
    };
    settings.showButtons = false;
    settings.lastRunId = 'abc';
    settings.persistRequested = true;
    settings.installBarDismissed = true;
    settings.timerWindowSize = { width: 320, height: 480 };
    await db.putSettings(settings);
    expect(await db.getSettings()).toEqual(settings);
  });

  it('updates single settings fields, keeping the others', async () => {
    const { db } = await freshDb();
    await db.updateSettings({ timerLayout: { ...defaultTimerLayout(), splitRows: 4 } });
    await db.updateSettings({ comparison: 'Best Segments', lastRunId: 'r1' });
    await db.updateSettings({ lastRunId: null });
    expect(await db.getSettings()).toEqual({
      ...defaultSettings(),
      timerLayout: { ...defaultTimerLayout(), splitRows: 4 },
      comparison: 'Best Segments',
    });
  });

  it('keeps data when reopened', async () => {
    const { db, name } = await freshDb();
    await db.putRun(run('a', 1));
    db.close();
    const again = await SplitterDb.open({ name });
    opened.push({ db: again, name });
    expect((await again.getRun('a'))?.lss).toBe('<Run id="a"/>');
  });

  it('closes itself when another connection needs a newer version', async () => {
    let notified = 0;
    const name = `test-${++counter}`;
    const db = await SplitterDb.open({ name, onVersionChange: () => notified++ });
    const newer = await openDB(name, DB_VERSION + 1);
    newer.close();
    expect(notified).toBe(1);
    db.close();
    await deleteDB(name);
  });
});

describe('parseSettings', () => {
  it('gives the defaults for missing or broken data', () => {
    expect(parseSettings(undefined)).toEqual(defaultSettings());
    expect(parseSettings('nope')).toEqual(defaultSettings());
    expect(parseSettings([1, 2])).toEqual(defaultSettings());
  });

  it('checks every field on its own', () => {
    const parsed = parseSettings({
      version: SETTINGS_VERSION,
      bindings: { version: 999, bindings: {} },
      comparison: '',
      timingMethod: 'Sundial',
      timerLayout: 'big',
      showButtons: 'yes',
      lastRunId: 42,
      persistRequested: 'true',
      installBarDismissed: 1,
      timerWindowSize: { width: 0, height: 1.5 },
    });
    expect(parsed).toEqual(defaultSettings());

    const partly = parseSettings({
      timerLayout: { info: false, splitRows: 0, timerScale: 'big', inputDevices: 'no' },
      comparison: 'Average Segments',
    });
    expect(partly).toEqual({
      ...defaultSettings(),
      timerLayout: { ...defaultTimerLayout(), info: false, splitRows: 1 },
      comparison: 'Average Segments',
    });
  });

  it('reads the timer window size only when both sides are valid', () => {
    const size = (timerWindowSize: unknown) => parseSettings({ timerWindowSize }).timerWindowSize;
    expect(size({ width: 400, height: 600 })).toEqual({ width: 400, height: 600 });
    expect(size({ width: 400 })).toBeNull();
    expect(size({ width: -1, height: 600 })).toBeNull();
    expect(size('400x600')).toBeNull();
  });

  it('reads what serializeSettings writes', () => {
    const settings = { ...defaultSettings(), timingMethod: 'GameTime' as const, lastRunId: 'x' };
    const stored = serializeSettings(settings);
    expect(stored.version).toBe(SETTINGS_VERSION);
    expect(stored.bindings).toEqual(serializeBindings(defaultBindings()));
    expect(parseSettings(structuredClone(stored))).toEqual(settings);
  });

  it('is stored under one key', () => {
    expect(SETTINGS_KEY).toBe('app');
  });
});

describe('helpers', () => {
  it('newRunId gives distinct ids', () => {
    const ids = new Set(Array.from({ length: 50 }, newRunId));
    expect(ids.size).toBe(50);
  });

  it('runDisplayName joins game and category', () => {
    expect(runDisplayName('Celeste', 'Any%')).toBe('Celeste - Any%');
    expect(runDisplayName(' Celeste ', '')).toBe('Celeste');
    expect(runDisplayName('', '')).toBe('Untitled splits');
  });
});
