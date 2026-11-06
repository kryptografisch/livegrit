<script lang="ts">
  import { router } from './lib/router.svelte';
  import TimerPage from './pages/TimerPage.svelte';
  import ControlsPage from './pages/ControlsPage.svelte';
  import DataPage from './pages/DataPage.svelte';
  import { timerStore } from './lib/timer/timerStore.svelte';
  import { wakeLock } from './lib/wakeLock';
  import { gamepadSource, inputManager, keyboardSource } from './lib/input/appInput';
  import { appStorage } from './lib/storage/appStorage';
  import { modals } from './lib/ui/modal.svelte';
  import { startPwa } from './lib/pwa/appPwa';
  import UpdatePrompt from './lib/ui/UpdatePrompt.svelte';
  import InstallPrompt from './lib/ui/InstallPrompt.svelte';

  // Service worker: offline start and the "Update available" prompt (never mid-run).
  $effect(() => {
    startPwa();
  });

  // Restore the settings and the last run (on every start page), then keep them saved.
  // A core load error is shown by the Timer page.
  $effect(() => {
    appStorage.start().catch(() => {});
  });

  // Timer keys only act on the Timer page (the Controls page captures input for bindings,
  // the Data page has text fields), and not while a modal dialog is open.
  $effect(() => {
    inputManager.enabled = router.route === 'timer' && modals.open === 0;
  });

  $effect(() => {
    inputManager.addSource(keyboardSource);
    inputManager.addSource(gamepadSource);
    return () => {
      inputManager.removeSource(keyboardSource);
      inputManager.removeSource(gamepadSource);
    };
  });

  // Keep the screen awake while an attempt is running, on every page. Released on pause,
  // reset and finish (the phase is no longer 'Running').
  $effect(() => {
    wakeLock.setActive(timerStore.phase === 'Running');
  });
</script>

<div class="shell">
  <InstallPrompt />
  <nav class="nav">
    <a href="#/" class:active={router.route === 'timer'}>Timer</a>
    <a href="#/controls" class:active={router.route === 'controls'}>Controls</a>
    <a href="#/data" class:active={router.route === 'data'}>Data</a>
  </nav>
  <UpdatePrompt />

  <main class="page">
    {#if router.route === 'controls'}
      <ControlsPage />
    {:else if router.route === 'data'}
      <DataPage />
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
