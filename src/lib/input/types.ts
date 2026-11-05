// Abstract timer actions. All input sources (keyboard, gamepad, later native
// hotkeys) emit these; only the input manager calls the timer.

export const ACTIONS = ['split', 'undo', 'skip', 'pause', 'reset'] as const;

export type Action = (typeof ACTIONS)[number];

export function isAction(value: unknown): value is Action {
  return typeof value === 'string' && (ACTIONS as readonly string[]).includes(value);
}
