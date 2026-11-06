<script lang="ts">
  // The Timer page: only what's needed during a run (header, split list, big timer, info
  // footer, the optional on-screen buttons). Which parts show is set in Settings → Timer →
  // UI (`timerUi.layout`). At the bottom: the window size hint (`WindowSizeMemory`), then
  // a bar with the used input devices and the gear (always there), which opens the
  // Settings window; while one is open a modal says so and timer input is off.
  import { onMount, untrack } from 'svelte';
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
  import SettingsHint from '../lib/ui/SettingsHint.svelte';
  import GearIcon from '../lib/ui/GearIcon.svelte';
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
  // Untracked: `start` reads and writes state (that must not re-run this effect).
  $effect(() => {
    if (!appStorage.restored) return;
    untrack(() => windowSize.start());
    return () => windowSize.stop();
  });

  function importFile(file: File) {
    void imports.start(file);
  }

  const view = $derived(timerStore.view);
  const layout = $derived(timerUi.layout);
  const headerGame = $derived(layout.headerGame ? timerStore.gameName : '');
  const headerCategory = $derived(layout.headerCategory ? timerStore.categoryName : '');
  const showHeader = $derived(
    layout.header &&
      (headerGame !== '' ||
        headerCategory !== '' ||
        (layout.headerAttempts &&
          (view?.title?.attempts != null || view?.title?.finishedRuns != null))),
  );
  const infoShown = $derived({
    previousSegment: layout.infoPreviousSegment,
    sumOfBest: layout.infoSumOfBest,
    possibleTimeSave: layout.infoPossibleTimeSave,
  });
  const info = $derived(
    layout.info && view ? view.info.filter((item) => item.id === null || infoShown[item.id]) : [],
  );
  /** No splits loaded and none saved: points out the gear (`SettingsHint`). */
  const newUser = $derived(
    appStorage.restored && timerStore.ready && !view && appStorage.runs.length === 0,
  );
</script>

<svelte:window onresize={() => windowSize.resize()} />

<section class="timer-page" style:--text-scale={layout.textScale / 100}>
  {#if imports.error}
    <div class="banner" role="alert">
      <span>{imports.error}</span>
      <button type="button" onclick={() => imports.dismiss()} aria-label="Dismiss">×</button>
    </div>
  {/if}
  <DuplicatePrompt flow={imports} />

  {#if view}
    {#if view.title && showHeader}
      <RunHeader
        title={view.title}
        game={headerGame}
        category={headerCategory}
        showAttempts={layout.headerAttempts}
      />
    {/if}
    {#if view.splits}
      <SplitList splits={view.splits} onscroll={(d) => timerStore.scrollSplits(d)} />
    {:else}
      <div class="spacer"></div>
    {/if}
    {#if view.timer}
      <BigTimer timer={view.timer} scale={layout.timerScale} />
    {/if}
    {#if info.length > 0}
      <InfoList {info} />
    {/if}
    {#if timerUi.showButtons}
      <TimerButtons store={timerStore} input={inputManager} />
    {/if}
  {:else}
    <div class="empty">
      <header class="intro">
        <h1>LiveGrit</h1>
        <p>simple, opinionated speedrun split timer<br />built as a PWA</p>
      </header>
      {#if loadError}
        <p class="error">could not start the timer: {loadError}</p>
      {:else if timerStore.ready && appStorage.restored}
        <div class="dropzone">
          <p class="dropzone-title">import your existing splits</p>
          <p class="dropzone-types">provide your .lss file to import splits and times</p>
          <div class="dropzone-action">
            <ImportButton onfile={importFile} label="choose file" primary disabled={imports.busy} />
          </div>
          <p class="dropzone-hint">or drop it anywhere on this page</p>
        </div>
        <p class="hint settings-hint">
          create new splits or load saved ones in the
          <button type="button" class="link" onclick={() => openSettings('splits')}>
            <GearIcon size={14} /><span>settings</span>
          </button>
        </p>
      {:else}
        <p>loading…</p>
      {/if}
    </div>
  {/if}

  <WindowSizeHint memory={windowSize} />
  <footer class="bottom-bar">
    {#if layout.inputDevices}
      <InputDeviceStatus devices={inputDevices} />
    {/if}
    <div class="settings">
      {#if newUser}
        <SettingsHint />
      {/if}
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
        <GearIcon size={16} />
      </button>
    </div>
  </footer>
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

  /* The devices text centered (between two equal side columns), the settings group on
     the right. Without the devices text only the gear is left, still on the right. */
  .bottom-bar {
    display: grid;
    grid-template-columns: 1fr minmax(0, max-content) 1fr;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-1) 0 var(--space-3);
    font-size: 0.75em;
  }

  .bottom-bar > :global(.input-device) {
    grid-column: 2;
  }

  .settings {
    grid-column: 3;
    justify-self: end;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  /* Small, always visible; greyed out during an attempt (Settings can't be opened then). */
  .gear {
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

  /* Plain `p` (lower specificity than one class), so the classes below can set margins. */
  p {
    margin: 0;
  }

  .intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: calc(2 * var(--space-4));
  }

  .intro h1 {
    margin: 0;
    font-family: var(--font-brand);
    font-size: 2.6rem;
    font-weight: 400;
    color: var(--color-text);
    letter-spacing: 0.3rem;
  }

  .hint {
    font-size: 0.875em;
  }

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(25rem, 100%);
    min-height: 16.75rem;
    padding: calc(2 * var(--space-3)) var(--space-4) var(--space-3);
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px dashed var(--color-text-muted);
    border-radius: var(--radius-2);
  }

  .dropzone-title {
    margin-bottom: 0.375rem;
    font-weight: 600;
  }

  .dropzone-types {
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  /* Bottom center of the zone. */
  /* Takes the free space between the text and the hint; the button sits in its middle. */
  .dropzone-action {
    flex: 1;
    display: grid;
    place-items: center;
    padding-block: var(--space-3);
  }

  /* At the bottom: the zone's bottom padding (`--space-3`) keeps it 1rem above the edge. */
  .dropzone-hint {
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .settings-hint {
    margin-top: var(--space-4);
  }

  /* Gear + underlined word, in the text color (the gear uses `currentColor`). */
  .link {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    padding: 0;
    font: inherit;
    vertical-align: bottom;
    color: var(--color-text);
    background: none;
    border: none;
    cursor: pointer;
  }

  .link span {
    text-decoration: underline;
  }

  .error {
    color: var(--color-warning);
  }

  .banner {
    display: flex;
    align-items: start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
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
