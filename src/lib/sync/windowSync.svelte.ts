// Coordination between the app's windows (tabs, popups, PWA windows) of this origin:
// - presence: which other windows show the Timer or the Settings page, and the timer phase
//   of the Timer windows (the Timer page shows "Settings open" while a Settings window
//   exists; the Settings page refuses to change the splits while an attempt runs there),
// - "changed": a window saved settings or splits, the others re-read them (`StorageSync`).
//
// Presence is announced over a BroadcastChannel (`presence` on start, on every change and
// in reply to `hello`; `bye` on pagehide). A window that is closed without `pagehide`
// (crash, killed process) is detected with the Web Locks API: every window holds a shared
// lock named after its role, and a window that knows peers of the other role waits for
// that lock exclusively. The browser releases a closed window's locks, so the wait ends
// exactly when the last window of that role is gone. Without Web Locks (no secure context,
// e.g. the dev server over a LAN IP) only `bye` and the opener's window handle
// (`watchWindow`) tell that a window was closed.

import type { Phase } from '../timer/timerStore.svelte';

export type WindowRole = 'timer' | 'settings';

export type SyncMessage =
  | { type: 'hello'; from: string }
  | { type: 'presence'; from: string; role: WindowRole; phase: Phase }
  | { type: 'bye'; from: string }
  | { type: 'changed'; from: string }
  | { type: 'close-settings'; from: string };

/** A message bus between the windows (a BroadcastChannel in the browser). */
export interface SyncBus {
  /** Sends to every other window (not to this one). */
  post(message: SyncMessage): void;
  /** Returns an unsubscribe function. */
  subscribe(listener: (message: unknown) => void): () => void;
}

/**
 * `navigator.locks.request(name, { mode }, callback)`: the returned promise settles after
 * the lock was granted and `callback`'s promise settled (the lock is held until then).
 */
export type LockRequest = (
  name: string,
  mode: 'shared' | 'exclusive',
  callback: () => Promise<void>,
) => Promise<void>;

export interface WindowSyncOptions {
  bus: SyncBus | null;
  /** `null` without Web Locks support. */
  locks: LockRequest | null;
  /** Defaults to a random id. */
  id?: string;
  /** Registers the pagehide handler (`bye`); defaults to none (tests). */
  onPageHide?: (handler: () => void) => void;
  /** Interval for `watchWindow`; defaults to 500 ms. */
  pollMs?: number;
}

interface Peer {
  role: WindowRole;
  phase: Phase;
}

const LOCK_PREFIX = 'livegrit:window:';

function isMessage(data: unknown): data is SyncMessage {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Record<string, unknown>;
  return typeof message.from === 'string' && typeof message.type === 'string';
}

export class WindowSync {
  readonly id: string;

  /** The other windows, by id. Replaced as a whole (reactive). */
  #peers = $state.raw<ReadonlyMap<string, Peer>>(new Map());
  #role: WindowRole | null = null;
  #phase: Phase = 'NotRunning';

  readonly #bus: SyncBus | null;
  readonly #locks: LockRequest | null;
  readonly #pollMs: number;
  readonly #onPageHide: ((handler: () => void) => void) | undefined;
  readonly #changedListeners = new Set<() => void>();
  readonly #closeListeners = new Set<() => void>();
  /** Roles whose lock this window waits for (exclusively). */
  readonly #watching = new Set<WindowRole>();
  #releaseLock: (() => void) | null = null;
  /** True once this window holds its role lock (or there are no locks). */
  #announced = false;
  #unsubscribe: (() => void) | null = null;

  constructor(options: WindowSyncOptions) {
    this.#bus = options.bus;
    this.#locks = options.locks;
    this.#pollMs = options.pollMs ?? 500;
    this.#onPageHide = options.onPageHide;
    this.id = options.id ?? Math.random().toString(36).slice(2);
  }

  /** Another window shows the Settings page. */
  get settingsOpen(): boolean {
    return this.#some((peer) => peer.role === 'settings');
  }

