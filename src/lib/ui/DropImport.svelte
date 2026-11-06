<script lang="ts">
  // Drag-and-drop import on every page (handled on the window, so a file dropped anywhere
  // is imported instead of the browser navigating away to it). Refused during an attempt
  // (also one in another window). Errors show as a dismissible banner on this page.
  import { appStorage } from '../storage/appStorage';
  import DuplicatePrompt from './DuplicatePrompt.svelte';
  import { ImportFlow } from './importFlow.svelte';

  const imports = new ImportFlow(appStorage);
  /** > 0 while files are dragged over the window (enter/leave nest). */
  let dragDepth = $state(0);

  const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

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
    if (file) void imports.start(file);
  }
</script>

<svelte:window
  ondragenter={dragEnter}
  ondragover={dragOver}
  ondragleave={dragLeave}
  ondrop={drop}
/>

{#if imports.error}
  <div class="banner" role="alert">
    <span>{imports.error}</span>
    <button type="button" onclick={() => imports.dismiss()} aria-label="Dismiss">×</button>
  </div>
{/if}
<DuplicatePrompt flow={imports} />

{#if dragDepth > 0}
  <div class="drop-overlay" aria-hidden="true">
    <p>
      {!appStorage.attemptInProgress
        ? 'Drop the .lss file to import it'
        : 'Reset the current attempt before importing'}
    </p>
  </div>
{/if}

<style>
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
    position: fixed;
    inset: var(--space-2);
    z-index: 10;
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
