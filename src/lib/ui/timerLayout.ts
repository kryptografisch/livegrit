// What the Timer page shows (Settings → Timer → UI): one record, saved as a whole.
// Nested toggles: a sub option only counts while its area is on. Pure, so it is easy to
// test; `parseTimerLayout` never throws (each field falls back to its default).

export interface TimerLayout {
  /** The game/category area at the top. */
  header: boolean;
  headerGame: boolean;
  headerCategory: boolean;
  /** The attempt counter ("finished/attempts"). */
  headerAttempts: boolean;
  /** Only `splitRows` split rows at once (the core scrolls them); off = all rows. */
  compactSplits: boolean;
  splitRows: number;
  /** The running timer's size in percent of the default. */
  timerScale: number;
  /** The Timer page text size (header, splits, info, buttons) in percent of the default. */
  textScale: number;
  /** The info area below the timer. */
  info: boolean;
  infoPreviousSegment: boolean;
  infoSumOfBest: boolean;
  infoPossibleTimeSave: boolean;
  /** The "Keyboard + Gamepad 1" row (the gear next to it always stays). */
  inputDevices: boolean;
}

export const SPLIT_ROWS_MIN = 1;
export const SPLIT_ROWS_MAX = 99;
export const TIMER_SCALE_MIN = 50;
export const TIMER_SCALE_MAX = 200;
export const TIMER_SCALE_STEP = 10;
export const TEXT_SCALE_MIN = 50;
export const TEXT_SCALE_MAX = 200;
export const TEXT_SCALE_STEP = 10;

export function defaultTimerLayout(): TimerLayout {
  return {
    header: true,
    headerGame: true,
    headerCategory: true,
    headerAttempts: true,
    compactSplits: false,
    splitRows: 10,
    timerScale: 100,
    textScale: 100,
    info: true,
    infoPreviousSegment: true,
    infoSumOfBest: true,
    infoPossibleTimeSave: true,
    inputDevices: true,
  };
}

/** Split rows the core shows at once (0 = all). */
export function visibleSplitRows(layout: TimerLayout): number {
  return layout.compactSplits ? layout.splitRows : 0;
}

/** Whole numbers within `min`..`max` (rounded, clamped); anything else gives `null`. */
export function clampInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const flags = [
  'header',
  'headerGame',
  'headerCategory',
  'headerAttempts',
  'compactSplits',
  'info',
  'infoPreviousSegment',
  'infoSumOfBest',
  'infoPossibleTimeSave',
  'inputDevices',
] as const satisfies readonly (keyof TimerLayout)[];

/** Unreadable fields keep their value from `fallback` (the defaults unless given). */
export function parseTimerLayout(
  data: unknown,
  fallback: TimerLayout = defaultTimerLayout(),
): TimerLayout {
  const out = { ...fallback };
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return out;
  const record = data as Record<string, unknown>;
  for (const key of flags) {
    if (typeof record[key] === 'boolean') out[key] = record[key];
  }
  out.splitRows = clampInt(record.splitRows, SPLIT_ROWS_MIN, SPLIT_ROWS_MAX) ?? out.splitRows;
  out.timerScale = clampInt(record.timerScale, TIMER_SCALE_MIN, TIMER_SCALE_MAX) ?? out.timerScale;
  out.textScale = clampInt(record.textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX) ?? out.textScale;
  return out;
}
