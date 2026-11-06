<script lang="ts">
  // Modal with install instructions for the current browser (when it has no install dialog
  // of its own). Close, Escape or any other close sets `open` to false. Timer input is off while it is open (`modals`).
  import { untrack } from 'svelte';
  import { installHelp } from '../pwa/installHelp';
  import { modals } from './modal.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let closeButton: HTMLButtonElement | undefined = $state();

  const help = $derived(
    open
      ? installHelp({
          userAgent: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
          secure: window.isSecureContext,
        })
      : null,
  );

  $effect(() => {
    const element = dialog;
    if (!open || !element) return;
    if (!element.open) element.showModal();
    untrack(() => {
      closeButton?.focus();
      modals.open++;
    });
    return () => {
      untrack(() => modals.open--);
      if (element.open) element.close();
    };
  });
</script>

<dialog
  bind:this={dialog}
  class="help"
  aria-labelledby="install-help-title"
  onclose={() => (open = false)}
>
  {#if help}
    <p id="install-help-title" class="title">Install in {help.browser}</p>
    {#if help.unsupported}
      <p class="note">{help.unsupported}</p>
    {/if}
    {#if help.steps.length > 0}
      <ol>
        {#each help.steps as step (step)}
          <li>{step}</li>
        {/each}
      </ol>
    {/if}
    {#if help.tip}
      <p class="tip">{help.tip}</p>
    {/if}
    {#if help.note}
      <p class="note">{help.note}</p>
    {/if}
    {#if !help.unsupported}
      <p class="note">
        Once installed, LiveGrit opens in its own window and starts offline. Your splits stay the
        same.
      </p>
    {/if}
    <div class="actions">
      <button type="button" bind:this={closeButton} onclick={() => (open = false)}>Close</button>
    </div>
  {/if}
</dialog>

<style>
  .help {
    width: min(32rem, calc(100vw - 2 * var(--space-3)));
    padding: var(--space-3);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-personal-best);
    border-radius: var(--radius-1);
  }

  .help[open] {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .help::backdrop {
    background: var(--color-backdrop);
  }

  .title {
    margin: 0;
    font-weight: 600;
  }

  ol {
    margin: 0;
    padding-left: 1.5em;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .tip {
    margin: 0;
  }

  .note {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    justify-content: end;
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
</style>
