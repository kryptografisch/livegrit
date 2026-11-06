// The app-wide input wiring: one manager driving the timer store, plus the keyboard source.
// Browser only (the keyboard source listens on `window`). Tests build their own managers.

import { timerStore } from '../timer/timerStore.svelte';
import { InputManager } from './inputManager';
import { KeyboardSource } from './keyboardSource';

export const inputManager = new InputManager(timerStore);

export const keyboardSource = new KeyboardSource();
