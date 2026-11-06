<script lang="ts">
  // Settings → Splits → Times: the runs (attempts) of the loaded splits, from the core's
  // attempt history (the best one in gold), and next to them the segment times of the
  // selected run (golds in gold). Clicking a row selects it (the first row until then);
  // clicking the Attempt or Run time header sorts by it, again reverses. × in front of a run
  // removes it after a dialog (`RemoveRunPrompt`: also update the PB / the golds it holds);
  // refused during an attempt (here or in the Timer window).
  import type { StorageSync } from '../storage/storageSync.svelte';
  import { core, splitTimesOf } from '../timer/core';
  import type { TimerStore } from '../timer/timerStore.svelte';
  import { formatClock, formatDate, formatDuration } from './format';
  import RemoveRunPrompt, { type RemovalPreview } from './RemoveRunPrompt.svelte';
  import { bestRun, sortRuns } from './runSort';

  let {
    store,
    storage,
    disabled = false,
  }: {
    store: TimerStore;
    storage: StorageSync;
    /** Removing is off (e.g. while Base Info is being edited). */
    disabled?: boolean;
  } = $props();

  /** The run whose remove dialog is open. */
  let removing = $state<number | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);
  const attemptRunning = $derived(storage.attemptInProgress);
  /** What removing run `index` changes in the shown timing method, for the dialog. */
  function preview(index: number, updatePb: boolean): RemovalPreview {
    const method = core().TimingMethod[store.timingMethod];
    const plan = storage.removalPlan(index, updatePb).find((p) => p.method === method);
    return {
      pb: plan?.pb
        ? { from: plan.pb.from, to: plan.pb.to?.at(-1) ?? null, run: plan.pb.run }
        : null,
      golds: (plan?.golds ?? []).map((c) => ({
        name: store.segmentNames[c.segment] ?? `#${c.segment + 1}`,
        from: c.from,
        to: c.to,
      })),
    };
  }

  async function remove(index: number, options: { updatePb: boolean; updateGolds: boolean }) {
    busy = true;
    try {
      error = await storage.removeRun(index, options);
    } finally {
      busy = false;
      removing = null;
    }
  }

  /** `attempt`: newest first; `time`: fastest first (unfinished runs always last). */
  type SortKey = 'attempt' | 'time';
  let sortKey = $state<SortKey>('attempt');
  let reversed = $state(false);
  /** The clicked run (attempt id); `null` = the first row. */
  let selectedIndex = $state<number | null>(null);

  /** `when`: shown date (start, else end); `started`: the sort key. */
  const all = $derived(
    store.history.map((entry) => {
      const when = entry.started ?? entry.ended;
      return { ...entry, when, started: when ?? 0 };
    }),
  );
  const runs = $derived.by(() => {
    if (sortKey === 'attempt') {
      const latest = sortRuns(all, 'latest');
      return reversed ? latest.reverse() : latest;
    }
    const best = sortRuns(all, 'best');
    if (!reversed) return best;
    // Slowest first, unfinished runs still last.
    const finished = best.filter((r) => r.time !== null).reverse();
    return [...finished, ...best.filter((r) => r.time === null)];
  });
  /** Shown in gold, whatever the sort. */
  const best = $derived(bestRun(all));
  const selected = $derived(runs.find((r) => r.index === selectedIndex) ?? runs[0] ?? null);
  const splits = $derived(selected ? splitTimesOf(selected.segments) : []);

  function sortBy(key: SortKey) {
    if (sortKey === key) reversed = !reversed;
    else {
      sortKey = key;
      reversed = false;
    }
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none';
    // Attempt: newest (highest) first = descending; Run time: fastest first = ascending.
    const descending = key === 'attempt' ? !reversed : reversed;
    return descending ? 'descending' : 'ascending';
  }

  /** A run's segment time is a gold (a single segment: the one before it has a time). */
  function isGold(segments: readonly (number | null)[], i: number): boolean {
    const time = segments[i] ?? null;
    return time !== null && time === store.golds[i] && (i === 0 || segments[i - 1] !== null);
  }
</script>

