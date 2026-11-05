import { describe, expect, it } from 'vitest';
import { ACTIONS, isAction } from '../src/lib/input/types';

describe('input actions', () => {
  it('lists the five timer actions', () => {
    expect(ACTIONS).toEqual(['split', 'undo', 'skip', 'pause', 'reset']);
  });

  it('recognizes valid and invalid actions', () => {
    expect(isAction('split')).toBe(true);
    expect(isAction('jump')).toBe(false);
    expect(isAction(42)).toBe(false);
  });
});
