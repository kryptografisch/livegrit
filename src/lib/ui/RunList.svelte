<script lang="ts">
  // Saved splits: load, export, delete (with an inline confirm), last saved time.
  // The loaded splits are marked; loading others or deleting the loaded ones is refused
  // during an attempt (the storage layer says so).
  import { fade } from 'svelte/transition';
  import { downloadText } from '../timer/lss';
  import type { StorageSync } from '../storage/storageSync.svelte';
  import { formatAttempts, formatDateTime } from './format';

  let { storage }: { storage: StorageSync } = $props();

  const NOTICE_MS = 4000;

  /** The run whose delete waits for confirmation. */
  let confirmDelete = $state<string | null>(null);
  /** An error (stays until the next action) or a success notice (hides itself). */
  let message = $state<{ text: string; error: boolean } | null>(null);
  let busy = $state(false);

  const attemptRunning = $derived(storage.attemptInProgress);

  // Success notices (e.g. "deleted") disappear after a few seconds; errors stay.
  $effect(() => {
    const current = message;
    if (!current || current.error) return;
    const timer = setTimeout(() => {
      if (message === current) message = null;
    }, NOTICE_MS);
    return () => clearTimeout(timer);
  });

  async function run(action: () => Promise<string | null>, done?: string) {
    if (busy) return;
    busy = true;
    try {
      const error = await action();
      message = error ? { text: error, error: true } : done ? { text: done, error: false } : null;
    } finally {
      busy = false;
    }
  }

  function open(id: string) {
    confirmDelete = null;
    void run(() => storage.openRun(id));
  }

  function remove(id: string, name: string) {
    confirmDelete = null;
    void run(() => storage.deleteRun(id), `"${name}" deleted.`);
  }

  function exportRun(id: string) {
    void run(async () => {
      const file = await storage.exportRun(id);
      if (!file) return 'These splits could not be exported.';
      downloadText(file.text, file.fileName);
      return null;
    });
  }
</script>

{#if storage.runs.length === 0}
  <p class="muted">No saved splits yet. Import a .lss file or create new splits.</p>
{:else}
  <ul class="runs">
    {#each storage.runs as saved (saved.id)}
      {@const active = saved.id === storage.activeRunId}
      <li class:active>
        <div class="info">
          <span class="name">
            {saved.name}
            {#if active}<span class="badge">loaded</span>{/if}
          </span>
          <span class="muted">
            Saved {formatDateTime(saved.updatedAt)}{saved.attempts !== undefined
              ? ` - ${formatAttempts(saved.attempts, saved.completed ?? 0)}`
              : ''}
          </span>
        </div>
        <div class="actions">
          {#if confirmDelete === saved.id}
            <span>Delete "{saved.name}"? This can't be undone.</span>
            <button type="button" class="danger" onclick={() => remove(saved.id, saved.name)}>
              Delete
            </button>
            <button type="button" onclick={() => (confirmDelete = null)}>Keep</button>
          {:else}
            <button
              type="button"
              disabled={busy || active || attemptRunning}
              title={attemptRunning ? 'Reset the current attempt first' : undefined}
              onclick={() => open(saved.id)}
            >
              Load
            </button>
            <button type="button" disabled={busy} onclick={() => exportRun(saved.id)}>
              Export
            </button>
            <button
              type="button"
              disabled={busy || (active && attemptRunning)}
              onclick={() => (confirmDelete = saved.id)}
            >
              Delete
            </button>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
{/if}

{#if message}
  <p class="message" class:error={message.error} role="status" out:fade={{ duration: 300 }}>
    {message.text}
  </p>
{/if}

<style>
  .runs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  li.active {
    border-color: var(--color-current-split);
  }

  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    overflow-wrap: anywhere;
  }

  .badge {
    margin-left: var(--space-1);
    padding: 0 var(--space-1);
    font-size: 0.75em;
    color: var(--color-text);
    background: var(--color-current-split);
    border-radius: var(--radius-1);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
  }

  .muted {
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  p.muted,
  .message {
    margin: 0;
  }

  .message {
    margin-top: var(--space-2);
    color: var(--color-text-muted);
  }

  .message.error {
    color: var(--color-warning);
  }

  button {
    padding: var(--space-1) var(--space-2);
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
