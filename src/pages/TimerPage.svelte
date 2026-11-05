<script lang="ts">
  // Placeholder. Step 4 renders the livesplit-core layout state here.
  import { onMount } from 'svelte';
  import { initCore, parseRun } from '../lib/timer/core';

  onMount(() => {
    // Step 3 smoke check: load the core (all modes), and in dev log the fixture's game name.
    // Replaced by the timer store in step 4.
    void (async () => {
      await initCore();
      if (!import.meta.env.DEV) return;
      const { default: text } = await import('../../tests/fixtures/real-time.lss?raw');
      const run = parseRun(text);
      try {
        console.info(`[livesplit-core] parsed run: ${run.gameName()} / ${run.categoryName()}`);
      } finally {
        run[Symbol.dispose]();
      }
    })().catch((error: unknown) => console.error('[livesplit-core] failed to load', error));
  });
</script>

<section class="timer-page">
  <header class="run-header">
    <div class="game">No run loaded</div>
    <div class="category">Import a .lss file (coming in step 5)</div>
  </header>

  <div class="splits"></div>

  <div class="timer">0.00</div>
</section>

<style>
  .timer-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }

  .run-header {
    text-align: center;
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .game {
    font-size: var(--font-size-lg);
  }

  .category {
    color: var(--color-text-muted);
  }

  .splits {
    flex: 1;
  }

  .timer {
    font-family: var(--font-timer);
    font-variant-numeric: tabular-nums;
    font-size: var(--font-size-timer);
    color: var(--color-not-running);
    text-align: right;
    padding: var(--space-2) var(--space-3);
  }
</style>
