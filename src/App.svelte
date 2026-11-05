<script lang="ts">
  import { router } from './lib/router.svelte';
  import TimerPage from './pages/TimerPage.svelte';
  import ControlsPage from './pages/ControlsPage.svelte';
</script>

<div class="shell">
  <nav class="nav">
    <a href="#/" class:active={router.route === 'timer'}>Timer</a>
    <a href="#/controls" class:active={router.route === 'controls'}>Controls</a>
  </nav>

  <main class="page">
    {#if router.route === 'controls'}
      <ControlsPage />
    {:else}
      <TimerPage />
    {/if}
  </main>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    /* Fixed height, so the split list (not the page) scrolls on small windows. */
    height: 100dvh;
  }

  .nav {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .nav a {
    color: var(--color-text-muted);
    text-decoration: none;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-1);
  }

  .nav a.active {
    color: var(--color-text);
    background: var(--color-surface-alt);
  }

  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
</style>
