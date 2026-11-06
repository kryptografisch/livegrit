<script lang="ts">
  // Settings → Splits → Base Info: game, category and offset of the loaded splits. Edit turns
  // them into fields (`draft`, owned by the caller: `onedit` / `onsave` / `oncancel`).
  // "Recalculate PB and golds" (dialog with what changes) sets them from the recorded runs
  // (`StorageSync.recalculateBestTimes`); "Reset all times" (confirm dialog) clears all runs,
  // the PB and the golds (`StorageSync.resetAllTimes`). Both save right away; all buttons
  // are off during an attempt.
  import type { StorageSync } from '../storage/storageSync.svelte';
  import type { RunDraft } from '../timer/runDraft.svelte';
  import type { TimerStore } from '../timer/timerStore.svelte';
  import { core } from '../timer/core';
  import ConfirmPrompt from './ConfirmPrompt.svelte';
  import { formatDuration } from './format';

  let {
    store,
    storage,
    draft,
    saving = false,
    canSave = true,
    onedit,
    onsave,
    oncancel,
  }: {
    store: TimerStore;
    storage: StorageSync;
    draft: RunDraft | null;
    saving?: boolean;
    /** Save is possible (e.g. not while the splits changed in another window). */
    canSave?: boolean;
    onedit: () => void;
    onsave: () => void;
    oncancel: () => void;
  } = $props();

  const attemptRunning = $derived(storage.attemptInProgress);
  /** The open confirm dialog. */
  let confirm = $state<'reset' | 'recalculate' | null>(null);
  let resetting = $state(false);
  let resetError = $state<string | null>(null);

  /** What "Recalculate PB and golds" changes in the shown timing method (when its dialog opens). */
  const recalculation = $derived.by(() => {
    if (confirm !== 'recalculate') return null;
    const plans = storage.recalculationPlan();
    const method = core().TimingMethod[store.timingMethod];
    const plan = plans.find((p) => p.method === method);
    return {
      pb: plan?.pb ?? null,
      golds: (plan?.golds ?? []).map((c) => ({
        name: store.segmentNames[c.segment] ?? `#${c.segment + 1}`,
        from: c.from,
        to: c.to,
      })),
      otherMethod: plans.some((p) => p.method !== method),
      none: plans.length === 0,
    };
  });

  async function run(action: () => Promise<string | null>) {
    resetting = true;
    try {
      resetError = await action();
    } finally {
      resetting = false;
      confirm = null;
    }
  }

  /** The offset field couldn't be read as a time. */
  let offsetError = $state(false);

  function setOffset(input: HTMLInputElement) {
    if (!draft) return;
    offsetError = !draft.setOffset(input.value);
    // Back to what the core has (its own formatting, or the old value when unreadable).
    input.value = draft.state.offset;
  }
</script>

