<script lang="ts">
  import { router } from './lib/router.svelte';
  import TimerPage from './pages/TimerPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';
  import { timerStore } from './lib/timer/timerStore.svelte';
  import { wakeLock } from './lib/wakeLock';
  import { gamepadSource, inputManager, keyboardSource } from './lib/input/appInput';
  import { appStorage } from './lib/storage/appStorage';
  import { windowSync } from './lib/sync/appSync';
  import { modals } from './lib/ui/modal.svelte';
  import { startPwa } from './lib/pwa/appPwa';
  import UpdatePrompt from './lib/ui/UpdatePrompt.svelte';
  import InstallPrompt from './lib/ui/InstallPrompt.svelte';
  import DropImport from './lib/ui/DropImport.svelte';
  import StorageErrorBanner from './lib/ui/StorageErrorBanner.svelte';

  // Service worker: offline start and the "Update available" prompt (never mid-run).
  $effect(() => {
    startPwa();
  });

  // Restore the settings and the last run (on every start page), then keep them saved.
  // A core load error is shown by the Timer page.
  $effect(() => {
    appStorage.start().catch(() => {});
  });

  // The other windows: who shows Timer/Settings, and saved changes (`StorageSync`).
  $effect(() => {
    windowSync.start();
  });

  $effect(() => {
    windowSync.setState(router.route, timerStore.phase);
  });

  // Timer keys only act on the Timer page (the Settings page captures input for bindings
  // and has text fields), and not while a modal dialog is open (incl. "Settings open").
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
  <UpdatePrompt />
  <StorageErrorBanner />
  <DropImport />

  <main class="page">
    {#if router.route === 'settings'}
      <SettingsPage />
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

  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
</style>
