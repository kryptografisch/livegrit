<script lang="ts">
  // Settings → Splits: saved splits (the loaded ones marked; load, export, delete, + new
  // splits, import), then the loaded splits in sub-tabs: Base Info (Edit: game, category,
  // offset on a copy of the run, `RunDraft`; Reset all times), Golds (read-only), Times (×
  // removes a run). While Base Info is being edited, nothing else loads, imports, deletes or
  // removes here, and switching the tab with unsaved changes asks first. The splits change in
  // the Timer window too; they can't while an attempt runs there
  // (`appStorage.attemptInProgress`).
  import { onDestroy } from 'svelte';
  import { appStorage } from '../storage/appStorage';
  import { runDisplayName } from '../storage/db';
  import type { RunDraft } from '../timer/runDraft.svelte';
  import { timerStore } from '../timer/timerStore.svelte';
  import AttemptTable from './AttemptTable.svelte';
  import BaseInfo from './BaseInfo.svelte';
  import DuplicatePrompt from './DuplicatePrompt.svelte';
  import Golds from './Golds.svelte';
  import ImportButton from './ImportButton.svelte';
  import { ImportFlow } from './importFlow.svelte';
  import NewRunForm from './NewRunForm.svelte';
  import RunList from './RunList.svelte';
  import UnsavedPrompt from './UnsavedPrompt.svelte';

  const imports = new ImportFlow(appStorage);
  /** The last create result; import results come from `imports`. */
  let created = $state<string | null>(null);
  let creating = $state(false);

  const ready = $derived(timerStore.ready && appStorage.restored);
  const attemptRunning = $derived(appStorage.attemptInProgress);

  /** Shown under the buttons: an import error or the create result. */
  const message = $derived(imports.error ?? created);

  function importFile(file: File) {
    created = null;
    void imports.start(file);
  }

  /** The loaded splits' views, one shown at a time. */
  type Subtab = 'info' | 'golds' | 'times';
  const subtabs: { id: Subtab; label: string }[] = [
    { id: 'info', label: 'Base Info' },
    { id: 'golds', label: 'Golds' },
    { id: 'times', label: 'Times' },
  ];
  let subtab = $state<Subtab>('info');
  /** A tab switch waiting for the unsaved-changes dialog. */
  let pendingSubtab = $state<Subtab | null>(null);

  /** Switches the tab; with unsaved changes in the edit, the dialog asks first. */
  function selectSubtab(id: Subtab) {
    if (id === subtab) return;
    if (draft?.changed) pendingSubtab = id;
    else subtab = id;
  }

  async function leaveEdit(action: 'save' | 'discard') {
    const target = pendingSubtab;
    if (action === 'save') await saveEdit();
    else cancelEdit();
    pendingSubtab = null;
    // Saving can be refused (the edit stays open, with the reason): stay on this tab then.
    if (target && draft === null) subtab = target;
  }

  /** The open Base Info edit of the loaded splits. */
  let draft = $state.raw<RunDraft | null>(null);
  let saving = $state(false);
  /** A problem with the edit (starting or saving it). */
  let editError = $state<string | null>(null);
  /** The loaded run changed (another window) since the edit started: it can't be saved. */
  const stale = $derived(draft !== null && draft.revision !== timerStore.runRevision);

  function startEdit() {
    editError = null;
    const result = appStorage.startEdit();
    if (typeof result === 'string') editError = result;
    else draft = result;
  }

  function cancelEdit() {
    draft?.dispose();
    draft = null;
    editError = null;
  }

  async function saveEdit() {
    const current = draft;
    if (!current || saving) return;
    if (!current.changed) {
      cancelEdit();
      return;
    }
    saving = true;
    try {
      const error = await appStorage.saveEdit(current);
      // The draft is closed once the save got past its checks, also when loading failed.
      if (!current.open) draft = null;
      editError = error;
    } finally {
      saving = false;
    }
  }

  onDestroy(() => draft?.dispose());

  // The splits were unloaded (deleted in another window): nothing left to edit.
  $effect(() => {
    if (draft && timerStore.segmentNames.length === 0) cancelEdit();
  });

  /** The loaded splits, shown above the tabs (a loaded run has ≥ 1 segment). */
  const loadedName = $derived(
    timerStore.segmentNames.length > 0
      ? runDisplayName(timerStore.gameName, timerStore.categoryName)
      : null,
  );
