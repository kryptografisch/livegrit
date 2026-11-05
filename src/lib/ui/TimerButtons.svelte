<script lang="ts">
  // Temporary on-screen controls (step 4). Step 6 hides them behind a toggle (kept for touch).
  import type { TimerStore } from '../timer/timerStore.svelte';

  let { store }: { store: TimerStore } = $props();

  const splitLabel = $derived(store.phase === 'NotRunning' ? 'Start' : 'Split');
</script>

<div class="timer-buttons">
  <button type="button" class="primary" onclick={() => store.splitOrStart()}>{splitLabel}</button>
  <button type="button" onclick={() => store.undo()}>Undo</button>
  <button type="button" onclick={() => store.skip()}>Skip</button>
  <button type="button" onclick={() => store.togglePause()}>
    {store.phase === 'Paused' ? 'Resume' : 'Pause'}
  </button>
  <button type="button" onclick={() => store.reset()}>Reset</button>
  <label class="rows">
    Rows
    <input
      type="number"
      min="0"
      max="99"
      value={store.visibleRows}
      onchange={(e) => (store.visibleRows = e.currentTarget.valueAsNumber)}
      title="Visible split rows (0 = all)"
    />
  </label>
</div>

<style>
  .timer-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }

  button {
    flex: 1 1 4.5rem;
    padding: var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  button.primary {
    border-color: var(--color-text-muted);
  }

  .rows {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-text-muted);
  }

  .rows input {
    width: 3.5rem;
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    padding: var(--space-1);
  }
</style>
