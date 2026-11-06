<script lang="ts">
  // Comparison and timing method of the loaded run (moved here from the Timer page toolbar).
  // The Controls page shows it only while a run is loaded.
  import type { TimerStore } from '../timer/timerStore.svelte';

  let { store }: { store: TimerStore } = $props();
</script>

<div class="fields">
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
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
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
