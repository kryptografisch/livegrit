// Golds and the runs: the fastest time of a segment among the runs, the slowest gold the
// core keeps as is, and which golds change when runs are removed. The core raises every
// history time below the gold up to the gold, and lowers a gold above the PB segment time
// to it, so a slower gold would quietly change runs or not stick. Pure: the inputs are read
// from the core beforehand (`attemptHistory`, `segmentHistoryTimes`, `bestTimes`).

import type { AttemptEntry, SegmentHistoryTime } from './core';

export interface GoldOptions {
  /** The fastest time of the segment in a run (not one after a skipped segment). */
  fastest: { ms: number; run: number } | null;
  /** The slowest allowed gold and why; `null` = no limit. */
  limit: { ms: number; reason: 'run' | 'history' | 'pb'; run?: number } | null;
}

/** The segment time of `segment` in the PB (its split minus the previous PB split). */
export function pbSegmentTime(
  pbSplits: readonly (number | null)[],
  segment: number,
): number | null {
  const split = pbSplits[segment] ?? null;
  if (split === null) return null;
  let previous = 0;
  for (let i = segment - 1; i >= 0; i--) {
    const time = pbSplits[i] ?? null;
    if (time !== null) {
      previous = time;
      break;
    }
  }
  return split - previous;
}

/**
 * Options for the gold of `segment`. Runs in `removed` (marked in the edit) don't count:
 * they are gone once the edit is saved.
 */
export function goldOptions(
  segment: number,
  history: readonly AttemptEntry[],
  historyTimes: readonly SegmentHistoryTime[],
  pbSplits: readonly (number | null)[],
  removed: ReadonlySet<number>,
): GoldOptions {
  let fastest: GoldOptions['fastest'] = null;
  for (const attempt of history) {
    if (removed.has(attempt.index)) continue;
    // After a skipped segment the time covers two segments: not a candidate.
    if (segment > 0 && attempt.segments[segment - 1] === null) continue;
    const ms = attempt.segments[segment] ?? null;
    if (ms !== null && (fastest === null || ms < fastest.ms)) fastest = { ms, run: attempt.index };
  }

  let limit: GoldOptions['limit'] = null;
  for (const { index, ms } of historyTimes) {
    if (index >= 1 && removed.has(index)) continue;
    if (limit === null || ms < limit.ms) {
      limit = index >= 1 ? { ms, reason: 'run', run: index } : { ms, reason: 'history' };
    }
  }
  const pb = pbSegmentTime(pbSplits, segment);
  if (pb !== null && (limit === null || pb < limit.ms)) limit = { ms: pb, reason: 'pb' };
  return { fastest, limit };
}

/**
 * The gold segment `segment` can have from the runs left (not in `removed`): their fastest
 * time of it, the PB segment if that is faster. Every run time counts, also one right after
 * a skipped segment: the core raises run times below the gold, so none may be faster.
 * History times that belong to no run (`index` ≤ 0, route changes) don't count; the core
 * raises those instead. `null`: no time left.
 */
export function remainingGold(
  segment: number,
  historyTimes: readonly SegmentHistoryTime[],
  pbSplits: readonly (number | null)[],
  removed: ReadonlySet<number>,
): number | null {
  let best: number | null = null;
  for (const { index, ms } of historyTimes) {
    if (index < 1 || removed.has(index)) continue;
    if (best === null || ms < best) best = ms;
  }
  const pb = pbSegmentTime(pbSplits, segment);
  if (pb !== null && (best === null || pb < best)) best = pb;
  return best;
}

/** The fastest finished run left (not in `removed`), `null` if there is none. */
export function fastestFinishedRun(
  history: readonly AttemptEntry[],
  removed: ReadonlySet<number>,
): AttemptEntry | null {
  let best: AttemptEntry | null = null;
  for (const attempt of history) {
    if (removed.has(attempt.index) || attempt.time === null) continue;
    if (best === null || attempt.time < best.time!) best = attempt;
  }
  return best;
}

/** A gold that changes (segment, old and new ms; `to: null` = none). */
export interface GoldChange {
  segment: number;
  from: number | null;
  to: number | null;
}

/**
 * The golds that change when the attempts in `removed` go away: those a removed run holds
 * (exactly that single segment time) go to `remainingGold`; when no run is left, every
 * gold does (golds that match no run too). `pbSplits`: the PB after the removal (it caps
 * the new golds). `historyTimes[s]`: all history times of segment `s`.
 */
export function goldChanges(
  golds: readonly (number | null)[],
  history: readonly AttemptEntry[],
  historyTimes: readonly (readonly SegmentHistoryTime[])[],
  pbSplits: readonly (number | null)[],
  removed: ReadonlySet<number>,
): GoldChange[] {
  if (removed.size === 0) return [];
  const noneLeft = history.every((attempt) => removed.has(attempt.index));
  const changes: GoldChange[] = [];
  golds.forEach((gold, segment) => {
    if (gold === null) return;
    const held =
      noneLeft ||
      history.some((attempt) => {
        if (!removed.has(attempt.index)) return false;
        if (segment > 0 && attempt.segments[segment - 1] === null) return false;
        return attempt.segments[segment] === gold;
      });
    if (!held) return;
    const to = remainingGold(segment, historyTimes[segment] ?? [], pbSplits, removed);
    if (to !== gold) changes.push({ segment, from: gold, to });
  });
  return changes;
}

/**
 * Golds recalculated from the recorded runs (`remainingGold` for every segment, with the
 * PB `pbSplits`): only those that differ from `golds`.
 */
export function recalculatedGolds(
  golds: readonly (number | null)[],
  historyTimes: readonly (readonly SegmentHistoryTime[])[],
  pbSplits: readonly (number | null)[],
): GoldChange[] {
  const changes: GoldChange[] = [];
  golds.forEach((gold, segment) => {
    const to = remainingGold(segment, historyTimes[segment] ?? [], pbSplits, new Set());
    if (to !== gold) changes.push({ segment, from: gold, to });
  });
  return changes;
}
