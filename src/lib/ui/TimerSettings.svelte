<script lang="ts">
  // Settings → Timer. "Timing": comparison and timing method (only while splits are
  // loaded; the timing method only if they have Game Time). "UI": what the Timer page
  // shows (`timerUi.layout`), with nested toggles: sub options are greyed out while their
  // area is off, and keep their value. Saved on change; other windows apply them right
  // away.
  import type { StorageSync } from '../storage/storageSync.svelte';
  import type { TimerStore } from '../timer/timerStore.svelte';
  import {
    SPLIT_ROWS_MAX,
    SPLIT_ROWS_MIN,
    TIMER_SCALE_MAX,
    TIMER_SCALE_MIN,
    TIMER_SCALE_STEP,
    type TimerLayout,
  } from './timerLayout';
  import { timerUi } from './timerUi.svelte';

  let { store, storage }: { store: TimerStore; storage: StorageSync } = $props();

  const layout = $derived(timerUi.layout);

  type Flag = {
    [K in keyof TimerLayout]: TimerLayout[K] extends boolean ? K : never;
  }[keyof TimerLayout];

  function set(patch: Partial<TimerLayout>) {
    storage.setTimerLayout(patch);
  }

  /** The timer size while the slider moves (applied on release). */
  let scaleDraft = $state<number | null>(null);
  const scale = $derived(scaleDraft ?? layout.timerScale);
</script>

{#snippet check(key: Flag, label: string, disabled = false)}
  <label class="check" class:disabled>
    <input
      type="checkbox"
      checked={layout[key]}
      {disabled}
      onchange={(e) => set({ [key]: e.currentTarget.checked })}
    />
    {label}
  </label>
{/snippet}

<h2>Timing</h2>
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
</div>

<h2>UI</h2>
<div class="fields">
  <div class="group">
    {@render check('header', 'Game and category header')}
    <div class="sub">
      {@render check('headerGame', 'Game name', !layout.header)}
      {@render check('headerCategory', 'Category name', !layout.header)}
      {@render check('headerAttempts', 'Number of attempts', !layout.header)}
    </div>
  </div>

  <div class="group">
    {@render check('compactSplits', 'Compact splits (scroll with the current split)')}
    <div class="sub">
      <label class="field" class:disabled={!layout.compactSplits}>
        Visible split rows
        <input
          class="number"
          type="number"
          min={SPLIT_ROWS_MIN}
          max={SPLIT_ROWS_MAX}
          value={layout.splitRows}
          disabled={!layout.compactSplits}
          onchange={(e) => {
            set({ splitRows: e.currentTarget.valueAsNumber });
            // Out of range or empty: show the value that was kept.
            e.currentTarget.value = String(timerUi.layout.splitRows);
          }}
        />
      </label>
    </div>
  </div>

  <div class="field">
    <label for="timer-scale">Timer size</label>
    <input
      id="timer-scale"
      type="range"
      min={TIMER_SCALE_MIN}
      max={TIMER_SCALE_MAX}
      step={TIMER_SCALE_STEP}
      value={scale}
      oninput={(e) => (scaleDraft = e.currentTarget.valueAsNumber)}
      onchange={(e) => {
        set({ timerScale: e.currentTarget.valueAsNumber });
        scaleDraft = null;
      }}
    />
    <span class="value">{scale} %</span>
    {#if layout.timerScale !== 100}
      <button type="button" class="small" onclick={() => set({ timerScale: 100 })}>Reset</button>
    {/if}
  </div>

  <div class="group">
    {@render check('info', 'Info below the timer')}
    <div class="sub">
      {@render check('infoPreviousSegment', 'Previous segment', !layout.info)}
      {@render check('infoSumOfBest', 'Sum of best segments', !layout.info)}
      {@render check('infoPossibleTimeSave', 'Possible time save', !layout.info)}
    </div>
  </div>

  {@render check('inputDevices', 'Input devices row (the settings gear always stays)')}

  <label class="check">
    <input
      type="checkbox"
      checked={timerUi.showButtons}
      onchange={(e) => storage.setShowButtons(e.currentTarget.checked)}
    />
    On-screen timer buttons (for touch screens)
  </label>
</div>

<style>
  h2 {
    font-size: var(--font-size-base);
    margin: var(--space-4) 0 var(--space-2);
  }

  h2:first-child {
    margin-top: 0;
  }

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
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text);
    cursor: pointer;
  }

  .disabled {
    opacity: 0.5;
    cursor: default;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Sub options: indented under their area's checkbox, with a guide line. */
  .sub {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-left: 0.5rem;
    padding-left: var(--space-3);
    border-left: 1px solid var(--color-border);
  }

  .muted {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .value {
    min-width: 3.5em;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  button,
  select,
  .number {
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .number {
    width: 4.5rem;
    padding: var(--space-1) var(--space-2);
    cursor: text;
  }

  .number:disabled {
    cursor: default;
  }

  button.small {
    padding: var(--space-1) var(--space-2);
    font-size: 0.875em;
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
