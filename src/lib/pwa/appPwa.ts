import { registerSW } from 'virtual:pwa-register';
import { timerStore } from '../timer/timerStore.svelte';
import { PwaInstall } from './pwaInstall.svelte';
import { PwaUpdate } from './pwaUpdate.svelte';

/** App-wide update state. Never offered while an attempt is running or paused. */
export const pwaUpdate = new PwaUpdate({ busy: () => timerStore.attemptInProgress });

/** "Install as app": browser dialog (Chromium) or instructions (others). */
export const pwaInstall = new PwaInstall();

/** Running as the installed app (iOS Safari uses the non-standard `navigator.standalone`). */
function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/** Registers the service worker (production builds only: `vite dev` has none). */
export function startPwa(): void {
  if (typeof window !== 'undefined') pwaInstall.start(window, { standalone: isStandalone() });
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  pwaUpdate.start(registerSW, {
    supported: !import.meta.env.DEV && sw !== undefined,
    controlled: sw?.controller != null,
  });
}
