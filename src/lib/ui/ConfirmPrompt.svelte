<script lang="ts">
  // A modal yes/no dialog (e.g. "reset all times?"), with optional content (`children`, e.g.
  // a preview): the confirm button (warning border) or Cancel; Escape (or any other close) =
  // Cancel, focus starts there. Timer input is off while it is open (`modals`).
  import { untrack, type Snippet } from 'svelte';
  import { modals } from './modal.svelte';

  let {
    title,
    text = '',
    confirmLabel,
    busy = false,
    disabled = false,
    children,
    onconfirm,
    oncancel,
  }: {
    title: string;
    text?: string;
    confirmLabel: string;
    busy?: boolean;
    /** The confirm button is off (e.g. nothing to do). */
    disabled?: boolean;
    children?: Snippet;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let cancelButton: HTMLButtonElement | undefined = $state();
  /** Closed by one of the buttons (not Escape): don't also report "cancel". */
  let chosen = false;

  $effect(() => {
    const element = dialog;
    if (!element) return;
    if (!element.open) element.showModal();
    untrack(() => {
      cancelButton?.focus();
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
</script>

<dialog
  bind:this={dialog}
  class="prompt"
  aria-labelledby="confirm-title"
  onclose={() => {
    if (!chosen) oncancel();
  }}
>
  <p id="confirm-title" class="title">{title}</p>
  {#if text}<p class="text">{text}</p>{/if}
  {@render children?.()}
  <div class="actions">
    <button
      type="button"
      class="danger"
      disabled={busy || disabled}
      onclick={() => choose(onconfirm)}
    >
      {confirmLabel}
    </button>
    <button type="button" bind:this={cancelButton} disabled={busy} onclick={() => choose(oncancel)}
      >Cancel</button
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
