// Small Timer page UI state that should survive switching pages. Saved by the storage
// layer (`appStorage.setShowButtons`, `appStorage.setTimerLayout`); a stored buttons
// choice replaces the device default.
import { defaultTimerLayout } from './timerLayout';

/** Touch screens get the on-screen buttons by default; keyboard/mouse users don't. */
const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export const timerUi = $state({ showButtons: coarsePointer, layout: defaultTimerLayout() });
