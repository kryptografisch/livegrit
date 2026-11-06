// The app's hash routes: `#/` = Timer, `#/settings` = Settings, `#/settings/<section>` =
// Settings at that tab. Pure, so it's testable without a browser
// (`router.svelte.ts`).

export type Route = 'timer' | 'settings';

export const SETTINGS_SECTIONS = ['splits', 'timer', 'controls', 'data'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export interface AppLocation {
  route: Route;
  /** The Settings tab to show; `null` = the default tab (Splits). */
  section: SettingsSection | null;
}

export function parseHash(hash: string): AppLocation {
  const path = hash.replace(/^#/, '');
  const match = /^\/settings(?:\/([a-z]+))?\/?$/.exec(path);
  if (!match) return { route: 'timer', section: null };
  const section = SETTINGS_SECTIONS.find((s) => s === match[1]) ?? null;
  return { route: 'settings', section };
}

/** `#/settings` or `#/settings/<section>`. */
export function settingsHash(section: SettingsSection | null = null): string {
  return section ? `#/settings/${section}` : '#/settings';
}