  /** An attempt is running or paused in another window. */
  get remoteAttemptInProgress(): boolean {
    return this.#some(
      (peer) => peer.role === 'timer' && (peer.phase === 'Running' || peer.phase === 'Paused'),
    );
  }

  /** A finished attempt waits for its reset in another window. */
  get remoteAttemptEnded(): boolean {
    return this.#some((peer) => peer.role === 'timer' && peer.phase === 'Ended');
  }

  /** Starts listening and asks the other windows to announce themselves. */
  start(): void {
    if (this.#unsubscribe || !this.#bus) return;
    this.#unsubscribe = this.#bus.subscribe((data) => this.#receive(data));
    this.#onPageHide?.(() => this.#post({ type: 'bye', from: this.id }));
    this.#post({ type: 'hello', from: this.id });
  }

  /** This window's page and timer phase; announced to the others when it changes. */
  setState(role: WindowRole, phase: Phase): void {
    if (role === this.#role && phase === this.#phase) return;
    const roleChanged = role !== this.#role;
    this.#role = role;
    this.#phase = phase;
    if (roleChanged) this.#holdRoleLock(role);
    else this.#announce();
  }

  /** Tells the other windows that settings or saved splits changed. */
  notifyChanged(): void {
    this.#post({ type: 'changed', from: this.id });
  }

  /** `listener` runs when another window changed settings or saved splits. */
  onChanged(listener: () => void): () => void {
    this.#changedListeners.add(listener);
    return () => this.#changedListeners.delete(listener);
  }

  /**
   * Asks every Settings window to close itself (for one this window didn't open, e.g.
   * after a reload). They are forgotten and the rest asked to announce themselves: one
   * that can't close (a normal tab) shows up again, a crashed one (no Web Locks) doesn't.
   */
  closeSettingsWindows(): void {
    this.#post({ type: 'close-settings', from: this.id });
    this.#forget('settings');
    this.#post({ type: 'hello', from: this.id });
  }

  /** `listener` runs when a Timer window asks this (Settings) window to close. */
  onCloseRequest(listener: () => void): () => void {
    this.#closeListeners.add(listener);
    return () => this.#closeListeners.delete(listener);
  }

  /**
   * Watches a window this one opened (the Settings popup): once it is closed, the
   * Settings windows are forgotten and the remaining ones asked to announce themselves.
   * Needed where Web Locks are missing; harmless otherwise. Returns a stop function.
   */
  watchWindow(target: { readonly closed: boolean }): () => void {
    const timer = setInterval(() => {
      if (!target.closed) return;
      clearInterval(timer);
      this.#forget('settings');
      this.#post({ type: 'hello', from: this.id });
    }, this.#pollMs);
    return () => clearInterval(timer);
  }

  /** Stops listening and releases the lock (tests; a closed page releases it anyway). */
  stop(): void {
    this.#post({ type: 'bye', from: this.id });
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#releaseLock?.();
    this.#releaseLock = null;
  }

  #some(test: (peer: Peer) => boolean): boolean {
    for (const peer of this.#peers.values()) if (test(peer)) return true;
    return false;
  }

  #receive(data: unknown): void {
    if (!isMessage(data) || data.from === this.id) return;
    switch (data.type) {
      case 'hello':
        this.#announce();
        break;
      case 'presence':
        if (data.role !== 'timer' && data.role !== 'settings') return;
        this.#setPeer(data.from, { role: data.role, phase: data.phase });
        this.#watchRole(data.role);
        break;
      case 'bye':
        this.#setPeer(data.from, null);
        break;
      case 'close-settings':
        if (this.#role === 'settings') this.#run(this.#closeListeners);
        break;
      case 'changed':
        this.#run(this.#changedListeners);
        break;
    }
  }

  #run(listeners: Set<() => void>): void {
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[sync] listener failed', error);
      }
    }
  }

  #setPeer(id: string, peer: Peer | null): void {
    const current = this.#peers.get(id);
    if (peer && current?.role === peer.role && current.phase === peer.phase) return;
    if (!peer && !current) return;
    const next = new Map(this.#peers);
    if (peer) next.set(id, peer);
    else next.delete(id);
    this.#peers = next;
  }

  /** Forgets all peers with `role`. */
  #forget(role: WindowRole): void {
    if (!this.#some((peer) => peer.role === role)) return;
    this.#peers = new Map([...this.#peers].filter(([, peer]) => peer.role !== role));
  }

  #announce(): void {
    if (!this.#role || !this.#announced) return;
    this.#post({ type: 'presence', from: this.id, role: this.#role, phase: this.#phase });
  }

  #post(message: SyncMessage): void {
    try {
      this.#bus?.post(message);
    } catch (error) {
      console.error('[sync] message could not be sent', error);
    }
  }

  /**
   * Holds the shared lock of `role` (releasing the previous role's lock) and announces
   * this window once it is held: a peer that hears the announcement and waits for the
   * lock then can't get it before this window is gone.
   */
  #holdRoleLock(role: WindowRole): void {
    this.#releaseLock?.();
    this.#releaseLock = null;
    const locks = this.#locks;
    if (!locks) {
      this.#announced = true;
      this.#announce();
      return;
    }
    this.#announced = false;
    let released = false;
    let release = () => {
      released = true;
    };
    this.#releaseLock = () => release();
    locks(LOCK_PREFIX + role, 'shared', () => {
      if (released || this.#role !== role) return Promise.resolve();
      this.#announced = true;
      this.#announce();
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    }).catch((error: unknown) => {
      console.error('[sync] window lock failed', error);
    });
  }

  /** Waits until no window holds the lock of `role` any more, then forgets those peers. */
  #watchRole(role: WindowRole): void {
    const locks = this.#locks;
    // Never for this window's own role: it holds that lock itself.
    if (!locks || role === this.#role || this.#watching.has(role)) return;
    this.#watching.add(role);
    locks(LOCK_PREFIX + role, 'exclusive', () => {
      // Granted: no window of `role` exists right now. New ones can only announce
      // themselves after this callback, once they hold the lock.
      this.#forget(role);
      return Promise.resolve();
    })
      .catch((error: unknown) => console.error('[sync] window lock failed', error))
      .finally(() => {
        this.#watching.delete(role);
        // Announced again while this wait was ending: watch again.
        if (this.#some((peer) => peer.role === role)) this.#watchRole(role);
      });
  }
}

/** A `SyncBus` over a BroadcastChannel, or `null` where there is none. */
export function broadcastBus(name: string): SyncBus | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const channel = new BroadcastChannel(name);
  return {
    post: (message) => channel.postMessage(message),
    subscribe(listener) {
      const handler = (event: MessageEvent) => listener(event.data);
      channel.addEventListener('message', handler);
      return () => channel.removeEventListener('message', handler);
    },
  };
}

/** `navigator.locks` as a `LockRequest`, or `null` where it is missing (http). */
export function browserLocks(): LockRequest | null {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks) return null;
  return async (name, mode, callback) => {
    await locks.request(name, { mode }, callback);
  };
}
