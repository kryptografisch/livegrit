<script lang="ts">
  // Settings → Splits → Golds: the best segment time of each segment, their sum (sum of
  // best) and the fastest run time of each segment. Read-only: a faster segment in a new run
  // replaces the gold; removing a run (Times) or resetting all times (Base Info) can reset it.
  import { splitTimesOf } from '../timer/core';
  import { goldOptions } from '../timer/goldOptions';
  import type { TimerStore } from '../timer/timerStore.svelte';
  import { formatDuration } from './format';

  let { store }: { store: TimerStore } = $props();

  const NONE = new Set<number>();

  /** Sum of best: only when every segment has a gold. */
  const sumOfBest = $derived(
    store.golds.length > 0 && store.golds.every((g) => g !== null)
      ? (splitTimesOf(store.golds).at(-1) ?? null)
      : null,
  );
  /** Per segment: the fastest run time. */
  const fastest = $derived(
    store.segmentNames.map((_, i) => goldOptions(i, store.history, [], [], NONE).fastest),
  );
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th scope="col">Segment</th>
        <th scope="col" class="num">Fastest</th>
        <th scope="col" class="num">Best</th>
      </tr>
    </thead>
    <tbody>
      {#each store.segmentNames as name, i (i)}
        {@const run = fastest[i] ?? null}
        <tr>
          <th scope="row">{name}</th>
          <td class="fastest">{run ? `${formatDuration(run.ms)} (#${run.run})` : '-'}</td>
          <td class="gold">{formatDuration(store.golds[i] ?? null)}</td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <th scope="row">Sum of best</th>
        <td></td>
        <td>{formatDuration(sumOfBest)}</td>
      </tr>
    </tfoot>
  </table>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }

  /* Only as wide as the content. */
  table {
    width: auto;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
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

  tbody th,
  tfoot th {
    font-weight: normal;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  tfoot th {
    color: var(--color-text-muted);
  }

  tfoot td {
    color: var(--color-text);
  }

  /* Sets the sum apart from the golds above it. */
  tfoot th,
  tfoot td {
    border-top: 2px solid var(--color-border);
  }

  td {
    text-align: right;
  }

  td.gold {
    color: var(--color-best-segment);
  }

  td.fastest {
    color: var(--color-text-muted);
  }
</style>
