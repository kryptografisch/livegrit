/**
 * "Install as app". The row is shown in every browser unless the app already runs
 * installed. Where the browser offers `beforeinstallprompt` (Chromium: Chrome, Edge,
 * Android) the button opens the browser's install dialog; elsewhere (Safari, Firefox, or
 * Chrome before it offers it) the app shows instructions instead (`installHelp.ts`).
 */

/** Not in the TS DOM lib. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export class PwaInstall {
  /** Running as the installed app (standalone window), or just installed. */
  installed = $state(false);
  /** The browser's own install dialog can be shown (`install()` returns true). */
  canPrompt = $state(false);

  #event: BeforeInstallPromptEvent | null = null;
  #target: EventTarget | null = null;

  readonly #onPrompt = (event: Event) => {
    // Keep the mini-infobar away; the app shows its own row instead.
    event.preventDefault();
    this.#event = event as BeforeInstallPromptEvent;
    this.canPrompt = true;
  };

  readonly #onInstalled = () => {
    this.#event = null;
    this.canPrompt = false;
    this.installed = true;
  };

  /** `target` is `window` in the app; `standalone`: already running as the installed app. */
  start(target: EventTarget, env: { standalone: boolean }): void {
    if (this.#target) return;
    this.#target = target;
    this.installed = env.standalone;
    target.addEventListener('beforeinstallprompt', this.#onPrompt);
    target.addEventListener('appinstalled', this.#onInstalled);
  }

  stop(): void {
    this.#target?.removeEventListener('beforeinstallprompt', this.#onPrompt);
    this.#target?.removeEventListener('appinstalled', this.#onInstalled);
    this.#target = null;
  }

  /**
   * Shows the browser's install dialog. Returns false if there is none (then the caller
   * shows the instructions). The event can be used only once; after a dismiss Chrome
   * fires a new one later.
   */
  async install(): Promise<boolean> {
    const event = this.#event;
    if (!event) return false;
    this.#event = null;
    this.canPrompt = false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') this.#onInstalled();
    return true;
  }
}
