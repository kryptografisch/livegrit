// IndexedDB access via idb. Database `splitter`:
// - `runs`: one record per saved run, the run itself as .lss text (saved by livesplit-core).
// - `settings`: a single record (key `SETTINGS_KEY`), see `settings.ts`.
//
// Schema changes: bump `DB_VERSION` and add a `case` to the switch in `upgrade()`; each
// case migrates from that version to the next and falls through to the following one.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { parseSettings, serializeSettings, type Settings, type StoredSettings } from './settings';

export const DB_NAME = 'splitter';
export const DB_VERSION = 1;
export const SETTINGS_KEY = 'app';

export interface RunRecord {
  id: string;
  /** Display name, e.g. "Game - Category". */
  name: string;
  game: string;
  category: string;
  /** The run as .lss text. */
  lss: string;
  /** `Date.now()` of the last save. */
  updatedAt: number;
  /**
   * Attempt counts at the last save, for the list (so it doesn't parse every .lss). Missing
   * in records saved before they were added: `StorageSync.refreshRuns` fills them in once.
   * Not indexed, so no schema version change was needed.
   */
  attempts?: number;
  completed?: number;
}

interface SplitterSchema extends DBSchema {
  runs: {
    key: string;
    value: RunRecord;
    indexes: { updatedAt: number };
  };
  settings: {
    key: string;
    value: StoredSettings;
  };
}

export interface OpenOptions {
  /** Defaults to `DB_NAME` (tests use their own names). */
  name?: string;
  /** Called when another tab needs a newer schema; this connection is closed first. */
  onVersionChange?: () => void;
}

export class SplitterDb {
  readonly #db: IDBPDatabase<SplitterSchema>;

  private constructor(db: IDBPDatabase<SplitterSchema>) {
    this.#db = db;
  }

  /** Opens (and creates/migrates) the database. Rejects if IndexedDB isn't available. */
  static async open(options: OpenOptions = {}): Promise<SplitterDb> {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available.');
    const db = await openDB<SplitterSchema>(options.name ?? DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        switch (oldVersion) {
          case 0: {
            const runs = database.createObjectStore('runs', { keyPath: 'id' });
            runs.createIndex('updatedAt', 'updatedAt');
            database.createObjectStore('settings');
            break;
          }
          // Next schema: `case 1: …` (and remove the `break` above).
        }
      },
      blocking() {
        // Another tab opens a newer version: step aside so it can upgrade.
        db.close();
        options.onVersionChange?.();
      },
      terminated() {
        console.error('[storage] the database connection was closed by the browser');
      },
    });
    return new SplitterDb(db);
  }

  close(): void {
    this.#db.close();
  }

  getRun(id: string): Promise<RunRecord | undefined> {
    return this.#db.get('runs', id);
  }

  /** All runs, the most recently saved first. */
  async listRuns(): Promise<RunRecord[]> {
    const runs = await this.#db.getAllFromIndex('runs', 'updatedAt');
    return runs.reverse();
  }

  /** Inserts or replaces the run with `record.id`. */
  async putRun(record: RunRecord): Promise<void> {
    await this.#db.put('runs', record);
  }

  deleteRun(id: string): Promise<void> {
    return this.#db.delete('runs', id);
  }

  /** The stored settings, or the defaults if there are none (never throws on bad data). */
  async getSettings(): Promise<Settings> {
    return parseSettings(await this.#db.get('settings', SETTINGS_KEY));
  }

  async putSettings(settings: Settings): Promise<void> {
    await this.#db.put('settings', serializeSettings(settings), SETTINGS_KEY);
  }
}

/** A random id for a new run. `crypto.randomUUID` only exists in secure contexts. */
export function newRunId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** "Game - Category", or whichever is set, or "Untitled splits". */
export function runDisplayName(game: string, category: string): string {
  return [game.trim(), category.trim()].filter((p) => p !== '').join(' - ') || 'Untitled splits';
}
