<script lang="ts">
  // Temporary (step 5): import/export, comparison and timing method on the Timer page.
  // Step 8 moves the comparison + timing method selectors to Controls, step 10 import/export.
  // Rows input and the on-screen buttons toggle: step 6 (Rows is removed in step 12).
  import type { TimerStore } from '../timer/timerStore.svelte';
  import { downloadText } from '../timer/lss';
  import ImportButton from './ImportButton.svelte';
  import { timerUi } from './timerUi.svelte';

  let { store, onimport }: { store: TimerStore; onimport: (file: File) => void } = $props();

  const canImport = $derived(store.phase === 'NotRunning');

  function exportRun() {
    const lss = store.exportLss();
    if (lss) downloadText(lss.text, lss.fileName);
  }
</script>

<div class="run-toolbar">
  <ImportButton onfile={onimport} disabled={!canImport} />
  <button type="button" onclick={exportRun}>Export .lss</button>

  <label class="field">
    Compare
    <select
      value={store.comparison}
      onchange={(e) => {
        store.setComparison(e.currentTarget.value);
        // A focused select swallows the timer keys; give them back.
        e.currentTarget.blur();
      }}
      title="Comparison"
    >
      {#each store.comparisons as name (name)}
        <option value={name}>{name}</option>
      {/each}
    </select>
  </label>

  {#if store.hasGameTime}
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
  {/if}

  <label class="field">
    Rows
    <input
      class="rows"
      type="number"
      min="0"
      max="99"
      value={store.visibleRows}
      onchange={(e) => {
        store.visibleRows = e.currentTarget.valueAsNumber;
        e.currentTarget.blur();
      }}
      title="Visible split rows (0 = all)"
    />
  </label>

  <button
    type="button"
    class="buttons-toggle"
    aria-pressed={timerUi.showButtons}
    onclick={() => (timerUi.showButtons = !timerUi.showButtons)}
    title="Show or hide the on-screen timer buttons"
  >
    {timerUi.showButtons ? 'Hide buttons' : 'Show buttons'}
  </button>
</div>

<style>
  .run-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }

  button,
  select {
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  select {
    min-width: 0;
    max-width: 14rem;
  }

  .rows {
    width: 3.5rem;
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    padding: var(--space-1);
  }

  .buttons-toggle {
    margin-left: auto;
    padding: var(--space-1) var(--space-2);
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-text-muted);
    min-width: 0;
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
