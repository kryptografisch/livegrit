<script lang="ts">
  // A modal dialog asking what to do with an imported file whose game and category already
  // exist: Replace (the saved entry gets the file's content), Keep both (new entry) or
  // Cancel. Escape (or any other close) = Cancel; focus starts on Cancel. Timer input is off
  // while it is open (`modals`).
  import { untrack } from 'svelte';
  import { formatAttempts, formatDateTime } from './format';
  import type { ImportFlow } from './importFlow.svelte';
  import { modals } from './modal.svelte';

  let { flow }: { flow: ImportFlow } = $props();

  const pending = $derived(flow.pending);
  const saved = $derived(pending?.duplicate ?? null);
  /** The file has fewer runs: probably an older backup, replacing would lose history. */
  const older = $derived(
    pending !== null && saved?.attempts !== undefined && pending.attempts < saved.attempts,
  );

  let dialog: HTMLDialogElement | undefined = $state();
  let cancelButton: HTMLButtonElement | undefined = $state();
  const show = $derived(pending !== null && saved !== null);

  $effect(() => {
    const element = dialog;
    if (!show || !element) return;
    if (!element.open) element.showModal();
    untrack(() => {
      cancelButton?.focus(); // not a dependency: only `show` and `dialog` (re)open it
      modals.open++;
    });
    return () => {
      untrack(() => modals.open--);
      if (element.open) element.close();
    };
  });

  /** Closed by Escape (or the browser) while still pending: that is a Cancel. */
  function closed() {
    if (flow.pending) void flow.choose('cancel');
  }
</script>

<dialog bind:this={dialog} class="prompt" aria-labelledby="duplicate-title" onclose={closed}>
  {#if pending && saved}
    <p id="duplicate-title" class="title">"{saved.name}" already exists</p>
    <dl>
      <dt>Saved</dt>
      <dd>
        {formatDateTime(saved.updatedAt)}{saved.attempts !== undefined
          ? ` - ${formatAttempts(saved.attempts, saved.completed ?? 0)}`
          : ''}
      </dd>
      <dt>File</dt>
      <dd>
        {pending.fileName || 'Imported file'} - {formatAttempts(
          pending.attempts,
          pending.completed,
        )}
      </dd>
    </dl>
    {#if older}
      <p class="warning">
        The file has fewer runs than the saved splits. It may be an older version: replacing would
        lose the newer runs.
      </p>
    {/if}
    <div class="actions">
      <button type="button" disabled={flow.busy} onclick={() => flow.choose('replace')}>
        Replace
      </button>
      <button type="button" disabled={flow.busy} onclick={() => flow.choose('new')}>
        Keep both
      </button>
      <button
        type="button"
        bind:this={cancelButton}
        disabled={flow.busy}
        onclick={() => flow.choose('cancel')}
      >
        Cancel
      </button>
    </div>
  {/if}
</dialog>

<style>
  .prompt {
    width: min(32rem, calc(100vw - 2 * var(--space-3)));
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
    overflow-wrap: anywhere;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--space-1) var(--space-3);
    margin: 0;
    font-size: 0.875em;
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .warning {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-warning);
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

  button:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
</style>
