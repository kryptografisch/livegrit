<script lang="ts">
  // A modal dialog before leaving an edit with unsaved changes (e.g. switching the Base Info /
  // Golds / Times tab): Save, Discard or Keep editing. Escape (or any other close) = Keep
  // editing; focus starts there. Timer input is off while it is open (`modals`).
  import { untrack } from 'svelte';
  import { modals } from './modal.svelte';

  let {
    busy = false,
    onsave,
    ondiscard,
    onstay,
  }: {
    /** A save is running: the buttons wait. */
    busy?: boolean;
    onsave: () => void;
    ondiscard: () => void;
    onstay: () => void;
  } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let stayButton: HTMLButtonElement | undefined = $state();
  /** Closed by one of the buttons (not Escape): don't also report "stay". */
  let chosen = false;

  $effect(() => {
    const element = dialog;
    if (!element) return;
    if (!element.open) element.showModal();
    untrack(() => {
      stayButton?.focus();
      modals.open++;
    });
    return () => {
      untrack(() => modals.open--);
      if (element.open) element.close();
    };
  });

  function choose(action: () => void) {
    chosen = true;
    action();
  }

  function closed() {
    if (!chosen) onstay();
  }
</script>

<dialog bind:this={dialog} class="prompt" aria-labelledby="unsaved-title" onclose={closed}>
  <p id="unsaved-title" class="title">unsaved changes</p>
  <p class="text">save or discard them first</p>
  <div class="actions">
    <button type="button" disabled={busy} onclick={() => choose(onsave)}>Save</button>
    <button type="button" class="danger" disabled={busy} onclick={() => choose(ondiscard)}>
      Discard
    </button>
    <button type="button" bind:this={stayButton} disabled={busy} onclick={() => choose(onstay)}
      >Keep editing</button
    >
  </div>
</dialog>

<style>
  .prompt {
    width: min(28rem, calc(100vw - 2 * var(--space-3)));
    padding: var(--space-3);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-1);
  }

  .prompt[open] {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .prompt::backdrop {
    background: var(--color-backdrop);
  }

  .title {
    margin: 0;
    font-weight: 600;
  }

  .text {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  button {
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  button.danger {
    border-color: var(--color-warning);
  }

  button:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
</style>
