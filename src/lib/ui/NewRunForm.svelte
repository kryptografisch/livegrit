<script lang="ts">
  // "+ New splits": a button that opens the form (game, category, segment names one per
  // line). The splits are built by livesplit-core, loaded and saved as new splits; the form
  // closes again afterwards.
  import { runDisplayName } from '../storage/db';
  import type { StorageSync } from '../storage/storageSync.svelte';
  import type { TimerStore } from '../timer/timerStore.svelte';
  import { parseSegmentNames } from '../timer/lss';

  let {
    storage,
    store,
    open = $bindable(false),
    oncreated,
  }: {
    storage: StorageSync;
    store: TimerStore;
    /** Whether the form is shown (bindable, so the page can lay out around it). */
    open?: boolean;
    /** Called with a status message after the splits were created (the form closes). */
    oncreated?: (message: string) => void;
  } = $props();

  let game = $state('');
  let category = $state('');
  let segments = $state('');
  let message = $state<string | null>(null);
  let busy = $state(false);
  let gameInput: HTMLInputElement | undefined = $state();

  const names = $derived(parseSegmentNames(segments));
  const attemptRunning = $derived(store.attemptInProgress);

  // Focus the first field when the form opens.
  $effect(() => {
    if (open) gameInput?.focus();
  });

  function show() {
    open = true;
    message = null;
  }

  function close() {
    open = false;
    game = category = segments = '';
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    try {
      const error = await storage.createRun(game, category, names);
      if (error) {
        message = error;
        return;
      }
      const created = `Created and loaded "${runDisplayName(game, category)}".`;
      close();
      oncreated?.(created);
    } finally {
      busy = false;
    }
  }
</script>

{#if open}
  <form class="new-run" onsubmit={submit}>
    <label>
      Game
      <input type="text" bind:this={gameInput} bind:value={game} autocomplete="off" />
    </label>
    <label>
      Category
      <input type="text" bind:value={category} autocomplete="off" placeholder="e.g. Any%" />
    </label>
    <label>
      Segments (one per line)
      <textarea bind:value={segments} rows="6" placeholder={'Level 1\nLevel 2\nFinal boss'}
      ></textarea>
    </label>
    <div class="row">
      <button type="submit" disabled={busy || names.length === 0 || attemptRunning}>
        Create splits{names.length > 0
          ? ` (${names.length} segment${names.length === 1 ? '' : 's'})`
          : ''}
      </button>
      <button type="button" disabled={busy} onclick={close}>Cancel</button>
      {#if attemptRunning}
        <span class="muted">Reset the current attempt first.</span>
      {/if}
    </div>
    {#if message}
      <p class="muted" role="status">{message}</p>
    {/if}
  </form>
{:else}
  <button type="button" onclick={show}>+ New splits</button>
{/if}

<style>
  .new-run {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--color-text-muted);
  }

  input,
  textarea {
    padding: var(--space-1) var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  textarea {
    resize: vertical;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .muted {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }
  button {
    align-self: start;
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
