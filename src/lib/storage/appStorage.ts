// The app-wide storage sync: the timer store, the input bindings and the Timer page UI
// settings, saved to IndexedDB and kept in step with the app's other windows. Browser
// only; tests build their own `StorageSync`.

import { inputManager } from '../input/appInput';
import { windowSync } from '../sync/appSync';
import { timerStore } from '../timer/timerStore.svelte';
import { timerUi } from '../ui/timerUi.svelte';
import { StorageSync } from './storageSync.svelte';

export const appStorage = new StorageSync({
  store: timerStore,
  input: inputManager,
  ui: timerUi,
  link: windowSync,
});
