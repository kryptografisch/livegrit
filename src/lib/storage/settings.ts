// The persisted app settings (one record in the `settings` store) and their defaults.
// `parseSettings` never throws: stored data is read field by field, anything unreadable
// falls back to its default (so a broken field doesn't lose the others).

import {
  defaultBindings,
  parseBindings,
  serializeBindings,
  type Bindings,
} from '../input/bindings';
import { DEFAULT_VISIBLE_ROWS, type TimingMethodName } from '../timer/timerStore.svelte';

export const SETTINGS_VERSION = 1;

export interface Settings {
  bindings: Bindings;
  /**
   * The preferred comparison (e.g. "Best Segments"), applied to every run that has it.
   * `null` = the run's default (Personal Best).
   */
  comparison: string | null;
  /** The preferred timing method; Game Time is only applied to runs that have Game Time. */
  timingMethod: TimingMethodName;
  /** Split rows shown at once (0 = all). */
  visibleRows: number;
  /** On-screen timer buttons on the Timer page; `null` = by device (touch screens: on). */
  showButtons: boolean | null;
  /** The run open when the app was last used, restored on reload. */
  lastRunId: string | null;
  /** Whether persistent storage was already requested automatically (only asked once). */
  persistRequested: boolean;
  /** The Timer page install bar was used once ("+ Install" clicked): never shown again. */
  installBarDismissed: boolean;
  /**
   * The Timer page's window size (CSS pixels) the last time it was used, so the user can
   * size the window the same again (OBS window capture). `null` = not known yet.
   */
  timerWindowSize: WindowSize | null;
}

export interface WindowSize {
  width: number;
  height: number;
}

export function defaultSettings(): Settings {
  return {
    bindings: defaultBindings(),
    comparison: null,
    timingMethod: 'RealTime',
    visibleRows: DEFAULT_VISIBLE_ROWS,
    showButtons: null,
    lastRunId: null,
    persistRequested: false,
    installBarDismissed: false,
    timerWindowSize: null,
  };
}

/** The shape written to IndexedDB (plain, structured-cloneable). */
export interface StoredSettings {
  version: number;
  bindings: ReturnType<typeof serializeBindings>;
  comparison: string | null;
  timingMethod: TimingMethodName;
  visibleRows: number;
  showButtons: boolean | null;
  lastRunId: string | null;
  persistRequested: boolean;
  installBarDismissed: boolean;
  timerWindowSize: WindowSize | null;
}

export function serializeSettings(settings: Settings): StoredSettings {
  return {
    version: SETTINGS_VERSION,
    bindings: serializeBindings(settings.bindings),
    comparison: settings.comparison,
    timingMethod: settings.timingMethod,
    visibleRows: settings.visibleRows,
    showButtons: settings.showButtons,
    lastRunId: settings.lastRunId,
    persistRequested: settings.persistRequested,
    installBarDismissed: settings.installBarDismissed,
    timerWindowSize: settings.timerWindowSize
      ? { width: settings.timerWindowSize.width, height: settings.timerWindowSize.height }
      : null,
  };
}

/**
 * Reads a stored settings record. Missing or unreadable data gives the defaults; each
 * field is checked on its own. An unknown (newer) version is read the same way: the
 * fields this version knows are still valid.
 */
export function parseSettings(data: unknown): Settings {
  const out = defaultSettings();
  if (!isRecord(data)) return out;
  if ('bindings' in data) out.bindings = parseBindings(data.bindings);
  if (typeof data.comparison === 'string' && data.comparison !== '') {
    out.comparison = data.comparison;
  }
  if (data.timingMethod === 'RealTime' || data.timingMethod === 'GameTime') {
    out.timingMethod = data.timingMethod;
  }
  const rows = data.visibleRows;
  if (typeof rows === 'number' && Number.isInteger(rows) && rows >= 0 && rows <= 999) {
    out.visibleRows = rows;
  }
  if (typeof data.showButtons === 'boolean') out.showButtons = data.showButtons;
  if (typeof data.lastRunId === 'string' && data.lastRunId !== '') {
    out.lastRunId = data.lastRunId;
  }
  if (data.persistRequested === true) out.persistRequested = true;
  if (data.installBarDismissed === true) out.installBarDismissed = true;
  out.timerWindowSize = parseWindowSize(data.timerWindowSize);
  return out;
}

function parseWindowSize(data: unknown): WindowSize | null {
  if (!isRecord(data)) return null;
  const valid = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 100_000;
  return valid(data.width) && valid(data.height)
    ? { width: data.width, height: data.height }
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
