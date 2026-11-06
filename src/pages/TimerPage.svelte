<script lang="ts">
  // The Timer page: only what's needed during a run (header, split list, big timer, info
  // footer, the optional on-screen buttons, the last used device). The gear (top right)
  // opens the Settings window; while one is open a modal says so and timer input is off.
  // At the bottom: the window size hint (`WindowSizeMemory`).
  import { onMount } from 'svelte';
  import { timerStore } from '../lib/timer/timerStore.svelte';
  import { appStorage } from '../lib/storage/appStorage';
  import RunHeader from '../lib/ui/RunHeader.svelte';
  import SplitList from '../lib/ui/SplitList.svelte';
  import BigTimer from '../lib/ui/BigTimer.svelte';
  import InfoList from '../lib/ui/InfoList.svelte';
  import TimerButtons from '../lib/ui/TimerButtons.svelte';
  import ImportButton from '../lib/ui/ImportButton.svelte';
  import DuplicatePrompt from '../lib/ui/DuplicatePrompt.svelte';
  import { ImportFlow } from '../lib/ui/importFlow.svelte';
  import { timerUi } from '../lib/ui/timerUi.svelte';
  import InputDeviceStatus from '../lib/ui/InputDeviceStatus.svelte';
  import SettingsOpenDialog from '../lib/ui/SettingsOpenDialog.svelte';
  import WindowSizeHint from '../lib/ui/WindowSizeHint.svelte';
  import { WindowSizeMemory } from '../lib/ui/windowSize.svelte';
  import { openSettings } from '../lib/ui/settingsWindow.svelte';
  import { inputDevices, inputManager } from '../lib/input/appInput';

  let loadError = $state<string | null>(null);
  /** Imports from the picker; only errors are shown here (the timer shows the run). */
  const imports = new ImportFlow(appStorage);
  const windowSize = new WindowSizeMemory({
    storage: appStorage,
    read: () => ({ width: window.innerWidth, height: window.innerHeight }),
  });

  onMount(() => {
    timerStore.init().catch((error: unknown) => {
      console.error('[timer] failed to start', error);
      loadError = error instanceof Error ? error.message : String(error);
    });
  });

  // Compared once the saved size is restored; nothing is saved while another page shows.
  $effect(() => {
    if (!appStorage.restored) return;
    windowSize.start();
    return () => windowSize.stop();
  });

  function importFile(file: File) {
    void imports.start(file);
  }

  const view = $derived(timerStore.view);
</script>

<svelte:window onresize={() => windowSize.resize()} />

<section class="timer-page">
  <button
    type="button"
    class="gear"
    onclick={() => openSettings()}
    disabled={timerStore.attemptInProgress}
    aria-label="Settings"
    title={timerStore.attemptInProgress
      ? 'Settings (reset or finish the attempt first)'
      : 'Settings'}
  >
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0-.06.94c0 .32.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  </button>

  {#if imports.error}
    <div class="banner" role="alert">
      <span>{imports.error}</span>
      <button type="button" onclick={() => imports.dismiss()} aria-label="Dismiss">×</button>
    </div>
  {/if}
  <DuplicatePrompt flow={imports} />

  {#if view}
    {#if view.title}
      <RunHeader title={view.title} />
    {/if}
    {#if view.splits}
      <SplitList splits={view.splits} onscroll={(d) => timerStore.scrollSplits(d)} />
    {:else}
      <div class="spacer"></div>
    {/if}
    {#if view.timer}
      <BigTimer timer={view.timer} />
    {/if}
    {#if view.info.length > 0}
      <InfoList info={view.info} />
    {/if}
    {#if timerUi.showButtons}
      <TimerButtons store={timerStore} input={inputManager} />
    {/if}
  {:else}
    <div class="empty">
      {#if loadError}
        <p class="error">Could not start the timer: {loadError}</p>
      {:else if timerStore.ready && appStorage.restored}
        <p>Import a .lss file or create a new run.</p>
        <ImportButton onfile={importFile} primary disabled={imports.busy} />
        <p class="hint">You can also drop a .lss file anywhere on this page.</p>
        <p class="hint">
          <button type="button" class="link" onclick={() => openSettings('splits')}>
            Create new splits or load saved ones in the settings.
          </button>
        </p>
      {:else}
        <p>Loading…</p>
      {/if}
    </div>
  {/if}

  <InputDeviceStatus devices={inputDevices} />
  <WindowSizeHint memory={windowSize} />
  <SettingsOpenDialog />
</section>

<style>
  .timer-page {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-bg);
  }

  /* Small, always visible, over the header's top right corner; greyed out during an
     attempt (Settings can't be opened then). */
  .gear {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    z-index: 1;
    display: grid;
    place-items: center;
    padding: var(--space-1);
    color: var(--color-text-muted);
    background: none;
    border: none;
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .gear:hover:not(:disabled),
  .gear:focus-visible {
    color: var(--color-text);
    background: var(--color-surface-alt);
  }

  /* During an attempt: greyed out (Settings can't be opened then). */
  .gear:disabled {
    cursor: not-allowed;
    color: var(--color-border);
  }

  .spacer {
    flex: 1;
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3);
    color: var(--color-text-muted);
    text-align: center;
  }

  .empty p {
    margin: 0;
  }

  .hint {
    font-size: 0.875em;
  }

  .link {
    padding: 0;
    font: inherit;
    color: var(--color-text);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  .error {
    color: var(--color-warning);
  }

  .banner {
    display: flex;
    align-items: start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    padding-right: 2.5rem; /* room for the gear */
    color: var(--color-warning);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-warning);
  }

  .banner span {
    flex: 1;
  }

  .banner button {
    padding: 0 var(--space-2);
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