{#if draft}
  <div class="fields">
    <label>
      <span>game</span>
      <input
        type="text"
        autocomplete="off"
        value={draft.state.game}
        onchange={(e) => draft.setGame(e.currentTarget.value)}
      />
    </label>
    <label>
      <span>category</span>
      <input
        type="text"
        autocomplete="off"
        value={draft.state.category}
        onchange={(e) => draft.setCategory(e.currentTarget.value)}
      />
    </label>
    <label>
      <span>offset</span>
      <input
        type="text"
        class="time"
        autocomplete="off"
        inputmode="decimal"
        value={draft.state.offset}
        aria-invalid={offsetError}
        onchange={(e) => setOffset(e.currentTarget)}
      />
      {#if offsetError}<span class="error">not a time, e.g. 0, -5.5 or 1:00</span>{/if}
    </label>
  </div>
{:else}
  <dl class="fields">
    <dt>game</dt>
    <dd>{store.gameName || '-'}</dd>
    <dt>category</dt>
    <dd>{store.categoryName || '-'}</dd>
    <dt>offset</dt>
    <dd class="time">{formatDuration(store.offset)}</dd>
  </dl>
{/if}

<div class="actions">
  {#if draft}
    <button type="button" disabled={saving || !canSave} onclick={onsave}>Save</button>
    <button type="button" disabled={saving} onclick={oncancel}>Cancel</button>
  {:else}
    <button
      type="button"
      disabled={attemptRunning || resetting}
      title={attemptRunning ? 'reset the current attempt first' : undefined}
      onclick={() => {
        resetError = null;
        onedit();
      }}>Edit</button
    >
    <button
      type="button"
      disabled={attemptRunning || resetting}
      title={attemptRunning ? 'reset the current attempt first' : undefined}
      onclick={() => {
        resetError = null;
        confirm = 'recalculate';
      }}>Recalculate PB and golds</button
    >
    <button
      type="button"
      class="danger"
      disabled={attemptRunning || resetting}
      title={attemptRunning ? 'reset the current attempt first' : undefined}
      onclick={() => {
        resetError = null;
        confirm = 'reset';
      }}>Reset all times</button
    >
  {/if}
</div>
{#if resetError}<p class="message error" role="status">{resetError}</p>{/if}

{#if confirm === 'reset'}
  <ConfirmPrompt
    title="reset all times?"
    text="clears all runs, the PB and all golds, and sets the attempts to 0. names, offset and custom comparisons stay. this can't be undone"
    confirmLabel="Reset all times"
    busy={resetting}
    onconfirm={() => void run(() => storage.resetAllTimes())}
    oncancel={() => (confirm = null)}
  />
{:else if confirm === 'recalculate' && recalculation}
  {@const plan = recalculation}
  <ConfirmPrompt
    title="recalculate PB and golds?"
    text={plan.none
      ? 'they already match the recorded runs'
      : 'sets the PB to the fastest finished run and each gold to the fastest time of its segment among the runs. the runs stay'}
    confirmLabel="Recalculate"
    busy={resetting}
    disabled={plan.none}
    onconfirm={() => void run(() => storage.recalculateBestTimes())}
    oncancel={() => (confirm = null)}
  >
    {#if plan.pb || plan.golds.length > 0}
      <table class="preview">
        <tbody>
          {#if plan.pb}
            <tr>
              <th scope="row">PB</th>
              <td>{formatDuration(plan.pb.from)}</td>
              <td aria-hidden="true">→</td>
              <td>
                {formatDuration(plan.pb.to?.at(-1) ?? null)}{plan.pb.run !== null
                  ? ` (#${plan.pb.run})`
                  : ''}
              </td>
            </tr>
          {/if}
          {#each plan.golds as row (row.name)}
            <tr>
              <th scope="row">{row.name}</th>
              <td class="gold">{formatDuration(row.from)}</td>
              <td aria-hidden="true">→</td>
              <td class="gold">{formatDuration(row.to)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
    {#if plan.otherMethod}
      <p class="message">the other timing method changes too</p>
    {/if}
  </ConfirmPrompt>
{/if}

<style>
  .fields {
    display: grid;
    grid-template-columns: max-content minmax(0, 20rem);
    align-items: center;
    gap: var(--space-2) var(--space-3);
    margin: 0 0 var(--space-3);
  }

  label {
    display: contents;
  }

  label > span:first-child,
  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-1) var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  input[aria-invalid='true'] {
    border-color: var(--color-warning);
  }

  .time {
    font-variant-numeric: tabular-nums;
  }

  .error {
    grid-column: 2;
    font-size: 0.875em;
    color: var(--color-warning);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .actions button {
    padding: var(--space-1) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .actions button.danger {
    border-color: var(--color-warning);
  }

  .actions button:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }

  .message {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
  }

  .message.error {
    color: var(--color-warning);
  }

  .preview {
    border-collapse: collapse;
    font-size: 0.875em;
    font-variant-numeric: tabular-nums;
  }

  .preview th,
  .preview td {
    padding: var(--space-1) var(--space-2) var(--space-1) 0;
    text-align: right;
    white-space: nowrap;
  }

  .preview th {
    font-weight: normal;
    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .preview td.gold {
    color: var(--color-best-segment);
  }
</style>
