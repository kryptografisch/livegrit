// Keeps the timer store, the input bindings and the small UI settings in sync with
// IndexedDB:
// - restores the settings and the last active run on start,
// - saves the run's .lss on reset and when an attempt finishes (never per frame), and
//   imported runs as new records,
// - saves the settings whenever the user changes one,
// - manages the saved runs for Settings → Data (list, open, create, delete, export),
// - asks for persistent storage once, on the first user gesture,
// - keeps several windows in step (`WindowLink`): after every save the other windows are
//   told, and re-read the settings and the last run (`syncFromDb`).
// Storage problems never stop the timer: it keeps working in memory and `error` says why.
//
// Several windows: each one has its own timer store and settings copy. Settings are
// written field by field (`updateSettings`), so windows don't overwrite each other. Only
// a Timer window runs attempts; while one runs (or is paused) there, the other windows
// refuse to replace the splits (`attemptInProgress` includes the other windows).

import { serializeBindings } from '../input/bindings';
import type { InputManager } from '../input/inputManager';
import {
  attemptHistory,
  attemptStats,
  bestTimes,
  core,
  createRun,
  EmptyRunError,
  parseRun,
  segmentHistoryTimes,
  splitTimesOf,
  type AttemptEntry,
  type AttemptStats,
  type BestTimes,
  type SegmentHistoryTime,
} from '../timer/core';
import type { RunRef } from 'livesplit-core';
import {
  fastestFinishedRun,
  goldChanges,
  recalculatedGolds,
  type GoldChange,
} from '../timer/goldOptions';
import {
  ATTEMPT_IN_PROGRESS_MESSAGE,
  importErrorMessage,
  lssFileName,
  readSplitsFile,
  removeAttemptFromLss,
} from '../timer/lss';
import { RunDraft } from '../timer/runDraft.svelte';
import type { StoreSetting, TimerStore } from '../timer/timerStore.svelte';
import { parseTimerLayout, visibleSplitRows, type TimerLayout } from '../ui/timerLayout';
import { newRunId, runDisplayName, SplitterDb, type RunRecord } from './db';
import { onFirstUserGesture, persist, persisted } from './persist';
import { defaultSettings, type Settings, type WindowSize } from './settings';

/** The link to the app's other windows (`WindowSync` in the browser). */
export interface WindowLink {
  /** Tells the other windows that settings or saved splits changed. */
  notifyChanged(): void;
  /** `listener` runs when another window changed something. Returns an unsubscribe. */
  onChanged(listener: () => void): () => void;
  /** An attempt is running or paused in another window (reactive). */
  readonly remoteAttemptInProgress: boolean;
  /** A finished attempt waits for its reset in another window (reactive). */
  readonly remoteAttemptEnded: boolean;
}

/** UI settings outside the timer store (the Timer page's on-screen buttons and layout). */
export interface UiSettings {
  showButtons: boolean;
  layout: TimerLayout;
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
  /** The other windows; `null`/missing = this window only. */
  link?: WindowLink | null;
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

/** A PB change: the final time now, the new split times (`null` = no PB) and their run. */
export interface PbChange {
  from: number | null;
  to: (number | null)[] | null;
  run: number | null;
}

/** What changes in one timing method (the core's `TimingMethod`): PB and/or golds. */
export interface BestTimesPlan {
  method: number;
  pb: PbChange | null;
  golds: GoldChange[];
}

export const EDIT_ATTEMPT_MESSAGE = 'reset the current attempt first';
export const EDIT_STALE_MESSAGE =
  'the splits changed in another window meanwhile: cancel and edit again';

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
  /** "+ Install" in the Timer page install bar was clicked once: the bar never shows again. */
  installBarDismissed = $state(false);
  /** The Timer window's size at its last use (`WindowSizeMemory`), `null` if unknown. */
  timerWindowSize = $state.raw<WindowSize | null>(null);

  readonly #store: TimerStore;
  readonly #input: InputManager;
  readonly #ui: UiSettings;
  readonly #openDb: () => Promise<SplitterDb>;
  readonly #now: () => number;
  readonly #persistence: PersistRequester | null;
  readonly #link: WindowLink | null;

