// Keeps the timer store, the input bindings and the small UI settings in sync with
// IndexedDB:
// - restores the settings and the last active run on start,
// - saves the run's .lss on reset and when an attempt finishes (never per frame), and
//   imported runs as new records,
// - saves the settings whenever the user changes one,
// - asks for persistent storage once, on the first user gesture.
// Storage problems never stop the timer: it keeps working in memory and `error` says why.

import type { InputManager } from '../input/inputManager';
import { importSplitsFile, type SplitsTarget } from '../timer/lss';
import type { StoreSetting, TimerStore } from '../timer/timerStore.svelte';
import { newRunId, runDisplayName, SplitterDb } from './db';
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
    } catch (error) {
      this.#db = null;
      this.#fail('Saving is not available in this browser', error);
    }

    const settings = this.#settings;
    this.#input.bindings = settings.bindings;
    if (settings.showButtons !== null) this.#ui.showButtons = settings.showButtons;
    this.#applying = true;
    try {
      this.#store.visibleRows = settings.visibleRows;
    } finally {
      this.#applying = false;
    }
    await this.#restoreLastRun();

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
      this.#fail('The last run could not be restored', error);
    }
  }

  /**
   * Imports a splits file (like `importSplitsFile`) and saves it as a new run, which
   * becomes the active one. Returns `null` on success or a message for the user.
   */
  async importFile(file: Blob & { readonly name?: string }): Promise<string | null> {
    const store = this.#store;
    const target: SplitsTarget = {
      get phase() {
        return store.phase;
      },
      loadSplits: (bytes) => {
        store.loadSplits(bytes);
        this.#applyRunPreferences();
      },
    };
    const message = await importSplitsFile(target, file);
    if (message !== null) return message;
    const id = newRunId();
    this.activeRunId = id;
    this.#settings.lastRunId = id;
    await Promise.all([this.saveRun(), this.#saveSettings()]);
    return null;
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
      });
    } catch (error) {
      this.#fail('The run could not be saved. Export it as .lss to keep it', error);
    }
  }

  /** Shows or hides the on-screen timer buttons and saves the choice. */
  setShowButtons(show: boolean): void {
    this.#ui.showButtons = show;
    this.#settings.showButtons = show;
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
