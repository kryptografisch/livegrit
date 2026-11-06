<script lang="ts">
  // The run's game and category plus the attempt counter. Each part can be hidden
  // (Settings → Timer → UI); the parent leaves the header out when nothing is left.
  import type { TitleView } from '../timer/layoutView';

  let {
    title,
    game,
    category,
    showAttempts = true,
  }: {
    title: TitleView;
    /** Empty = not shown. */
    game: string;
    category: string;
    showAttempts?: boolean;
  } = $props();

  const attempts = $derived(
    showAttempts && (title.attempts !== null || title.finishedRuns !== null),
  );
</script>

<header class="run-header">
  {#if game}
    <div class="game">{game}</div>
  {/if}
  {#if category}
    <div class="category" class:only={!game}>{category}</div>
  {/if}
  {#if attempts}
    <div class="attempts">
      {#if title.finishedRuns !== null}{title.finishedRuns}/{/if}{title.attempts ?? ''}
    </div>
  {/if}
</header>

<style>
  .run-header {
    position: relative;
    min-height: calc(1lh + 2 * var(--space-2));
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

  /* Without the game name the category is the header's main line. */
  .category.only {
    color: var(--color-text);
  }

  .attempts {
    position: absolute;
    right: var(--space-3);
    bottom: var(--space-2);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
