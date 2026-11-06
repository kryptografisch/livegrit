// The app-wide window coordination (browser only; tests build their own `WindowSync`).

import { broadcastBus, browserLocks, WindowSync } from './windowSync.svelte';

export const windowSync = new WindowSync({
  bus: broadcastBus('livegrit'),
  locks: browserLocks(),
  onPageHide: (handler) => window.addEventListener('pagehide', handler),
});
