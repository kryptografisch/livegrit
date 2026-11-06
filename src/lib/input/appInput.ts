// The app-wide input wiring: one manager driving the timer store, the keyboard and gamepad
// sources, and the device list / last used device. Browser only (the sources listen on
// `window` and poll on the rAF ticker). Tests build their own instances.

import { timerStore } from '../timer/timerStore.svelte';
import { GamepadSource } from './gamepadSource';
import { InputDeviceStore } from './inputDevice.svelte';
import { InputManager } from './inputManager';
import { KeyboardSource } from './keyboardSource';

export const inputManager = new InputManager(timerStore);

export const keyboardSource = new KeyboardSource();

export const gamepadSource = new GamepadSource();

export const inputDevices = new InputDeviceStore();
inputDevices.attachPads(gamepadSource);
inputDevices.attachInput(inputManager);
