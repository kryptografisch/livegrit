import { describe, expect, it } from 'vitest';
import { parseHash, settingsHash } from '../src/lib/routes';

describe('routes', () => {
  it('parses the Timer and Settings routes with sections', () => {
    expect(parseHash('')).toEqual({ route: 'timer', section: null });
    expect(parseHash('#/')).toEqual({ route: 'timer', section: null });
    expect(parseHash('#/settings')).toEqual({ route: 'settings', section: null });
    expect(parseHash('#/settings/')).toEqual({ route: 'settings', section: null });
    expect(parseHash('#/settings/timer')).toEqual({ route: 'settings', section: 'timer' });
    expect(parseHash('#/settings/data')).toEqual({ route: 'settings', section: 'data' });
    expect(parseHash('#/settings/splits')).toEqual({ route: 'settings', section: 'splits' });
    expect(parseHash('#/settings/nope')).toEqual({ route: 'settings', section: null });
    expect(parseHash('#/unknown')).toEqual({ route: 'timer', section: null });
    expect(parseHash('#/controls')).toEqual({ route: 'timer', section: null });
  });

  it('builds settings hashes', () => {
    expect(settingsHash()).toBe('#/settings');
    expect(settingsHash('controls')).toBe('#/settings/controls');
  });
});
