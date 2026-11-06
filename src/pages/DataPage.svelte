<script lang="ts">
  // Data: saved splits (the loaded ones marked; load, export, delete, + new splits, import)
  // and storage status. Everything is stored in this browser; the .lss export is the real
  // backup.
  import { appStorage } from '../lib/storage/appStorage';
  import { timerStore } from '../lib/timer/timerStore.svelte';
  import DuplicatePrompt from '../lib/ui/DuplicatePrompt.svelte';
  import ImportButton from '../lib/ui/ImportButton.svelte';
  import { ImportFlow } from '../lib/ui/importFlow.svelte';
  import NewRunForm from '../lib/ui/NewRunForm.svelte';
  import RunList from '../lib/ui/RunList.svelte';
  import StoragePanel from '../lib/ui/StoragePanel.svelte';
  import InstallButton from '../lib/ui/InstallButton.svelte';
  import { pwaInstall } from '../lib/pwa/appPwa';

  const imports = new ImportFlow(appStorage);
  /** The last create result; import results come from `imports`. */
  let created = $state<string | null>(null);
  let creating = $state(false);

  const ready = $derived(timerStore.ready && appStorage.restored);
  const attemptRunning = $derived(timerStore.attemptInProgress);

  /** Shown under the buttons: an import error or the create result. */
  const message = $derived(imports.error ?? created);

  function importFile(file: File) {
    created = null;
    void imports.start(file);
  }
</script>

<section class="data-page">
  <h1>Data</h1>

  {#if appStorage.error}
    <div class="banner" role="alert">
      <span>{appStorage.error}</span>
      <button type="button" onclick={() => appStorage.clearError()} aria-label="Dismiss">×</button>
    </div>
  {/if}

  {#if !ready}
    <p class="muted">Loading…</p>
  {:else}
    <h2>Saved splits</h2>
    {#if attemptRunning}
      <p class="muted hint">An attempt is in progress: reset it before loading other splits.</p>
    {:else if timerStore.phase === 'Ended'}
      <p class="muted hint">
        The finished attempt is saved. Loading, importing or creating splits resets the timer first.
      </p>
    {/if}
    <RunList storage={appStorage} store={timerStore} />
    <div class="new" class:creating>
      <NewRunForm
        storage={appStorage}
        store={timerStore}
        bind:open={creating}
        oncreated={(text) => {
          imports.dismiss();
          created = text;
        }}
      />
      {#if !creating}
        <ImportButton onfile={importFile} disabled={attemptRunning || imports.busy} />
      {/if}
    </div>
    <DuplicatePrompt flow={imports} />
    {#if message && !creating && !imports.pending}
      <p class="muted" class:error={message === imports.error} role="status">{message}</p>
    {/if}

    {#if !pwaInstall.installed}
      <h2>Progressive Web App</h2>
      <div class="install">
        <InstallButton />
        <p>
          Install split-lite as an app on your desktop or home screen: it opens in its own window
          and starts offline.
        </p>
      </div>
    {/if}

    <h2>Storage</h2>
    <StoragePanel available={appStorage.available} />
  {/if}
</section>

<style>
  .data-page {
    padding: var(--space-3);
    max-width: 48rem;
  }

  h1 {
    font-size: var(--font-size-lg);
    margin: 0 0 var(--space-2);
  }

  h2 {
    font-size: var(--font-size-base);
    margin: var(--space-4) 0 var(--space-2);
  }

  .new {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .install {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
  }

  .install p {
    flex: 1 1 16rem;
    margin: 0;
  }

  /* The open form takes the whole row. */
  .new.creating {
    display: block;
  }

  .muted {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .muted.error {
    color: var(--color-warning);
  }

  .hint {
    margin: 0 0 var(--space-2);
  }

  button {
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .banner {
    display: flex;
    align-items: start;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-2) var(--space-3);
    color: var(--color-warning);
    background: var(--color-surface);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-1);
  }

  .banner span {
    flex: 1;
  }

  .banner button {
    padding: 0 var(--space-2);
    color: inherit;
    background: none;
    border: none;
  }
</style>
