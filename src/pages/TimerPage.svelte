<script lang="ts">
  import { onMount } from 'svelte';
  import { timerStore } from '../lib/timer/timerStore.svelte';
  import { appStorage } from '../lib/storage/appStorage';
  import RunHeader from '../lib/ui/RunHeader.svelte';
  import SplitList from '../lib/ui/SplitList.svelte';
  import BigTimer from '../lib/ui/BigTimer.svelte';
  import InfoList from '../lib/ui/InfoList.svelte';
  import TimerButtons from '../lib/ui/TimerButtons.svelte';
  import RunToolbar from '../lib/ui/RunToolbar.svelte';
  import ImportButton from '../lib/ui/ImportButton.svelte';
  import DuplicatePrompt from '../lib/ui/DuplicatePrompt.svelte';
  import { ImportFlow } from '../lib/ui/importFlow.svelte';
  import { timerUi } from '../lib/ui/timerUi.svelte';
  import InputDeviceStatus from '../lib/ui/InputDeviceStatus.svelte';
  import { inputDevices, inputManager } from '../lib/input/appInput';

  let loadError = $state<string | null>(null);
  /** Imports from the picker or a drop; only errors are shown here (the timer shows the run). */
  const imports = new ImportFlow(appStorage);
  /** Drag-and-drop: > 0 while files are dragged over the window (enter/leave nest). */
  let dragDepth = $state(0);

  onMount(() => {
    timerStore.init().catch((error: unknown) => {
      console.error('[timer] failed to start', error);
      loadError = error instanceof Error ? error.message : String(error);
    });
  });

  function importFile(file: File) {
    void imports.start(file);
  }

  const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

  // Handled on the window, so a file dropped anywhere (also on the nav) is imported
  // instead of the browser navigating away to it.
  function dragEnter(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth++;
  }

  function dragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  function dragLeave(event: DragEvent) {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
  }

  function drop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    const file = event.dataTransfer?.files[0];
    if (file) void importFile(file);
  }

  const view = $derived(timerStore.view);
</script>

<svelte:window
  ondragenter={dragEnter}
  ondragover={dragOver}
  ondragleave={dragLeave}
  ondrop={drop}
/>

<section class="timer-page">
  {#if imports.error}
    <div class="banner" role="alert">
      <span>{imports.error}</span>
      <button type="button" onclick={() => imports.dismiss()} aria-label="Dismiss">×</button>
    </div>
  {/if}
  <DuplicatePrompt flow={imports} />
  {#if appStorage.error}
    <div class="banner" role="alert">
      <span>{appStorage.error}</span>
      <button type="button" onclick={() => appStorage.clearError()} aria-label="Dismiss">×</button>
    </div>
  {/if}

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
    <RunToolbar store={timerStore} onimport={importFile} />
  {:else}
    <div class="empty">
      {#if loadError}
        <p class="error">Could not start the timer: {loadError}</p>
      {:else if timerStore.ready && appStorage.restored}
        <p>Import a .lss file or create new splits.</p>
        <ImportButton onfile={importFile} primary />
        <p class="hint">You can also drop a .lss file anywhere on this page.</p>
        <p class="hint">
          <a href="#/data">Create new splits or load saved ones on the Data page.</a>
        </p>
      {:else}
        <p>Loading…</p>
      {/if}
    </div>
  {/if}

  <InputDeviceStatus devices={inputDevices} />

  {#if dragDepth > 0}
    <div class="drop-overlay" aria-hidden="true">
      <p>
        {!timerStore.attemptInProgress
          ? 'Drop the .lss file to import it'
          : 'Reset the current attempt before importing'}
      </p>
    </div>
  {/if}
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

  .hint a {
    color: var(--color-text);
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

  .drop-overlay {
    position: absolute;
    inset: var(--space-2);
    display: grid;
    place-items: center;
    padding: var(--space-3);
    text-align: center;
    color: var(--color-text);
    background: var(--color-surface);
    border: 2px dashed var(--color-text-muted);
    border-radius: var(--radius-1);
    opacity: 0.95;
    pointer-events: none;
  }
</style>
