<script lang="ts">
  import type { TitleView } from '../timer/layoutView';

  let { title }: { title: TitleView } = $props();
</script>

<header class="run-header">
  <div class="game">{title.game}</div>
  {#if title.category}
    <div class="category">{title.category}</div>
  {/if}
  {#if title.attempts !== null || title.finishedRuns !== null}
    <div class="attempts">
      {#if title.finishedRuns !== null}{title.finishedRuns}/{/if}{title.attempts ?? ''}
    </div>
  {/if}
</header>

<style>
  .run-header {
    position: relative;
    text-align: center;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .game {
    font-size: var(--font-size-lg);
    overflow-wrap: anywhere;
  }

  .category {
    color: var(--color-text-muted);
    overflow-wrap: anywhere;
  }

  .attempts {
    position: absolute;
    right: var(--space-3);
    bottom: var(--space-2);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
