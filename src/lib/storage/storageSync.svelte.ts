// Keeps the timer store, the input bindings and the small UI settings in sync with
// IndexedDB:
// - restores the settings and the last active run on start,
// - saves the run's .lss on reset and when an attempt finishes (never per frame), and
//   imported runs as new records,
// - saves the settings whenever the user changes one,
// - manages the saved runs for the Data page (list, open, create, delete, export),
// - asks for persistent storage once, on the first user gesture.
// Storage problems never stop the timer: it keeps working in memory and `error` says why.

import type { InputManager } from '../input/inputManager';
import { attemptStats, createRun, EmptyRunError, parseRun, type AttemptStats } from '../timer/core';
import {
  ATTEMPT_IN_PROGRESS_MESSAGE,
  importErrorMessage,
  lssFileName,
  readSplitsFile,
} from '../timer/lss';
import type { StoreSetting, TimerStore } from '../timer/timerStore.svelte';
import { newRunId, runDisplayName, SplitterDb, type RunRecord } from './db';
import { onFirstUserGesture, persist, persisted } from './persist';
import { defaultSettings, type Settings } from './settings';

/** UI settings outside the timer store (the Timer page's on-screen buttons). */
export interface UiSettings {
  showButtons: boolean;
}

/** How persistent storage is requested; tests pass `null` to skip it. */
export interface PersistRequester {
  persisted(): Promise<boolean | null>;
  persist(): Promise<boolean | null>;
  /** Calls `request` on the first user gesture. */
  onFirstGesture(request: () => void): void;
}

export interface StorageSyncOptions {
  store: TimerStore;
  input: InputManager;
  ui: UiSettings;
  /** Defaults to `SplitterDb.open()`. */
  openDb?: () => Promise<SplitterDb>;
  /** Defaults to `Date.now`. */
  now?: () => number;
  /** Defaults to `navigator.storage` on the first pointer/key press. */
  persistence?: PersistRequester | null;
}

/** A saved run in the list (the record without its .lss text). */
export type RunSummary = Omit<RunRecord, 'lss'>;

/** A read and parsed splits file, waiting for the user's choice (`prepareImport`). */
export interface PreparedImport extends AttemptStats {
  fileName: string;
  bytes: Uint8Array;
  game: string;
  category: string;
  /** Display name, like the list's ("Game - Category"). */
  name: string;
  /** Saved splits with the same game and category, if any. */
  duplicate: RunSummary | null;
}

/** Same game and category, ignoring case and surrounding spaces. */
export function sameSplits(
  a: { game: string; category: string },
  b: { game: string; category: string },
): boolean {
  const key = (s: { game: string; category: string }) =>
    `${s.game.trim().toLowerCase()}\u0000${s.category.trim().toLowerCase()}`;
  return key(a) === key(b);
}

/** A run to download: .lss text and a file name. */
export interface LssFile {
  text: string;
  fileName: string;
}

const browserPersistence: PersistRequester = {
  persisted,
  persist,
  onFirstGesture: (request) => void onFirstUserGesture(request),
};

export class StorageSync {
  /** True once `start()` finished restoring (also when storage isn't available). */
  restored = $state(false);
  /** The last storage problem, for the UI; `null` while everything is fine. */
  error = $state<string | null>(null);
  /** The id of the run in the timer store (its record in the `runs` store). */
  activeRunId = $state<string | null>(null);
  /** Whether runs and settings are saved (the database is open). */
  available = $state(false);
  /** The saved runs, the most recently saved first. Updated after every change. */
  runs = $state.raw<RunSummary[]>([]);
  /** "+ Install" in the bar above the nav was clicked once: the bar never shows again. */
  installBarDismissed = $state(false);

  readonly #store: TimerStore;
  readonly #input: InputManager;
  readonly #ui: UiSettings;
  readonly #openDb: () => Promise<SplitterDb>;
  readonly #now: () => number;
  readonly #persistence: PersistRequester | null;

  #db: SplitterDb | null = null;
  #settings: Settings = defaultSettings();
  #starting: Promise<void> | null = null;
  /** While the stored preferences are applied to a run, store changes aren't saved. */
  #applying = false;

  constructor(options: StorageSyncOptions) {
    this.#store = options.store;
    this.#input = options.input;
    this.#ui = options.ui;
    const onVersionChange = () => {
      this.#db = null;
      this.available = false;
      this.error = 'The app was updated in another tab. Reload this page to keep saving.';
    };
    this.#openDb = options.openDb ?? (() => SplitterDb.open({ onVersionChange }));
    this.#now = options.now ?? Date.now;
    this.#persistence =
      options.persistence === undefined ? browserPersistence : options.persistence;
  }

