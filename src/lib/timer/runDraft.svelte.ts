// An edit of the loaded splits in Settings → Splits: livesplit-core's RunEditor on a copy
// of the run, so the timer isn't touched until the edit is saved (`StorageSync.saveEdit`).
// Edited here: game, category and offset; the PB can be cleared and all times reset. Runs
// (attempts) are only marked for removal: the core can't remove one, so that happens on the
// saved .lss (`removeAttemptFromLss`). `StorageSync.removeRun` can also clear the PB and
// reset the golds the run holds (`goldChanges`, written with `applyGolds`).

import { SvelteSet } from 'svelte/reactivity';
import type { ImageCache, Run, RunEditor, RunEditorStateJson } from 'livesplit-core';
import { core, coreTimeText } from './core';
import type { GoldChange } from './goldOptions';

export class RunDraft {
  /** The editor's state (names, offset, segment rows); replaced after every change. */
  state = $state.raw<RunEditorStateJson>(null as unknown as RunEditorStateJson);
  /** Attempt ids marked for removal. */
  readonly removed = new SvelteSet<number>();
  /** Something was edited (removals count too). */
  changed = $state(false);
  /** `TimerStore.runRevision` of the run this draft is a copy of. */
  readonly revision: number;

  #editor: RunEditor | null;
  #images: ImageCache | null;

  /**
   * **Consumes `run`** (a copy of the loaded run). `timingMethod`: the core's
   * `TimingMethod` the editor shows and edits. Throws for a run without segments.
   */
  constructor(run: Run, timingMethod: number, revision: number) {
    const { ImageCache, RunEditor } = core();
    const editor = RunEditor.new(run); // consumes `run`, also when it returns null
    if (!editor) throw new Error('The run has no segments.');
    this.#editor = editor;
    this.#images = ImageCache.new();
    this.revision = revision;
    editor.selectTimingMethod(timingMethod);
    this.#refresh();
  }

  get open(): boolean {
    return this.#editor !== null;
  }

  setGame(name: string): void {
    this.#edit((e) => e.setGameName(name.trim()));
  }

  setCategory(name: string): void {
    this.#edit((e) => e.setCategoryName(name.trim()));
  }

  /** Parses and sets the offset ("-5.5", "1:00"); false (nothing changes) if unreadable. */
  setOffset(text: string): boolean {
    return this.#edit((e) => e.parseAndSetOffset(text.trim() || '0', core().Language.English));
  }

  /**
   * Replaces the PB split times in `timingMethod` (the core's `TimingMethod`) with `splits`
   * (ms per segment, `null` = no time there); `null` clears the PB. Each change runs the
   * core's fixing, which lowers a gold above its PB segment: so the PB is cleared first and
   * then set from the first split on (every step is a correct start of the new PB).
   */
  setPb(timingMethod: number, splits: readonly (number | null)[] | null): void {
    const { Language, TimingMethod } = core();
    const segments = this.#segmentCount();
    this.#edit((e) => {
      const shown = this.state.timing_method;
      e.selectTimingMethod(timingMethod);
      for (let i = 0; i < segments; i++) {
        e.selectOnly(i);
        e.activeParseAndSetSplitTime('', Language.English);
      }
      for (let i = 0; splits && i < segments; i++) {
        const time = splits[i] ?? null;
        if (time === null) continue;
        e.selectOnly(i);
        e.activeParseAndSetSplitTime(coreTimeText(time), Language.English);
      }
      e.selectTimingMethod(TimingMethod[shown]);
    });
  }

  /** Clears the PB split times in both timing methods (runs and golds stay). */
  clearPb(): void {
    const { TimingMethod } = core();
    this.setPb(TimingMethod.RealTime, null);
    this.setPb(TimingMethod.GameTime, null);
  }

  /**
   * Resets all times: the runs (history), the PB split times and the golds, in both timing
   * methods, and the attempt count to 0. Names, offset and custom comparisons stay. The
   * history goes first (the core empties a segment's history when its gold is cleared),
   * then the PB (the core lowers a gold to its PB segment), then the golds.
   */
  resetTimes(): void {
    const { Language, TimingMethod } = core();
    const segments = this.#segmentCount();
    this.#edit((e) => e.clearHistory());
    this.clearPb();
    this.#edit((e) => {
      const shown = this.state.timing_method;
      for (const method of [TimingMethod.RealTime, TimingMethod.GameTime]) {
        e.selectTimingMethod(method);
        for (let i = 0; i < segments; i++) {
          e.selectOnly(i);
          e.activeParseAndSetBestSegmentTime('', Language.English);
        }
      }
      e.parseAndSetAttemptCount('0');
      e.selectTimingMethod(TimingMethod[shown]);
    });
    this.removed.clear();
  }

  /** Segment rows only (group header rows aren't segments; `selectOnly` takes segments). */
  #segmentCount(): number {
    return this.state.rows.filter((row) => row.kind === 'Segment').length;
  }

  toggleRemoved(index: number): void {
    if (this.removed.has(index)) this.removed.delete(index);
    else this.removed.add(index);
    this.changed = true;
  }

  /**
   * Writes new golds (`goldChanges`) in `timingMethod` (the core's `TimingMethod`); `null`
   * clears one. Used on save, for the golds that removed runs held.
   */
  applyGolds(timingMethod: number, changes: readonly GoldChange[]): void {
    if (changes.length === 0) return;
    const { Language, TimingMethod } = core();
    const shown = this.state.timing_method;
    this.#edit((e) => {
      e.selectTimingMethod(timingMethod);
      for (const { segment, to } of changes) {
        e.selectOnly(segment);
        e.activeParseAndSetBestSegmentTime(coreTimeText(to), Language.English);
      }
      e.selectTimingMethod(TimingMethod[shown]);
    });
  }

  /** Ends the edit and returns the edited run (owned: hand it on or dispose it). */
  close(): Run {
    const editor = this.#require();
    this.#editor = null;
    this.#disposeImages();
    return editor.close();
  }

  /** Throws the edit away (Cancel). Safe to call more than once. */
  dispose(): void {
    const editor = this.#editor;
    this.#editor = null;
    this.#disposeImages();
    if (editor) editor.close()[Symbol.dispose]();
  }

  /** Runs an editor call; a `false` result (the core refused) changes nothing. */
  #edit(action: (editor: RunEditor) => boolean | void): boolean {
    const ok = action(this.#require()) !== false;
    if (ok) {
      this.changed = true;
      this.#refresh();
    }
    return ok;
  }

  #refresh(): void {
    const editor = this.#require();
    this.state = editor.stateAsJson(this.#images!, core().Language.English) as RunEditorStateJson;
  }

  #require(): RunEditor {
    if (!this.#editor) throw new Error('The edit is closed.');
    return this.#editor;
  }

  #disposeImages(): void {
    this.#images?.[Symbol.dispose]();
    this.#images = null;
  }
}
