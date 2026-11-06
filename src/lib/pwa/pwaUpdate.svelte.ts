/**
 * Service worker update flow ("prompt" strategy): a new version is never applied on its
 * own. The app shows "Update available" only while no attempt is in progress, and the
 * page reloads only after the user clicks Reload.
 *
 * Kept free of `virtual:pwa-register` so it can be tested: `register` is the plugin's
 * `registerSW` (see `registerPwa.ts`), `reload` defaults to `location.reload()`.
 */

/** The subset of vite-plugin-pwa's `RegisterSWOptions` used here. */
export interface RegisterOptions {
  onNeedRefresh?: () => void;
  onNeedReload?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
}

/** `registerSW`: registers the worker, returns "activate the waiting worker". */
export type RegisterFn = (options: RegisterOptions) => (reloadPage?: boolean) => Promise<void>;

export interface PwaUpdateOptions {
  /** True while the update must not be offered (an attempt is running or paused). */
  busy: () => boolean;
  reload?: () => void;
}

export class PwaUpdate {
  /** A new version is waiting (or already active, see `#activated`). */
  available = $state(false);
  /** The user clicked "Later": hidden until the next page load. */
  dismissed = $state(false);
  /**
   * Offline start: `ready` = the app is cached (a worker controls the page, or the first
   * install just finished), `pending` = not yet (first load still caching),
   * `unsupported` = no service worker (dev server, insecure context, old browser).
   */
  offline = $state<'ready' | 'pending' | 'unsupported'>('unsupported');

  readonly #busy: () => boolean;
  readonly #reload: () => void;
  #activate: ((reloadPage?: boolean) => Promise<void>) | null = null;
  /** The user asked for the update; reload as soon as the new worker controls the page. */
  #requested = false;
  /** The new worker already controls this page (another tab applied the update). */
  #activated = false;

  constructor(options: PwaUpdateOptions) {
    this.#busy = options.busy;
    this.#reload = options.reload ?? (() => window.location.reload());
  }

  /** Whether to show the prompt now. Reactive if `busy` is. */
  get offered(): boolean {
    return this.available && !this.dismissed && !this.#busy();
  }

  /**
   * `supported`: service workers work here (false in `vite dev` and insecure contexts;
   * then nothing is registered). `controlled`: a worker already controls the page.
   */
  start(register: RegisterFn, env: { supported: boolean; controlled: boolean }): void {
    if (this.#activate || !env.supported) return;
    this.offline = env.controlled ? 'ready' : 'pending';
    this.#activate = register({
      onNeedRefresh: () => {
        this.available = true;
      },
      // Fired when the new worker takes control. Without this callback the plugin would
      // reload right away, which could happen mid-run when another tab applied the update.
      onNeedReload: () => {
        if (this.#requested) {
          this.#reload();
          return;
        }
        this.#activated = true;
        this.available = true;
      },
      onOfflineReady: () => {
        this.offline = 'ready';
      },
      onRegisterError: (error) => {
        // Not fatal: the app works online without a service worker.
        this.offline = 'unsupported';
        console.warn('Service worker registration failed', error);
      },
    });
  }

  /** "Reload": activates the new version and reloads. Ignored during an attempt. */
  async apply(): Promise<void> {
    if (!this.available || this.#busy()) return;
    if (this.#activated || !this.#activate) {
      this.#reload();
      return;
    }
    this.#requested = true;
    // Tells the waiting worker to skip waiting; `onNeedReload` then reloads.
    await this.#activate();
  }

  dismiss(): void {
    this.dismissed = true;
  }
}