</script>

{#if !ready}
  <p class="muted">Loading…</p>
{:else}
  <h2>Saved splits</h2>
  {#if attemptRunning}
    <p class="muted hint">An attempt is in progress: reset it before loading other splits.</p>
  {:else if appStorage.attemptEnded}
    <p class="muted hint">
      The finished attempt is saved. Loading, importing or creating splits resets the timer first.
    </p>
  {/if}
  <RunList storage={appStorage} editing={draft !== null} />
  {#if draft}
    <p class="muted">editing the loaded splits: save or cancel in Base Info</p>
  {:else}
    <div class="new" class:creating>
      <NewRunForm
        storage={appStorage}
        bind:open={creating}
        oncreated={(text) => {
          imports.dismiss();
          created = text;
        }}
      />
      {#if !creating}
        <ImportButton onfile={importFile} disabled={attemptRunning || imports.busy} />
        <span class="drop-hint">or drag &amp; drop a .lss file onto this page</span>
      {/if}
    </div>
  {/if}
  <DuplicatePrompt flow={imports} />
  {#if message && !creating && !imports.pending}
    <p class="muted" class:error={message === imports.error} role="status">{message}</p>
  {/if}

  {#if loadedName}
    <h2 class="loaded-name">{loadedName}</h2>
    <div class="subtabs">
      <div class="tablist" role="tablist" aria-label={loadedName}>
        {#each subtabs as t (t.id)}
          <button
            type="button"
            role="tab"
            id={`splits-tab-${t.id}`}
            aria-selected={subtab === t.id}
            aria-controls="splits-panel"
            class:active={subtab === t.id}
            onclick={() => selectSubtab(t.id)}>{t.label}</button
          >
        {/each}
      </div>
    </div>
    {#if stale}
      <p class="muted error" role="status">
        the splits changed in another window meanwhile: cancel and edit again
      </p>
    {/if}
    {#if editError}<p class="muted error" role="status">{editError}</p>{/if}
    <div id="splits-panel" role="tabpanel" aria-labelledby={`splits-tab-${subtab}`}>
      {#if subtab === 'info'}
        <BaseInfo
          store={timerStore}
          storage={appStorage}
          {draft}
          {saving}
          canSave={!stale}
          onedit={startEdit}
          onsave={() => void saveEdit()}
          oncancel={cancelEdit}
        />
      {:else if subtab === 'golds'}
        <Golds store={timerStore} />
      {:else}
        <AttemptTable store={timerStore} storage={appStorage} disabled={draft !== null} />
      {/if}
    </div>
    {#if pendingSubtab && draft}
      <UnsavedPrompt
        busy={saving}
        onsave={() => void leaveEdit('save')}
        ondiscard={() => void leaveEdit('discard')}
        onstay={() => (pendingSubtab = null)}
      />
    {/if}
  {:else}
    <p class="muted no-splits">no splits loaded</p>
  {/if}
{/if}

<style>
  h2 {
    font-size: var(--font-size-base);
    margin: var(--space-4) 0 var(--space-2);
  }

  h2:first-child {
    margin-top: 0;
  }

  .new {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .drop-hint {
    align-self: center;
    font-size: 0.875em;
    color: var(--color-text-muted);
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

  /* Base Info / Golds / Times, like the Settings tabs, under the splits name. */
  .subtabs {
    margin: 0 0 var(--space-3);
  }

  .tablist {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .tablist button {
    padding: var(--space-1) var(--space-3);
    font: inherit;
    color: var(--color-text-muted);
    background: none;
    border: none;
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .tablist button:hover {
    color: var(--color-text);
    background: var(--color-surface-alt);
  }

  .tablist button.active {
    color: var(--color-text);
    background: var(--color-current-split);
  }

  .no-splits {
    margin-top: var(--space-4);
  }

  .loaded-name {
    overflow-wrap: anywhere;
  }
</style>
