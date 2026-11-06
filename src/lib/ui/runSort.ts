// Sorting of the runs (attempts) in Settings → Splits: "Latest" = newest first, "Best" =
// fastest full run first (runs without a final time, i.e. resets, last, newest first).

export type RunSort = 'latest' | 'best';

export interface SortableRun {
  /** When the run started (`Date.now()` style). */
  started: number;
  /** The full run time in ms; `null` if it wasn't finished. */
  time: number | null;
}

/** A sorted copy of `runs`. */
export function sortRuns<T extends SortableRun>(runs: readonly T[], sort: RunSort): T[] {
  const latest = (a: T, b: T) => b.started - a.started;
  if (sort === 'latest') return [...runs].sort(latest);
  return [...runs].sort((a, b) => {
    if (a.time === null || b.time === null) {
      if (a.time === b.time) return latest(a, b);
      return a.time === null ? 1 : -1;
    }
    return a.time - b.time || latest(a, b);
  });
}

/** The fastest finished run (the newest one on a tie), `null` if none was finished. */
export function bestRun<T extends SortableRun>(runs: readonly T[]): T | null {
  const best = sortRuns(runs, 'best')[0];
  return best && best.time !== null ? best : null;
}
