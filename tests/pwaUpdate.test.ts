import { describe, expect, it, vi } from 'vitest';
import { PwaUpdate, type RegisterOptions } from '../src/lib/pwa/pwaUpdate.svelte';

/** A fake `registerSW`: captures the callbacks, records skip-waiting requests. */
function setup(options: { busy?: boolean; controlled?: boolean; supported?: boolean } = {}) {
  let busy = options.busy ?? false;
  const reload = vi.fn();
  const activate = vi.fn(async () => {});
  let callbacks: RegisterOptions = {};
  const register = vi.fn((opts: RegisterOptions) => {
    callbacks = opts;
    return activate;
  });
  const update = new PwaUpdate({ busy: () => busy, reload });
  update.start(register, {
    supported: options.supported ?? true,
    controlled: options.controlled ?? false,
  });
  return {
    update,
    reload,
    activate,
    register,
    cb: () => callbacks,
    setBusy: (value: boolean) => (busy = value),
  };
}

describe('PwaUpdate', () => {
  it('offers nothing until a new version is waiting', () => {
    const { update } = setup();
    expect(update.available).toBe(false);
    expect(update.offered).toBe(false);
  });

  it('offers a waiting update, applies it and reloads once the new worker controls', async () => {
    const { update, cb, activate, reload } = setup();
    cb().onNeedRefresh?.();
    expect(update.offered).toBe(true);

    await update.apply();
    expect(activate).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled(); // waits for the new worker
    cb().onNeedReload?.();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('hides the prompt and ignores apply while an attempt is in progress', async () => {
    const { update, cb, activate, reload, setBusy } = setup({ busy: true });
    cb().onNeedRefresh?.();
    expect(update.available).toBe(true);
    expect(update.offered).toBe(false);

    await update.apply();
    expect(activate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();

    setBusy(false); // reset / finish
    expect(update.offered).toBe(true);
  });

  it('never reloads on its own when another tab applied the update', async () => {
    const { update, cb, reload } = setup({ busy: true });
    cb().onNeedRefresh?.();
    cb().onNeedReload?.(); // the new worker took control (other tab clicked Reload)
    expect(reload).not.toHaveBeenCalled();
    expect(update.available).toBe(true);
  });

  it('just reloads when the new worker already controls the page', async () => {
    const { update, cb, activate, reload } = setup();
    cb().onNeedReload?.();
    expect(update.offered).toBe(true);
    await update.apply();
    expect(activate).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('"Later" hides the prompt', () => {
    const { update, cb } = setup();
    cb().onNeedRefresh?.();
    update.dismiss();
    expect(update.offered).toBe(false);
  });

  it('reports the offline state', () => {
    expect(setup({ controlled: true }).update.offline).toBe('ready');

    const first = setup();
    expect(first.update.offline).toBe('pending');
    first.cb().onOfflineReady?.();
    expect(first.update.offline).toBe('ready');

    const failed = setup();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    failed.cb().onRegisterError?.(new Error('nope'));
    expect(failed.update.offline).toBe('unsupported');
  });

  it('registers nothing where service workers are not supported (dev, http)', () => {
    const { update, register } = setup({ supported: false });
    expect(register).not.toHaveBeenCalled();
    expect(update.offline).toBe('unsupported');
  });

  it('registers only once', () => {
    const { update, register, activate } = setup();
    update.start(register, { supported: true, controlled: false });
    expect(register).toHaveBeenCalledOnce();
    expect(activate).not.toHaveBeenCalled();
  });
});
