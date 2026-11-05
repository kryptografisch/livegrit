// Screen wake lock controller with a fake WakeLock API and document.
import { describe, expect, it } from 'vitest';
import { WakeLockController, type WakeLockEnv } from '../src/lib/wakeLock';

class FakeSentinel {
  released = false;
  #listeners: (() => void)[] = [];
  addEventListener(_type: 'release', listener: () => void) {
    this.#listeners.push(listener);
  }
  async release() {
    if (this.released) return;
    this.released = true;
    this.#listeners.forEach((l) => l());
  }
}

function fakeEnv(options: { fail?: boolean } = {}) {
  const sentinels: FakeSentinel[] = [];
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_type: string, l: () => void) => listeners.add(l),
    removeEventListener: (_type: string, l: () => void) => listeners.delete(l),
  };
  const env = {
    wakeLock: {
      request: async () => {
        if (options.fail || doc.visibilityState !== 'visible') throw new Error('NotAllowed');
        const sentinel = new FakeSentinel();
        sentinels.push(sentinel);
        return sentinel;
      },
    },
    document: doc,
  } as unknown as WakeLockEnv;
  /** The browser hides the page: it releases the lock by itself. */
  const setVisible = (visible: boolean) => {
    doc.visibilityState = visible ? 'visible' : 'hidden';
    if (!visible) sentinels.forEach((s) => void s.release());
    listeners.forEach((l) => l());
  };
  return { env, sentinels, listeners, setVisible };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('wake lock', () => {
  it('acquires while active and releases when inactive', async () => {
    const { env, sentinels, listeners } = fakeEnv();
    const lock = new WakeLockController(env);
    lock.setActive(true);
    await flush();
    expect(lock.held).toBe(true);
    expect(listeners.size).toBe(1);

    lock.setActive(true); // idempotent
    await flush();
    expect(sentinels.length).toBe(1);

    lock.setActive(false);
    expect(lock.held).toBe(false);
    expect(sentinels[0]?.released).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it('re-acquires when the page becomes visible again', async () => {
    const { env, sentinels, setVisible } = fakeEnv();
    const lock = new WakeLockController(env);
    lock.setActive(true);
    await flush();
    setVisible(false);
    await flush();
    expect(lock.held).toBe(false);
    setVisible(true);
    await flush();
    expect(lock.held).toBe(true);
    expect(sentinels.length).toBe(2);
  });

  it('releases a lock that arrives after it was no longer wanted', async () => {
    const { env, sentinels } = fakeEnv();
    const lock = new WakeLockController(env);
    lock.setActive(true);
    lock.setActive(false); // before the request resolved
    await flush();
    expect(lock.held).toBe(false);
    expect(sentinels[0]?.released).toBe(true);
  });

  it('ignores failures and missing support', async () => {
    const failing = new WakeLockController(fakeEnv({ fail: true }).env);
    failing.setActive(true);
    await flush();
    expect(failing.held).toBe(false);

    const unsupported = new WakeLockController({
      wakeLock: undefined,
      document: fakeEnv().env.document,
    });
    expect(unsupported.supported).toBe(false);
    unsupported.setActive(true);
    expect(unsupported.held).toBe(false);

    // No browser at all (Node).
    expect(new WakeLockController(null).supported).toBe(false);
  });
});