{#snippet sortHeader(key: SortKey, label: string, num: boolean)}
  <th scope="col" class:num aria-sort={ariaSort(key)}>
    <button type="button" class="sort" onclick={() => sortBy(key)}>
      {label}<span class="arrow" aria-hidden="true"
        >{sortKey === key ? (ariaSort(key) === 'descending' ? '▾' : '▴') : ''}</span
      >
    </button>
  </th>
{/snippet}

{#if all.length === 0}
  <p class="muted">no runs yet: finished and reset attempts show up here</p>
{:else}
  <div class="tables">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Remove</span></th>
            {@render sortHeader('attempt', 'Attempt', false)}
            <th scope="col">Date</th>
            <th scope="col">Time</th>
            {@render sortHeader('time', 'Run time', true)}
          </tr>
        </thead>
        <tbody>
          {#each runs as run (run.index)}
            {@const isSelected = run === selected}
            <!-- The row selects on click; the button in it is the keyboard way (its click bubbles). -->
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
            <tr
              class="run"
              class:best={run === best}
              class:selected={isSelected}
              onclick={() => (selectedIndex = run.index)}
            >
              <td class="actions">
                <button
                  type="button"
                  class="mark danger"
                  aria-label={`remove run #${run.index}`}
                  title={attemptRunning ? 'reset the current attempt first' : 'remove'}
                  disabled={disabled || busy || attemptRunning}
                  onclick={(event) => {
                    event.stopPropagation();
                    error = null;
                    removing = run.index;
                  }}>×</button
                >
              </td>
              <th scope="row">
                <button
                  type="button"
                  class="select"
                  aria-pressed={isSelected}
                  aria-label={`segment times of run #${run.index}`}>#{run.index}</button
                >
              </th>
              <td class="date">{run.when === null ? '-' : formatDate(run.when)}</td>
              <td class="date">{run.when === null ? '-' : formatClock(run.when)}</td>
              <td>{formatDuration(run.time)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if selected}
      <div class="table-wrap">
        <table class="segments">
          <caption>run #{selected.index}</caption>
          <thead>
            <tr>
              <th scope="col">Segment</th>
              <th scope="col" class="num">Segment time</th>
              <th scope="col" class="num">Split time</th>
            </tr>
          </thead>
          <tbody>
            {#each store.segmentNames as name, i (i)}
              <tr>
                <th scope="row">{name}</th>
                <td class:gold={isGold(selected.segments, i)}>
                  {formatDuration(selected.segments[i] ?? null)}
                </td>
                <td>{formatDuration(splits[i] ?? null)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}
{#if error}<p class="muted error" role="status">{error}</p>{/if}

{#if removing !== null}
  {@const run = all.find((r) => r.index === removing)}
  {#if run}
    <RemoveRunPrompt
      run={run.index}
      last={all.length === 1}
      preview={(updatePb) => preview(run.index, updatePb)}
      {busy}
      onremove={(options) => void remove(run.index, options)}
      oncancel={() => (removing = null)}
    />
  {/if}
{/if}

<style>
  .muted {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .muted.error {
    margin-top: var(--space-2);
    color: var(--color-warning);
  }

  /* The runs and the selected run's segments side by side; stacked when narrow. */
  .tables {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .table-wrap {
    max-width: 100%;
    overflow-x: auto;
  }

  /* Only as wide as the content. */
  table {
    width: auto;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  caption {
    padding: 0 var(--space-2) var(--space-1);
    text-align: left;
    color: var(--color-text-muted);
  }

  th,
  td {
    padding: var(--space-1) var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  thead th {
    color: var(--color-text-muted);
    font-weight: normal;
  }

  /* Over right-aligned (time) columns. */
  thead th.num {
    text-align: right;
  }

  tbody th {
    font-weight: normal;
  }

  table.segments tbody th {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  td {
    text-align: right;
    color: var(--color-text-muted);
  }

  td.date {
    text-align: left;
  }

  td.gold {
    color: var(--color-best-segment);
  }

  /* Header and row buttons look like the text they sit in. */
  button.sort,
  button.select {
    padding: 0;
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }

  .arrow {
    display: inline-block;
    min-width: 1ch;
    margin-left: var(--space-1);
  }

  tr.run {
    cursor: pointer;
  }

  tr.run:hover {
    background: var(--color-surface);
  }

  tr.selected {
    background: var(--color-surface-alt);
  }

  /* The best run (fastest full run): gold text, like a best segment. */
  tr.best > th,
  tr.best > td:not(.actions) {
    color: var(--color-best-segment);
  }

  td.actions {
    padding-right: 0;
  }

  button.mark {
    padding: 0 var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  button.mark:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }

  button.mark.danger {
    border-color: var(--color-warning);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
