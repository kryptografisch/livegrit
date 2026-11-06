// One import from a picked or dropped file, for a page: imports right away unless saved
// splits with the same game and category exist; then `pending` holds the file until the
// user chooses Replace, Keep both or Cancel (`DuplicatePrompt.svelte`).

import type { PreparedImport, StorageSync } from '../storage/storageSync.svelte';

export type ImportChoice = 'replace' | 'new' | 'cancel';

export class ImportFlow {
  /** A file waiting for the duplicate choice. */
  pending = $state.raw<PreparedImport | null>(null);
  /** The last error, for the page; `null` when fine. */
  error = $state<string | null>(null);
  busy = $state(false);

  readonly #storage: StorageSync;

  constructor(storage: StorageSync) {
    this.#storage = storage;
  }

  /** Starts an import; a new file replaces a pending one. */
  async start(file: Blob & { readonly name?: string }): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.pending = null;
    this.error = null;
    try {
      const prepared = await this.#storage.prepareImport(file);
      if (typeof prepared === 'string') this.error = prepared;
      else if (prepared.duplicate) this.pending = prepared;
      else await this.#commit(prepared, 'new');
    } finally {
      this.busy = false;
    }
  }

  /** The user's answer to the duplicate prompt. */
  async choose(choice: ImportChoice): Promise<void> {
    const prepared = this.pending;
    if (!prepared || this.busy) return;
    this.pending = null;
    if (choice === 'cancel') return;
    this.busy = true;
    try {
      await this.#commit(prepared, choice);
    } finally {
      this.busy = false;
    }
  }

  /** Clears the error (e.g. a dismissed banner). */
  dismiss(): void {
    this.error = null;
  }

  /** No success message: the imported splits show up in the list (and on the timer). */
  async #commit(prepared: PreparedImport, mode: 'new' | 'replace'): Promise<void> {
    this.error = await this.#storage.commitImport(prepared, mode);
  }
}
