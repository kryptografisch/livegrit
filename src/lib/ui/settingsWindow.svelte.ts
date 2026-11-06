// The Settings page opens in its own, bigger window, so the Timer window can stay small
// and narrow. A named window: opening it again reuses (and focuses) the same one. Where
// popups are blocked, the Settings page opens in this window instead.

import { settingsHash, type SettingsSection } from '../routes';
import { windowSync } from '../sync/appSync';
import { timerStore } from '../timer/timerStore.svelte';

/** The Settings window's default size (CSS pixels). */
export const SETTINGS_WINDOW_SIZE = { width: 960, height: 800 } as const;

const WINDOW_NAME = 'live-grit-settings';

let handle: Window | null = null;
let stopWatching: (() => void) | null = null;

/** Whether this window opened the Settings window and it is still open (reactive). */
export const settingsWindow = $state({ owned: false });

function forget(): void {
  stopWatching?.();
  stopWatching = null;
  handle = null;
  settingsWindow.owned = false;
}

function current(): Window | null {
  if (handle?.closed) forget();
  return handle;
}

/**
 * Opens (or focuses) the Settings window, optionally at a section. Not during an attempt
 * (the gear is disabled then): the Timer window ignores input while Settings is open.
 */
export function openSettings(section: SettingsSection | null = null): void {
  if (timerStore.attemptInProgress) return;
  const hash = settingsHash(section);
  const open = current();
  if (open) {
    // Same document: only the hash changes, so the page isn't reloaded.
    open.location.hash = hash;
    open.focus();
    return;
  }
  const { width, height } = SETTINGS_WINDOW_SIZE;
  const url = new URL(hash, location.href).href;
  const opened = window.open(url, WINDOW_NAME, `popup,width=${width},height=${height}`);
  if (!opened) {
    location.hash = hash; // popup blocked: this window shows the Settings page
    return;
  }
  handle = opened;
  settingsWindow.owned = true;
  opened.focus();
  const stop = windowSync.watchWindow(opened);
  // Stop polling once it's gone; `owned` follows.
  const poll = setInterval(() => {
    if (!opened.closed) return;
    clearInterval(poll);
    if (handle === opened) forget();
  }, 500);
  stopWatching = () => {
    stop();
    clearInterval(poll);
  };
}

/** Brings the Settings window to the front; false if this window doesn't own one. */
export function focusSettings(): boolean {
  const open = current();
  open?.focus();
  return open !== null;
}

/**
 * Closes the Settings window: the one this window opened directly, any other through a
 * request to close itself (`WindowSync.closeSettingsWindows`).
 */
export function closeSettings(): void {
  const open = current();
  if (open) {
    open.close();
    forget();
  }
  windowSync.closeSettingsWindows();
}
