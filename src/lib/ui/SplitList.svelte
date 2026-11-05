<script lang="ts">
  import { semanticColorVar, type SplitsView } from '../timer/layoutView';

  let {
    splits,
    onscroll,
  }: {
    splits: SplitsView;
    /** Scrolls the core's split window (only used when the core shows a window, not all rows). */
    onscroll?: (direction: 'up' | 'down') => void;
  } = $props();

  let list: HTMLElement | undefined = $state();
  const currentKey = $derived(splits.rows.find((r) => r.isCurrent)?.key ?? null);

  // The core moves its row window with the current split; if all rows are shown and the
  // list overflows its box, keep the current row visible ourselves.
  $effect(() => {
    if (currentKey === null || !list) return;
    list
      .querySelector<HTMLElement>(`[data-key="${currentKey}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });

  function onwheel(event: WheelEvent) {
    if (!onscroll || event.deltaY === 0) return;
    // Let the browser scroll natively when the list itself overflows.
    if (list && list.scrollHeight > list.clientHeight) return;
    event.preventDefault();
    onscroll(event.deltaY < 0 ? 'up' : 'down');
  }
</script>

<div
  class="split-list"
  bind:this={list}
  {onwheel}
  style:--columns={splits.columnCount}
  role="table"
  aria-label="Splits"
>
  {#if splits.columnLabels}
    <div class="row labels" role="row">
      <span class="name" role="columnheader"></span>
      {#each splits.columnLabels as label, i (i)}
        <span class="cell" role="columnheader">{label}</span>
      {/each}
    </div>
  {/if}
  {#each splits.rows as row (row.key)}
    <div
      class="row"
      class:current={row.isCurrent}
      class:separator={row.separatorBefore}
      data-key={row.key}
      role="row"
      aria-current={row.isCurrent ? 'step' : undefined}
    >
      <span class="name" class:indented={row.isIndented} role="cell">{row.name}</span>
      {#each row.cells as cell, i (i)}
        <span class="cell" role="cell" style:color={semanticColorVar(cell.color)}>{cell.value}</span
        >
      {/each}
    </div>
  {/each}
</div>

<style>
  .split-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) repeat(var(--columns), auto);
    align-content: start;
  }

  .row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    column-gap: var(--space-3);
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .row.current {
    background: var(--color-current-split);
  }

  .row.separator {
    border-top: 2px solid var(--color-text-muted);
  }

  .labels {
    color: var(--color-text-muted);
    font-size: 0.85em;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.indented {
    padding-left: var(--space-3);
  }

  .cell {
    text-align: right;
    font-family: var(--font-timer);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
