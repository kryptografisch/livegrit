<script lang="ts">
  // Settings → Timer: comparison and timing method (only while splits are loaded; the
  // timing method only if they have Game Time), visible split rows and the on-screen timer
  // buttons. Saved on change; other windows apply them right away.
  import type { StorageSync } from '../storage/storageSync.svelte';
  import type { TimerStore } from '../timer/timerStore.svelte';
  import { timerUi } from './timerUi.svelte';

  let { store, storage }: { store: TimerStore; storage: StorageSync } = $props();
</script>

<div class="fields">
  {#if store.comparisons.length > 0}
    <label class="field">
      Compare against
      <select value={store.comparison} onchange={(e) => store.setComparison(e.currentTarget.value)}>
        {#each store.comparisons as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>

    {#if store.hasGameTime}
      <div class="field">
        Timing method
        <div class="toggle" role="group" aria-label="Timing method">
          <button
            type="button"
            aria-pressed={store.timingMethod === 'RealTime'}
            onclick={() => store.setTimingMethod('RealTime')}>Real Time</button
          >
          <button
            type="button"
            aria-pressed={store.timingMethod === 'GameTime'}
            onclick={() => store.setTimingMethod('GameTime')}>Game Time</button
          >
        </div>
      </div>
    {/if}
  {:else}
    <p class="muted">Load splits (Splits tab) to choose the comparison.</p>
  {/if}

  <label class="field">
    Visible split rows
    <input
      class="rows"
      type="number"
      min="0"
      max="99"
      value={store.visibleRows}
      onchange={(e) => (store.visibleRows = e.currentTarget.valueAsNumber)}
    />
    <span class="muted">0 = all</span>
  </label>

  <label class="field check">
    <input
      type="checkbox"
      checked={timerUi.showButtons}
      onchange={(e) => storage.setShowButtons(e.currentTarget.checked)}
    />
    On-screen timer buttons (for touch screens)
  </label>
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
  }

  .check {
    color: var(--color-text);
    cursor: pointer;
  }

  .muted {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  button,
  select,
  .rows {
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .rows {
    width: 4.5rem;
    padding: var(--space-1) var(--space-2);
    cursor: text;
  }

  select {
    min-width: 0;
    max-width: 100%;
  }

  .toggle {
    display: flex;
  }

  .toggle button {
    border-radius: 0;
  }

  .toggle button:first-child {
    border-radius: var(--radius-1) 0 0 var(--radius-1);
  }

  .toggle button:last-child {
    border-left: none;
    border-radius: 0 var(--radius-1) var(--radius-1) 0;
  }

  .toggle button[aria-pressed='true'] {
    background: var(--color-current-split);
  }
</style>