  #db: SplitterDb | null = null;
  #settings: Settings = defaultSettings();
  #starting: Promise<void> | null = null;
  /** While stored values are applied (to a run, the bindings), changes aren't saved. */
  #applying = false;
  /** `updatedAt` of the active run's record as this window loaded or saved it. */
  #loadedAt: number | null = null;
  #syncing: Promise<void> | null = null;
  #syncAgain = false;

  constructor(options: StorageSyncOptions) {
    this.#store = options.store;
    this.#input = options.input;
    this.#ui = options.ui;
    this.#link = options.link ?? null;
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
   * True while an attempt is running or paused, here or in another window: the splits
   * can't be replaced then. Reactive.
   */
  get attemptInProgress(): boolean {
    return this.#store.attemptInProgress || (this.#link?.remoteAttemptInProgress ?? false);
  }

  /** A finished attempt waits for its reset, here or in another window. Reactive. */
  get attemptEnded(): boolean {
    return this.#store.phase === 'Ended' || (this.#link?.remoteAttemptEnded ?? false);
  }

  /**
   * Loads the core, opens the database, restores the settings and the last run, then
   * starts saving changes. Safe to call more than once. Rejects only if the core fails to
   * load (the Timer page shows that error itself).
   */
  start(): Promise<void> {
    this.#starting ??= this.#start().finally(() => {
      this.restored = true;
      // Changes another window saved while this one was starting were not applied (the
      // listener comes last, and syncs wait for `restored`): read once more.
      if (this.#link) void this.syncFromDb();
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

    // Clicked before the restore finished: keep it dismissed.
    if (this.installBarDismissed && !this.#settings.installBarDismissed) {
      await this.#saveSettings({ installBarDismissed: true });
    }
    this.#applySettings();
    await this.#restoreLastRun();
    await this.refreshRuns();

    this.#store.onReset = () => void this.saveRun();
    this.#store.onAttemptEnded = () => void this.saveRun();
    this.#store.onSettingsChange = (setting) => this.#storeSettingChanged(setting);
    this.#input.onBindingsChange((bindings) => {
      if (this.#applying) return;
      void this.#saveSettings({ bindings });
    });
    this.#link?.onChanged(() => void this.syncFromDb());

    if (this.#db) this.#requestPersistence();
  }

  /** Applies the settings copy to the input, the UI and the store (nothing is saved). */
  #applySettings(): void {
    const settings = this.#settings;
    this.#applying = true;
    try {
      // Unchanged bindings aren't set again (that would notify the bindings table).
      const same =
        JSON.stringify(serializeBindings(settings.bindings)) ===
        JSON.stringify(serializeBindings(this.#input.bindings));
      if (!same) this.#input.bindings = settings.bindings;
      if (settings.showButtons !== null) this.#ui.showButtons = settings.showButtons;
      this.installBarDismissed = settings.installBarDismissed;
      this.timerWindowSize = settings.timerWindowSize;
      this.#ui.layout = { ...settings.timerLayout };
      this.#store.visibleRows = visibleSplitRows(settings.timerLayout);
    } finally {
      this.#applying = false;
    }
  }

  async #restoreLastRun(): Promise<void> {
    const id = this.#settings.lastRunId;
    // A run imported while restoring wins.
    if (!id || !this.#db || this.#store.hasRun) return;
    try {
      const record = await this.#db.getRun(id);
      if (!record || this.#store.hasRun) {
        if (!record) await this.#saveSettings({ lastRunId: null });
        return;
      }
      this.#store.loadSplits(record.lss);
      this.activeRunId = id;
      this.#loadedAt = record.updatedAt;
      this.#applyRunPreferences();
    } catch (error) {
      this.#fail('The last splits could not be restored', error);
    }
  }

  /**
   * Another window changed settings or saved splits: re-reads the settings and applies
   * them, loads the last run if it changed (never during an attempt here: that run stays)
   * and refreshes the list. Calls while one runs are merged into one more pass.
   */
  syncFromDb(): Promise<void> {
    if (this.#syncing) {
      this.#syncAgain = true;
      return this.#syncing;
    }
    this.#syncing = (async () => {
      do {
        this.#syncAgain = false;
        await this.#sync();
      } while (this.#syncAgain);
    })().finally(() => {
      this.#syncing = null;
    });
    return this.#syncing;
  }

  async #sync(): Promise<void> {
    const db = this.#db;
    // Before the restore finished: `start()` reads everything anyway.
    if (!db || !this.restored) return;
    try {
      this.#settings = await db.getSettings();
    } catch (error) {
      this.#fail('The settings could not be read', error);
      return;
    }
    this.#applySettings();
    await this.#syncActiveRun(db);
    // The comparison or timing method may have changed (also during an attempt).
    if (this.#store.hasRun) this.#applyRunPreferences();
    await this.refreshRuns();
  }

  /** Loads the last run (`lastRunId`) if another window changed or replaced it. */
  async #syncActiveRun(db: SplitterDb): Promise<void> {
    const store = this.#store;
    if (store.attemptInProgress) return;
    const target = this.#settings.lastRunId;
    let record: RunRecord | undefined;
    try {
      record = target ? await db.getRun(target) : undefined;
    } catch (error) {
      this.#fail('The splits could not be read', error);
      return;
    }
    // Checked again: an attempt may have started while the record was read.
    if (store.attemptInProgress) return;
    const upToDate = record
      ? target === this.activeRunId && record.updatedAt === this.#loadedAt
      : this.activeRunId === null || target === this.activeRunId;
    if (upToDate) return;

    if (store.phase === 'Ended' && target !== this.activeRunId) {
      // Like loading other splits here: the finished attempt goes into its run's history
      // first (the reset saves it), unless the other window deleted that run.
      const old = this.activeRunId;
      const exists = old ? (await db.getRun(old).catch(() => undefined)) !== undefined : false;
      if (store.attemptInProgress) return;
      if (!exists) this.activeRunId = null;
      store.reset();
    }
    if (!record || !target) {
      store.unloadRun();
      this.activeRunId = null;
      this.#loadedAt = null;
      return;
    }
    try {
      store.loadSplits(record.lss);
    } catch (error) {
      this.#fail('The splits from the other window could not be loaded', error);
      return;
    }
    this.activeRunId = target;
    this.#loadedAt = record.updatedAt;
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
    if (this.attemptInProgress) return ATTEMPT_IN_PROGRESS_MESSAGE;
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
    await Promise.all([this.saveRun(), this.#saveSettings({ lastRunId: target.id })]);
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
    if (this.attemptInProgress) return ATTEMPT_IN_PROGRESS_MESSAGE;
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
    this.#loadedAt = record.updatedAt;
    await this.#saveSettings({ lastRunId: id });
    return null;
  }

  /**
   * Deletes a saved run. The active run is unloaded too (refused during an attempt).
   * Returns `null` on success or a message for the user.
   */
  async deleteRun(id: string): Promise<string | null> {
    const active = id === this.activeRunId;
    if (active && this.attemptInProgress) return ATTEMPT_IN_PROGRESS_MESSAGE;
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
      this.#loadedAt = null;
    }
    if (this.#settings.lastRunId === id) {
      await this.#saveSettings({ lastRunId: null });
    } else {
      this.#link?.notifyChanged();
    }
    await this.refreshRuns();
    return null;
  }

  /**
   * Starts an edit of the loaded splits (Settings → Splits): a `RunDraft` on a copy of the
   * run, in the current timing method. A finished attempt is reset first (it joins the
   * history); refused while one runs. Returns the draft or a message for the user.
   */
  startEdit(): RunDraft | string {
    if (!this.#finishAttempt()) return EDIT_ATTEMPT_MESSAGE;
    const timer = this.#store.timer;
    if (!timer) return 'no splits are loaded';
    return new RunDraft(
      timer.getRun().clone(),
      timer.currentTimingMethod(),
      this.#store.runRevision,
    );
  }

  /**
   * What removing run `index` does to the PB and the golds, per timing method (only methods
   * with a change). `updatePb`: when the run is the PB, the PB becomes the next fastest
   * finished run (or none); when it is the last run, the PB goes. Golds the run holds go to
   * the best remaining time (all golds for the last run), capped by the PB after the removal.
   */
  removalPlan(index: number, updatePb: boolean): BestTimesPlan[] {
    const timer = this.#store.timer;
    if (!timer) return [];
    const run = timer.getRun();
    const removed = new Set([index]);
    return this.#plans(run, (method, best, history, historyTimes) => {
      const pbTime = best.pb.at(-1) ?? null;
      const attempt = history.find((a) => a.index === index);
      const last = history.every((a) => removed.has(a.index));
      let pb: PbChange | null = null;
      if (updatePb && pbTime !== null && (last || attempt?.time === pbTime)) {
        const next = last ? null : fastestFinishedRun(history, removed);
        pb = {
          from: pbTime,
          to: next ? splitTimesOf(next.segments) : null,
          run: next?.index ?? null,
        };
      }
      const pbAfter = pb ? (pb.to ?? best.pb.map(() => null)) : best.pb;
      return {
        method,
        pb,
        golds: goldChanges(best.golds, history, historyTimes, pbAfter, removed),
      };
    });
  }

  /**
   * Removes run `index` from the loaded splits and saves them, with the PB and gold changes
   * of `removalPlan` as chosen (`updatePb`, `updateGolds`). Refused during an attempt.
   * Returns `null` on success or a message for the user.
   */
  async removeRun(
    index: number,
    options: { updatePb: boolean; updateGolds: boolean },
  ): Promise<string | null> {
    // Starting the edit may reset a finished attempt first: plan after it.
    const draft = this.startEdit();
    if (typeof draft === 'string') return draft;
    try {
      for (const plan of this.removalPlan(index, options.updatePb)) {
        this.#apply(draft, plan, options.updateGolds);
      }
      draft.toggleRemoved(index);
      return await this.saveEdit(draft);
    } finally {
      draft.dispose(); // no-op once saved
    }
  }

  /**
   * The PB and golds recalculated from the recorded runs, per timing method (only methods
   * with a change): the PB becomes the fastest finished run (or none), each gold the
   * fastest time of the segment among the runs (or none).
   */
  recalculationPlan(): BestTimesPlan[] {
    const timer = this.#store.timer;
    if (!timer) return [];
    return this.#plans(timer.getRun(), (method, best, history, historyTimes) => {
      const next = fastestFinishedRun(history, new Set());
      const to = next ? splitTimesOf(next.segments) : null;
      const same = (to ?? best.pb.map(() => null)).every((t, i) => t === (best.pb[i] ?? null));
      const pb: PbChange | null = same
        ? null
        : { from: best.pb.at(-1) ?? null, to, run: next?.index ?? null };
      const golds = recalculatedGolds(best.golds, historyTimes, to ?? best.pb.map(() => null));
      return { method, pb, golds };
    });
  }

  /** Applies `recalculationPlan` and saves. Returns `null` on success or a message. */
  async recalculateBestTimes(): Promise<string | null> {
    const draft = this.startEdit();
    if (typeof draft === 'string') return draft;
    try {
      const plans = this.recalculationPlan();
      if (plans.length === 0) return null;
      for (const plan of plans) this.#apply(draft, plan, true);
      return await this.saveEdit(draft);
    } finally {
      draft.dispose();
    }
  }

  /** Builds one plan per timing method from the run's data; keeps those with a change. */
  #plans(
    run: RunRef,
    plan: (
      method: number,
      best: BestTimes,
      history: AttemptEntry[],
      historyTimes: SegmentHistoryTime[][],
    ) => BestTimesPlan,
  ): BestTimesPlan[] {
    const { TimingMethod } = core();
    const plans: BestTimesPlan[] = [];
    for (const method of [TimingMethod.RealTime, TimingMethod.GameTime]) {
      const best = bestTimes(run, method);
      const historyTimes = best.golds.map((_, s) => segmentHistoryTimes(run, s, method));
      const result = plan(method, best, attemptHistory(run, method), historyTimes);
      if (result.pb || result.golds.length > 0) plans.push(result);
    }
    return plans;
  }

  /** Writes a plan into the draft: the PB first (it caps the golds), then the golds. */
  #apply(draft: RunDraft, plan: BestTimesPlan, golds: boolean): void {
    if (plan.pb) draft.setPb(plan.method, plan.pb.to);
    if (golds) draft.applyGolds(plan.method, plan.golds);
  }

  /**
   * Resets all times of the loaded splits (runs, PB, golds; the attempt count to 0; names,
   * offset and custom comparisons stay) and saves them. Returns `null` or a message.
   */
  async resetAllTimes(): Promise<string | null> {
    const draft = this.startEdit();
    if (typeof draft === 'string') return draft;
    try {
      draft.resetTimes();
      return await this.saveEdit(draft);
    } finally {
      draft.dispose();
    }
  }

  /**
   * Saves an edit: closes the draft, removes the marked runs from the .lss, then loads and
   * saves the result. Refused (the draft stays open) during an
   * attempt or when the loaded run changed since the edit started. Returns `null` on
   * success or a message for the user.
   */
  async saveEdit(draft: RunDraft): Promise<string | null> {
    if (!this.#finishAttempt()) return EDIT_ATTEMPT_MESSAGE;
    if (draft.revision !== this.#store.runRevision) return EDIT_STALE_MESSAGE;
    const removed = [...draft.removed];
    const run = draft.close();
    let text: string;
    try {
      text = run.saveAsLss();
    } finally {
      run[Symbol.dispose]();
    }
    for (const index of removed) text = removeAttemptFromLss(text, index) ?? text;
    try {
      this.#store.loadSplits(text);
    } catch (error) {
      console.error('[storage] saving the edit failed', error);
      return 'the changes could not be saved';
    }
    this.#applyRunPreferences();
    await this.saveRun();
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
    if (this.attemptInProgress) return false;
    if (this.#store.phase === 'Ended') this.#store.reset();
    return true;
  }

  /** The run just loaded into the store becomes a new saved run and the last run. */
  async #activateNewRun(): Promise<void> {
    const id = newRunId();
    this.activeRunId = id;
    await Promise.all([this.saveRun(), this.#saveSettings({ lastRunId: id })]);
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
    const updatedAt = this.#now();
    // Before the write: a sync meanwhile must not take this save for another window's.
    if (id === this.activeRunId) this.#loadedAt = updatedAt;
    try {
      await db.putRun({
        id,
        name: runDisplayName(lss.game, lss.category),
        game: lss.game,
        category: lss.category,
        lss: lss.text,
        updatedAt,
        attempts: lss.attempts,
        completed: lss.completed,
      });
    } catch (error) {
      this.#fail('The splits could not be saved. Export them as .lss to keep them', error);
      return;
    }
    this.#link?.notifyChanged();
    await this.refreshRuns();
  }

  /** Shows or hides the on-screen timer buttons and saves the choice. */
  setShowButtons(show: boolean): void {
    this.#ui.showButtons = show;
    void this.#saveSettings({ showButtons: show });
  }

  /**
   * Changes what the Timer page shows and saves it (out of range numbers are clamped).
   * The split rows go to the timer store (compact splits).
   */
  setTimerLayout(patch: Partial<TimerLayout>): void {
    const layout = parseTimerLayout({ ...this.#ui.layout, ...patch }, this.#ui.layout);
    this.#ui.layout = layout;
    this.#store.visibleRows = visibleSplitRows(layout);
    void this.#saveSettings({ timerLayout: { ...layout } });
  }

  /** Hides the Timer page install bar for good (Settings → Data keeps its own button). */
  dismissInstallBar(): void {
    if (this.installBarDismissed) return;
    this.installBarDismissed = true;
    void this.#saveSettings({ installBarDismissed: true });
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
    switch (setting) {
      case 'comparison':
        void this.#saveSettings({ comparison: store.comparison });
        break;
      case 'timingMethod':
        void this.#saveSettings({ timingMethod: store.timingMethod });
        break;
    }
  }

  /** Remembers the Timer window's size (`WindowSizeMemory`). */
  saveTimerWindowSize(size: WindowSize): void {
    const current = this.timerWindowSize;
    if (current?.width === size.width && current.height === size.height) return;
    this.timerWindowSize = { width: size.width, height: size.height };
    void this.#saveSettings({ timerWindowSize: this.timerWindowSize });
  }

  /**
   * Updates the settings copy and writes only the changed fields, then tells the other
   * windows. Never throws.
   */
  async #saveSettings(patch: Partial<Settings>): Promise<void> {
    this.#settings = { ...this.#settings, ...patch };
    const db = this.#db;
    if (!db) return;
    try {
      await db.updateSettings(patch);
    } catch (error) {
      this.#fail('The settings could not be saved', error);
      return;
    }
    this.#link?.notifyChanged();
  }

  /** Asks for persistent storage once ever (Firefox shows a prompt), on a user gesture. */
  #requestPersistence(): void {
    const persistence = this.#persistence;
    if (!persistence || this.#settings.persistRequested) return;
    persistence.onFirstGesture(() => {
      void (async () => {
        if ((await persistence.persisted()) === true) return;
        await this.#saveSettings({ persistRequested: true });
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
