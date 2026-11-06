// Turns livesplit-core's layout state JSON into a small view model for the Timer page,
// and maps livesplit-core's semantic colors to our CSS tokens. Pure (no wasm calls), so
// it is easy to test. All times, deltas and colors come from the core as-is.

import type {
  KeyValueComponentStateJson,
  LayoutStateJson,
  SemanticColor,
  SplitsComponentStateJson,
  SplitStateJson,
  TimerComponentStateJson,
  TitleComponentStateJson,
} from 'livesplit-core';

export type { SemanticColor };

export interface TitleView {
  game: string;
  category: string;
  attempts: number | null;
  finishedRuns: number | null;
}

export interface CellView {
  value: string;
  color: SemanticColor;
}

export interface SplitRowView {
  /** Stable row id from the core (segment index, or a reserved value for group headers). */
  key: number;
  name: string;
  /** Left to right (the core lists them right to left). */
  cells: CellView[];
  isCurrent: boolean;
  isIndented: boolean;
  separatorBefore: boolean;
}

export interface SplitsView {
  /** Left to right; `null` when the core shows no labels. */
  columnLabels: string[] | null;
  columnCount: number;
  rows: SplitRowView[];
}

export interface TimerView {
  time: string;
  fraction: string;
  color: SemanticColor;
}

/**
 * The key/value components, in the order `createDefaultLayout` adds them. Their keys can't
 * identify them (the previous segment one turns into "Live Segment" during a run).
 */
export const INFO_IDS = ['previousSegment', 'sumOfBest', 'possibleTimeSave'] as const;
export type InfoId = (typeof INFO_IDS)[number];

export interface InfoView {
  /** Which component it is (by position); `null` for any beyond `INFO_IDS`. */
  id: InfoId | null;
  key: string;
  value: string;
  color: SemanticColor;
}

export interface LayoutView {
  title: TitleView | null;
  splits: SplitsView | null;
  timer: TimerView | null;
  /** Key/value components in layout order (previous segment, sum of best, possible time save). */
  info: InfoView[];
}

const semanticColorTokens: Record<SemanticColor, string> = {
  Default: '--color-text',
  AheadGainingTime: '--color-ahead-gaining',
  AheadLosingTime: '--color-ahead-losing',
  BehindLosingTime: '--color-behind-losing',
  BehindGainingTime: '--color-behind-gaining',
  BestSegment: '--color-best-segment',
  NotRunning: '--color-not-running',
  Paused: '--color-paused',
  PersonalBest: '--color-personal-best',
};

/** CSS value for a semantic color, e.g. `var(--color-ahead-gaining)`. */
export function semanticColorVar(color: SemanticColor): string {
  return `var(${semanticColorTokens[color] ?? semanticColorTokens.Default})`;
}

// The core's abbreviation lists end with the full, unabbreviated value.
const full = (parts: string[]): string => parts[parts.length - 1] ?? '';

function titleView(state: TitleComponentStateJson): TitleView {
  return {
    game: full(state.line1),
    category: full(state.line2),
    attempts: state.attempts,
    finishedRuns: state.finished_runs,
  };
}

// The core pads the list with blank rows up to the visible row count ("fill with blank
// space", on by default and not settable through the bindings) so a fixed-size renderer
// keeps the timer in place. Our layout is flex-based, so drop them. Blank rows have no
// name and no columns; real segments always have columns.
const isBlankRow = (split: SplitStateJson): boolean =>
  split.name === '' && split.columns.length === 0 && !split.is_current_split;

function splitsView(state: SplitsComponentStateJson): SplitsView {
  let columnCount = state.column_labels?.length ?? 0;
  const rows = state.splits
    .filter((split) => !isBlankRow(split))
    .map((split): SplitRowView => {
      columnCount = Math.max(columnCount, split.columns.length);
      return {
        key: split.index,
        name: split.name,
        cells: split.columns.map((c) => ({ value: c.value, color: c.semantic_color })).reverse(),
        isCurrent: split.is_current_split,
        isIndented: split.is_indented,
        separatorBefore: split.show_separator_before,
      };
    });
  return {
    columnLabels: state.column_labels ? [...state.column_labels].reverse() : null,
    columnCount,
    rows,
  };
}

function timerView(state: TimerComponentStateJson): TimerView {
  return { time: state.time, fraction: state.fraction, color: state.semantic_color };
}

function infoView(state: KeyValueComponentStateJson, index: number): InfoView {
  return {
    id: INFO_IDS[index] ?? null,
    key: state.key,
    value: state.value,
    color: state.semantic_color,
  };
}

/** Builds the view model from `layout.updateStateAsJson(...)`. Unknown components are ignored. */
export function toLayoutView(state: LayoutStateJson): LayoutView {
  const view: LayoutView = { title: null, splits: null, timer: null, info: [] };
  for (const component of state.components) {
    if ('Title' in component) view.title ??= titleView(component.Title);
    else if ('Splits' in component) view.splits ??= splitsView(component.Splits);
    else if ('Timer' in component) view.timer ??= timerView(component.Timer);
    else if ('KeyValue' in component)
      view.info.push(infoView(component.KeyValue, view.info.length));
  }
  return view;
}
