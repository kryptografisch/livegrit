<script lang="ts">
  // Settings: four tabs, one shown at a time: Splits (saved splits: load/import/new; times
  // of the loaded ones), Timer (comparison, timing method, rows, on-screen buttons),
  // Controls (devices, bindings with capture) and Data (PWA, storage). The tab is in the
  // hash (`#/settings/<tab>`, default Splits). Opened by the Timer page's gear in its own,
  // bigger window (`settingsWindow`); changes reach the Timer window right away
  // (`WindowSync`).
  // Timer input is off on this page (the bindings capture uses it). During an attempt in
  // the Timer window (Settings opened anyway, e.g. typed into another tab) everything here
  // is greyed out and inert: the Timer window doesn't block its input then.
  import { gamepadSource, inputDevices, inputManager } from '../lib/input/appInput';
  import { router } from '../lib/router.svelte';
  import { settingsHash, type SettingsSection } from '../lib/routes';
  import { appStorage } from '../lib/storage/appStorage';
  import { timerStore } from '../lib/timer/timerStore.svelte';
  import BindingsTable from '../lib/ui/BindingsTable.svelte';
  import DataSection from '../lib/ui/DataSection.svelte';
  import SplitsSection from '../lib/ui/SplitsSection.svelte';
  import DevicePanel from '../lib/ui/DevicePanel.svelte';
  import TimerSettings from '../lib/ui/TimerSettings.svelte';
  import { windowSync } from '../lib/sync/appSync';

  const tabs: { id: SettingsSection; label: string }[] = [
    { id: 'splits', label: 'Splits' },
    { id: 'timer', label: 'Timer' },
    { id: 'controls', label: 'Controls' },
    { id: 'data', label: 'Data' },
  ];

  const tab = $derived<SettingsSection>(router.section ?? 'splits');

  /** Opened by the Timer window (a popup it can close), or shown in the same window. */
  const popup = typeof window !== 'undefined' && window.opener !== null;

  /** An attempt runs in the Timer window: nothing can be changed here. */
  const locked = $derived(appStorage.attemptInProgress);

  // "Close settings" in the Timer window's modal (when it didn't open this one itself).
  // Only closes a window a script opened; a normal tab stays (the modal says so).
  $effect(() => windowSync.onCloseRequest(() => window.close()));

  /** Switches the tab (hash replaced, so tabs don't fill the history). */
  function select(event: MouseEvent, id: SettingsSection) {
    event.preventDefault();
    history.replaceState(null, '', settingsHash(id));
    router.section = id;
  }
</script>

<div class="settings-page">
  <header class="top">
    <h1>Settings</h1>
    <nav class="tabs" aria-label="Settings">
      {#each tabs as t (t.id)}
        <a
          href={settingsHash(t.id)}
          class:active={tab === t.id}
          aria-current={tab === t.id ? 'page' : undefined}
          onclick={(e) => select(e, t.id)}>{t.label}</a
        >
      {/each}
    </nav>
    {#if popup}
      <button type="button" onclick={() => window.close()}>Close</button>
    {:else}
      <a class="back" href="#/">Timer</a>
    {/if}
  </header>

  <div class="body">
    {#if locked}
      <p class="locked-note" role="status">
        An attempt is running in the timer window. Settings can be changed again once it is reset or
        finished.
      </p>
    {/if}

    <div class="content" class:locked inert={locked}>
      {#if tab === 'controls'}
        <section>
          <h2>Devices</h2>
          <DevicePanel devices={inputDevices} source={gamepadSource} />

          <h2>Bindings</h2>
          <BindingsTable manager={inputManager} pads={gamepadSource} devices={inputDevices} />

          <p class="note">
            Keyboard keys only reach the timer while its window is focused. Gamepads also work while
            another app (e.g. the game) has the focus. While this page is open, the timer ignores
            both.
          </p>
        </section>
      {:else if tab === 'splits'}
        <section>
          <SplitsSection />
        </section>
      {:else if tab === 'timer'}
        <section>
          <TimerSettings store={timerStore} storage={appStorage} />
        </section>
      {:else}
        <section>
          <DataSection />
        </section>
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-page {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .top {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  h1 {
    margin: 0;
    font-family: var(--font-brand);
    font-size: var(--font-size-lg);
    /* Only the Regular weight is bundled (no faux bold). */
    font-weight: 400;
  }

  .tabs {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .tabs a,
  .back {
    padding: var(--space-1) var(--space-3);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--radius-1);
  }

  .tabs a:hover,
  .back:hover {
    color: var(--color-text);
    background: var(--color-surface-alt);
  }

  .tabs a.active {
    color: var(--color-text);
    background: var(--color-current-split);
  }

  .body {
    padding: var(--space-3) var(--space-3) var(--space-4);
  }

  .locked-note {
    margin: 0 0 var(--space-3);
    padding: var(--space-2) var(--space-3);
    color: var(--color-warning);
    background: var(--color-surface);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-1);
  }

  .content.locked {
    opacity: 0.4;
    filter: grayscale(1);
  }

  h2 {
    font-size: var(--font-size-base);
    margin: var(--space-4) 0 var(--space-2);
  }

  h2:first-child {
    margin-top: 0;
  }

  .note {
    margin: var(--space-4) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  button {
    padding: var(--space-1) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }
</style>