  /**
   * Loads the core, opens the database, restores the settings and the last run, then
   * starts saving changes. Safe to call more than once. Rejects only if the core fails to
   * load (the Timer page shows that error itself).
   */
  start(): Promise<void> {
    this.#starting ??= this.#start().finally(() => {
      this.restored = true;
    });
    return this.#starting;
  }

  async #start(): Promise<void> {
    await this.#store.init();

    try {
      this.#db = await this.#openDb();
      this.#settings = await this.#db.getSettings();
      this.available = true;
    } catch (error) {
      this.#db = null;
      this.#fail('Saving is not available in this browser', error);
    }

    const settings = this.#settings;
    this.#input.bindings = settings.bindings;
    if (settings.showButtons !== null) this.#ui.showButtons = settings.showButtons;
    // Clicked before the restore finished: keep it dismissed.
    if (this.installBarDismissed) settings.installBarDismissed = true;
    this.installBarDismissed = settings.installBarDismissed;
    this.#applying = true;
    try {
      this.#store.visibleRows = settings.visibleRows;
    } finally {
      this.#applying = false;
    }
    await this.#restoreLastRun();
    await this.refreshRuns();

    this.#store.onReset = () => void this.saveRun();
    this.#store.onAttemptEnded = () => void this.saveRun();
    this.#store.onSettingsChange = (setting) => this.#storeSettingChanged(setting);
    this.#input.onBindingsChange((bindings) => {
      this.#settings.bindings = bindings;
      void this.#saveSettings();
    });

    if (this.#db) this.#requestPersistence();
  }

  async #restoreLastRun(): Promise<void> {
    const id = this.#settings.lastRunId;
    // A run imported while restoring wins.
    if (!id || !this.#db || this.#store.hasRun) return;
    try {
      const record = await this.#db.getRun(id);
      if (!record || this.#store.hasRun) {
        if (!record) {
          this.#settings.lastRunId = null;
          await this.#saveSettings();
        }
        return;
      }
      this.#store.loadSplits(record.lss);
      this.activeRunId = id;
      this.#applyRunPreferences();
    } catch (error) {
      this.#fail('The last splits could not be restored', error);
    }
  }

  /**
   * Imports a splits file as new splits (no duplicate check, see `prepareImport`), which
   * become the loaded ones. Returns `null` on success or a message for the user.
   */
  async importFile(file: Blob & { readonly name?: string }): Promise<string | null> {
    const prepared = await this.prepareImport(file);
    if (typeof prepared === 'string') return prepared;
    return this.commitImport(prepared, 'new');
  }

  /**
   * First half of an import: reads and parses the file and looks for saved splits with the
   * same game and category (`duplicate`, the most recently saved one). Changes nothing, so
   * the user can still cancel. Returns a message instead if it can't be imported (now).
   */
  async prepareImport(file: Blob & { readonly name?: string }): Promise<PreparedImport | string> {
    const fileName = file.name ?? '';
    if (this.#store.attemptInProgress) return ATTEMPT_IN_PROGRESS_MESSAGE;
    let bytes: Uint8Array;
    let info: { game: string; category: string } & AttemptStats;
    try {
      bytes = await readSplitsFile(file);
      const run = parseRun(bytes);
      try {
        if (run.len() === 0) throw new EmptyRunError();
        info = { game: run.gameName(), category: run.categoryName(), ...attemptStats(run) };
      } finally {
        run[Symbol.dispose]();
      }
    } catch (error) {
      return importErrorMessage(error, fileName);
    }
    const duplicate = this.runs.find((saved) => sameSplits(saved, info)) ?? null;
    return { fileName, bytes, name: runDisplayName(info.game, info.category), ...info, duplicate };
  }

  /**
   * Second half of an import: loads the file and saves it, either as new splits (`new`,
   * "keep both") or over `prepared.duplicate` (`replace`: same entry, the file's content).
   * A finished attempt is reset first. Returns `null` on success or a message.
   */
  async commitImport(prepared: PreparedImport, mode: 'new' | 'replace'): Promise<string | null> {
    if (!this.#finishAttempt()) return ATTEMPT_IN_PROGRESS_MESSAGE;
    try {
      this.#store.loadSplits(prepared.bytes);
    } catch (error) {
      return importErrorMessage(error, prepared.fileName);
    }
    this.#applyRunPreferences();
    const target = mode === 'replace' ? prepared.duplicate : null;
    if (!target) {
      await this.#activateNewRun();
      return null;
    }
    this.activeRunId = target.id;
    this.#settings.lastRunId = target.id;
    await Promise.all([this.saveRun(), this.#saveSettings()]);
    return null;
  }

  /**
   * Creates a run without times (game, category, one segment per name), loads it and
   * saves it as a new run. Returns `null` on success or a message for the user.
   */
  async createRun(game: string, category: string, segmentNames: string[]): Promise<string | null> {
    if (segmentNames.length === 0) return 'Enter at least one segment name.';
    if (!this.#finishAttempt()) return ATTEMPT_IN_PROGRESS_MESSAGE;
    try {
      this.#store.loadRun(createRun(game.trim(), category.trim(), segmentNames));
    } catch (error) {
      console.error('[storage] creating a run failed', error);
      const detail = error instanceof Error ? error.message : String(error);
      return `The splits could not be created: ${detail}`;
    }
    this.#applyRunPreferences();
    await this.#activateNewRun();
    return null;
  }

  /** Loads a saved run. Returns `null` on success or a message for the user. */
  async openRun(id: string): Promise<string | null> {
    if (this.#store.attemptInProgress) return ATTEMPT_IN_PROGRESS_MESSAGE;
    if (id === this.activeRunId) return null;
    const db = this.#db;
    if (!db) return 'Saving is not available in this browser.';
    let record: RunRecord | undefined;
    try {
      record = await db.getRun(id);
    } catch (error) {
      this.#fail('The splits could not be read', error);
      return 'The splits could not be read.';
    }
    if (!record) {
      await this.refreshRuns();
      return 'These splits no longer exist.';
    }
    // Checked here: an attempt may have started while the record was read.
    if (!this.#finishAttempt()) return ATTEMPT_IN_PROGRESS_MESSAGE;
    try {
      this.#store.loadSplits(record.lss);
    } catch (error) {
      return importErrorMessage(error, record.name);
    }
    this.#applyRunPreferences();
    this.activeRunId = id;
    this.#settings.lastRunId = id;
    await this.#saveSettings();
    return null;
  }

  /**
   * Deletes a saved run. The active run is unloaded too (refused during an attempt).
   * Returns `null` on success or a message for the user.
   */
  async deleteRun(id: string): Promise<string | null> {
    const active = id === this.activeRunId;
    if (active && this.#store.attemptInProgress) return ATTEMPT_IN_PROGRESS_MESSAGE;
    const db = this.#db;
    if (!db) return 'Saving is not available in this browser.';
    try {
      await db.deleteRun(id);
    } catch (error) {
      this.#fail('The splits could not be deleted', error);
      return 'The splits could not be deleted.';
    }
    if (active && id === this.activeRunId) {
      this.#store.unloadRun();
      this.activeRunId = null;
    }
    if (this.#settings.lastRunId === id) {
      this.#settings.lastRunId = null;
      await this.#saveSettings();
    }
    await this.refreshRuns();
    return null;
  }

  /**
   * A run as .lss for download: the active run from the timer (its current state, like
   * "Export"), any other one from the database. `null` if it doesn't exist.
   */
  async exportRun(id: string): Promise<LssFile | null> {
    if (id === this.activeRunId) return this.exportActiveRun();
    const record = await this.#db?.getRun(id).catch(() => undefined);
    return record
      ? { text: record.lss, fileName: lssFileName(record.game, record.category) }
      : null;
  }

  /** The loaded run as .lss (incl. a running attempt), `null` without a run. */
  exportActiveRun(): LssFile | null {
    const lss = this.#store.exportLss();
    return lss ? { text: lss.text, fileName: lss.fileName } : null;
  }

  /** Reloads `runs` from the database. Never throws. */
  async refreshRuns(): Promise<void> {
    const db = this.#db;
    if (!db) {
      this.runs = [];
      return;
    }
    try {
      const records = await db.listRuns();
      this.runs = records.map(({ lss: _lss, ...summary }) => summary);
      if (records.some((r) => r.attempts === undefined)) await this.#fillAttemptStats(records);
    } catch (error) {
      this.#fail('The saved splits could not be listed', error);
    }
  }

  /**
   * Records saved before the attempt counts existed: parse each once, store its counts
   * (`updatedAt` unchanged, so the order stays) and update the list.
   */
  async #fillAttemptStats(records: RunRecord[]): Promise<void> {
    const db = this.#db;
    if (!db) return;
    const filled = new Map<string, AttemptStats>();
    for (const record of records) {
      if (record.attempts !== undefined) continue;
      let stats: AttemptStats;
      try {
        const run = parseRun(record.lss);
        try {
          stats = attemptStats(run);
        } finally {
          run[Symbol.dispose]();
        }
      } catch {
        continue; // unreadable: shown without counts (opening it reports the error)
      }
      await db.putRun({ ...record, ...stats });
      filled.set(record.id, stats);
    }
    if (filled.size === 0) return;
    this.runs = this.runs.map((run) => ({ ...run, ...filled.get(run.id) }));
  }

  /**
   * Before another run replaces the loaded one: a finished attempt (`Ended`) is reset,
   * which stores it in the history and saves the run (like the user's own reset). Returns
   * false while an attempt is running or paused (nothing is changed then).
   */
  #finishAttempt(): boolean {
    if (this.#store.attemptInProgress) return false;
    if (this.#store.phase === 'Ended') this.#store.reset();
    return true;
  }

  /** The run just loaded into the store becomes a new saved run and the last run. */
  async #activateNewRun(): Promise<void> {
    const id = newRunId();
    this.activeRunId = id;
    this.#settings.lastRunId = id;
    await Promise.all([this.saveRun(), this.#saveSettings()]);
  }

  /**
   * Saves the active run's .lss (incl. the current attempt state). The text is taken
   * right away, so the record matches the moment of the call. Never throws.
   */
  async saveRun(): Promise<void> {
    const id = this.activeRunId;
    const lss = this.#store.exportLss();
    const db = this.#db;
    if (!id || !lss || !db) return;
    try {
      await db.putRun({
        id,
        name: runDisplayName(lss.game, lss.category),
        game: lss.game,
        category: lss.category,
        lss: lss.text,
        updatedAt: this.#now(),
        attempts: lss.attempts,
        completed: lss.completed,
      });
    } catch (error) {
      this.#fail('The splits could not be saved. Export them as .lss to keep them', error);
      return;
    }
    await this.refreshRuns();
  }

  /** Shows or hides the on-screen timer buttons and saves the choice. */
  setShowButtons(show: boolean): void {
    this.#ui.showButtons = show;
    this.#settings.showButtons = show;
    void this.#saveSettings();
  }

  /** Hides the install bar above the nav for good (the Data page keeps its own button). */
  dismissInstallBar(): void {
    if (this.installBarDismissed) return;
    this.installBarDismissed = true;
    this.#settings.installBarDismissed = true;
    void this.#saveSettings();
  }

  /** Dismisses `error`. */
  clearError(): void {
    this.error = null;
  }

  /** The stored comparison and timing method, applied to the run just loaded. */
  #applyRunPreferences(): void {
    const store = this.#store;
    const { comparison, timingMethod } = this.#settings;
    this.#applying = true;
    try {
      if (comparison && store.comparisons.includes(comparison)) store.setComparison(comparison);
      // Game Time only where the run has it (otherwise the timer would show nothing).
      store.setTimingMethod(
        timingMethod === 'GameTime' && store.hasGameTime ? 'GameTime' : 'RealTime',
      );
    } finally {
      this.#applying = false;
    }
  }

  #storeSettingChanged(setting: StoreSetting): void {
    if (this.#applying) return;
    const store = this.#store;
    const settings = this.#settings;
    switch (setting) {
      case 'comparison':
        settings.comparison = store.comparison;
        break;
      case 'timingMethod':
        settings.timingMethod = store.timingMethod;
        break;
      case 'visibleRows':
        settings.visibleRows = store.visibleRows;
        break;
    }
    void this.#saveSettings();
  }

  async #saveSettings(): Promise<void> {
    const db = this.#db;
    if (!db) return;
    try {
      // Serialized synchronously by `putSettings`, so later changes don't leak into it.
      await db.putSettings(this.#settings);
    } catch (error) {
      this.#fail('The settings could not be saved', error);
    }
  }

  /** Asks for persistent storage once ever (Firefox shows a prompt), on a user gesture. */
  #requestPersistence(): void {
    const persistence = this.#persistence;
    if (!persistence || this.#settings.persistRequested) return;
    persistence.onFirstGesture(() => {
      void (async () => {
        if ((await persistence.persisted()) === true) return;
        this.#settings.persistRequested = true;
        await this.#saveSettings();
        await persistence.persist();
      })();
    });
  }

  #fail(message: string, error: unknown): void {
    console.error(`[storage] ${message}`, error);
    const detail = error instanceof Error ? error.message : String(error);
    this.error = `${message}: ${detail}`;
  }
}
