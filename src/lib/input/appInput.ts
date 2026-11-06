// The app-wide input wiring: one manager driving the timer store, plus the keyboard and
// gamepad sources. Browser only (the sources listen on `window` and poll on the rAF
// ticker). Tests build their own managers and sources.

import { timerStore } from '../timer/timerStore.svelte';
import { GamepadSource } from './gamepadSource';
import { InputManager } from './inputManager';
import { KeyboardSource } from './keyboardSource';

export const inputManager = new InputManager(timerStore);

export const keyboardSource = new KeyboardSource();

export const gamepadSource = new GamepadSource();
