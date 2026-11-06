// The input devices: connected gamepads (for the list in Settings → Controls) and the device
// last used for an action (shown on the Timer page).
//
// There is no device selection: the keyboard and every pad work, and bindings don't depend
// on the device. Browsers hide pads until a button is pressed, so a pad shows up here only
// after its first press.

import type { RawInput } from './bindings';
import type { PadEvent, PadListener, PadSnapshot } from './gamepadSource';
import type { InputListener } from './inputManager';
import { padFamily, type PadFamily } from './padLayout';

export interface PadInfo {
  /** `Gamepad.index` (slot). */
  index: number;
  id: string;
  /** Readable name from the id. */
  name: string;
  /** Which button names it uses (Xbox or PlayStation). */
  family: PadFamily;
}

export type UsedDevice = { kind: 'keyboard' } | ({ kind: 'pad' } & PadInfo);

/** What the store listens to for pads. `GamepadSource` implements it. */
export interface PadEventSource {
  readonly pads: PadSnapshot[];
  subscribe(listener: PadListener): () => void;
}

/** What the store listens to for used input. `InputManager` implements it. */
export interface InputEventSource {
  onInput(listener: InputListener): () => void;
}

/**
 * A readable name from a `Gamepad.id`, which differs per browser:
 * Chrome "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)",
 * Firefox "054c-09cc-Wireless Controller", Safari mostly just the name.
 */
export function padName(id: string): string {
  let name = id.trim();
  // Chrome: a trailing "(… Vendor: … Product: …)" / "(STANDARD GAMEPAD)" / "(XInput …)".
  name = name.replace(/\s*\((?=[^()]*(?:vendor|standard gamepad|xinput))[^()]*\)\s*$/i, '');
  // Firefox: "vendor-product-" prefix in hex.
  name = name.replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, '').trim();
  if (/^xinput$/i.test(name)) return 'XInput gamepad';
  return name === '' ? 'Gamepad' : name;
}

/** A pad's short label by slot, as in Settings → Controls: "Gamepad 1" for slot 0. */
export function padLabel(pad: { index: number }): string {
  return `Gamepad ${pad.index + 1}`;
}

const KEYBOARD: UsedDevice = { kind: 'keyboard' };

export class InputDeviceStore {
  /** Connected pads, by slot index. */
  pads = $state<PadInfo[]>([]);
  /** The device whose input last triggered an action (keyboard until a pad is used). */
  lastUsed = $state<UsedDevice>(KEYBOARD);
  /**
   * Pads whose press triggered an action (a mapped button) since they connected, by slot.
   * Bindings don't belong to a device, so this is how the Timer page footer tells the
   * controllers in use from other connected ones.
   */
  usedPads = $state<PadInfo[]>([]);

  /**
   * Button names for device-independent lists (the bindings table): the last used pad's,
   * else the first connected pad's, else Xbox.
   */
  get labelFamily(): PadFamily {
    if (this.lastUsed.kind === 'pad') return this.lastUsed.family;
    return this.pads[0]?.family ?? 'xbox';
  }

  /** Follows a pad source's connects/disconnects. Returns the unsubscribe function. */
  attachPads(source: PadEventSource): () => void {
    for (const { index, id } of source.pads) this.#connected(index, id);
    return source.subscribe((event) => this.handlePadEvent(event));
  }

  /** Follows the input that triggers actions. Returns the unsubscribe function. */
  attachInput(source: InputEventSource): () => void {
    return source.onInput((input) => this.handleInput(input));
  }

  handlePadEvent(event: PadEvent): void {
    if (event.type === 'press') return;
    if (event.type === 'connected') {
      this.#connected(event.index, event.id);
      return;
    }
    this.pads = this.pads.filter((p) => p.index !== event.index);
    this.usedPads = this.usedPads.filter((p) => p.index !== event.index);
    // The last used pad is gone: back to the keyboard.
    if (this.lastUsed.kind === 'pad' && this.lastUsed.index === event.index) {
      this.lastUsed = KEYBOARD;
    }
  }

  handleInput(input: RawInput): void {
    if (input.kind === 'key') {
      if (this.lastUsed.kind !== 'keyboard') this.lastUsed = KEYBOARD;
      return;
    }
    const pad = this.pads.find((p) => p.index === input.padIndex && p.id === input.padId);
    const info = pad ?? padInfo(input.padIndex, input.padId);
    if (!this.usedPads.some((p) => p.index === info.index && p.id === info.id)) {
      const others = this.usedPads.filter((p) => p.index !== info.index);
      this.usedPads = [...others, info].sort((a, b) => a.index - b.index);
    }
    const last = this.lastUsed;
    if (last.kind === 'pad' && last.index === info.index && last.id === info.id) return;
    this.lastUsed = { kind: 'pad', ...info };
  }

  #connected(index: number, id: string): void {
    const others = this.pads.filter((p) => p.index !== index);
    this.pads = [...others, padInfo(index, id)].sort((a, b) => a.index - b.index);
  }
}

function padInfo(index: number, id: string): PadInfo {
  return { index, id, name: padName(id), family: padFamily(id) };
}
