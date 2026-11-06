import { describe, expect, it } from 'vitest';
import { bestRun, sortRuns } from '../src/lib/ui/runSort';

const runs = [
  { id: 'a', started: 1, time: 3000 },
  { id: 'b', started: 2, time: null },
  { id: 'c', started: 3, time: 2000 },
  { id: 'd', started: 4, time: null },
  { id: 'e', started: 5, time: 3000 },
];

const ids = (list: { id: string }[]) => list.map((r) => r.id);

describe('sortRuns', () => {
  it('Latest: newest first', () => {
    expect(ids(sortRuns(runs, 'latest'))).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('Best: fastest full run first, ties newest first, unfinished runs last', () => {
    expect(ids(sortRuns(runs, 'best'))).toEqual(['c', 'e', 'a', 'd', 'b']);
  });

  it('does not change the input', () => {
    const copy = [...runs];
    sortRuns(runs, 'best');
    expect(runs).toEqual(copy);
  });
});

describe('bestRun', () => {
  it('is the fastest finished run (newest on a tie), null without one', () => {
    expect(bestRun(runs)?.id).toBe('c');
    expect(bestRun([{ id: 'x', started: 1, time: null }])).toBeNull();
    expect(bestRun([])).toBeNull();
  });
});
