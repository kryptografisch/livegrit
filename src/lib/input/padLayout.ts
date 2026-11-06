// Button names per controller family. Bindings store raw button indices of the W3C
// "standard" gamepad mapping (which browsers use for common pads); the names are only for
// display and depend on the pad they're shown for.

/** Which naming scheme a pad uses. Unknown pads get the Xbox names (the standard mapping
 * follows the Xbox layout). */
export type PadFamily = 'xbox' | 'playstation';

const BUTTONS: Record<PadFamily, readonly string[]> = {
  xbox: [
    'A',
    'B',
    'X',
    'Y',
    'LB',
    'RB',
    'LT',
    'RT',
    'View',
    'Menu',
    'LS',
    'RS',
    'D-pad Up',
    'D-pad Down',
    'D-pad Left',
    'D-pad Right',
    'Xbox',
    'Share',
  ],
  playstation: [
    'Cross',
    'Circle',
    'Square',
    'Triangle',
    'L1',
    'R1',
    'L2',
    'R2',
    'Share',
    'Options',
    'L3',
    'R3',
    'D-pad Up',
    'D-pad Down',
    'D-pad Left',
    'D-pad Right',
    'PS',
    'Touchpad',
  ],
};

/**
 * The family of a pad from its `Gamepad.id`, which differs per browser, e.g. Chrome
 * "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", Firefox
 * "054c-0ce6-DualSense Wireless Controller". Sony's USB vendor id is 054c.
 */
export function padFamily(id: string): PadFamily {
  const lower = id.toLowerCase();
  if (
    /vendor:\s*054c\b/.test(lower) ||
    /^054c-/.test(lower) ||
    /dualsense|dualshock|playstation|\bps[345]\b/.test(lower)
  ) {
    return 'playstation';
  }
  return 'xbox';
}

/** The name of a button index on a pad of `family` ("Button N" beyond the known ones). */
export function padButtonLabel(buttonIndex: number, family: PadFamily = 'xbox'): string {
  return BUTTONS[family][buttonIndex] ?? `Button ${buttonIndex}`;
}
