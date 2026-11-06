// Test doubles for the window coordination: a message hub (BroadcastChannel) and Web
// Locks with per-window clients (`kill` = the window crashed: its locks are released
// without its callbacks finishing, its queued requests dropped).
import type { LockRequest, SyncBus, SyncMessage } from '../src/lib/sync/windowSync.svelte';

/** Lets queued messages, their replies and lock grants run (a few rounds). */
export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

export class FakeHub {
  readonly #listeners = new Map<number, (message: unknown) => void>();
  #next = 0;

  /**
   * A bus for one window: delivers to every other window's bus, asynchronously.
   * `disconnect` = the window is gone (crashed): it neither sends nor receives any more.
   */
  bus(): SyncBus & { disconnect: () => void } {
    const id = ++this.#next;
    return {
      disconnect: () => {
        this.#listeners.delete(id);
      },
      post: (message: SyncMessage) => {
        const data = structuredClone(message);
        for (const [other, listener] of this.#listeners) {
          if (other !== id) setTimeout(() => listener(data), 0);
        }
      },
      subscribe: (listener) => {
        this.#listeners.set(id, listener);
        return () => this.#listeners.delete(id);
      },
    };
  }
}

interface Pending {
  client: number;
  name: string;
  mode: 'shared' | 'exclusive';
  callback: () => Promise<void>;
  resolve: () => void;
}

interface Held {
  client: number;
  name: string;
  mode: 'shared' | 'exclusive';
  token: object;
}

export class FakeLocks {
  #queue: Pending[] = [];
  #held: Held[] = [];
  #next = 0;

  /** The lock API of one window. */
  client(): { request: LockRequest; kill: () => void } {
    const client = ++this.#next;
    return {
      request: (name, mode, callback) =>
        new Promise<void>((resolve) => {
          this.#queue.push({ client, name, mode, callback, resolve });
          this.#pump();
        }),
      kill: () => {
        this.#queue = this.#queue.filter((p) => p.client !== client);
        this.#held = this.#held.filter((h) => h.client !== client);
        this.#pump();
      },
    };
  }

  /** Grants queued requests in order (per name), like the browser. */
  #pump(): void {
    const blocked = new Set<string>();
    for (const pending of [...this.#queue]) {
      if (blocked.has(pending.name)) continue;
      const holders = this.#held.filter((h) => h.name === pending.name);
      const free =
        holders.length === 0 ||
        (pending.mode === 'shared' && holders.every((h) => h.mode === 'shared'));
      if (!free) {
        blocked.add(pending.name);
        continue;
      }
      this.#queue.splice(this.#queue.indexOf(pending), 1);
      const held: Held = {
        client: pending.client,
        name: pending.name,
        mode: pending.mode,
        token: {},
      };
      this.#held.push(held);
      void pending
        .callback()
        .catch(() => {})
        .then(() => {
          const index = this.#held.indexOf(held);
          if (index >= 0) this.#held.splice(index, 1);
          pending.resolve();
          this.#pump();
        });
    }
  }
}
