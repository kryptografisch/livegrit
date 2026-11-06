<script module lang="ts">
  /** What a removal changes in the shown timing method (final PB times, golds). */
  export type RemovalPreview = {
    /** The PB change, `null` if the PB stays. */
    pb: { from: number | null; to: number | null; run: number | null } | null;
    golds: { name: string; from: number | null; to: number | null }[];
  };
</script>

<script lang="ts">
  // A modal dialog before removing one run (Settings → Splits → Times). When the run is the
  // PB: "update the PB to the next best run"; when it holds golds: "update golds to the best
  // remaining segment" (both on by default, with what changes, `preview`). For the last run
  // the options read "remove the PB" / "remove all golds". Remove or Cancel; Escape (or any
  // other close) = Cancel, focus starts there. Timer input is off while open (`modals`).
  import { untrack } from 'svelte';
  import { formatDuration } from './format';
  import { modals } from './modal.svelte';

  let {
    run,
    last,
    preview,
    busy = false,
    onremove,
    oncancel,
  }: {
    /** The run's attempt id (shown as "#3"). */
    run: number;
    /** It is the last run. */
    last: boolean;
    /** What changes with "update the PB" on or off (shown timing method). */
    preview: (updatePb: boolean) => RemovalPreview;
    busy?: boolean;
    onremove: (options: { updatePb: boolean; updateGolds: boolean }) => void;
    oncancel: () => void;
  } = $props();

  let updatePb = $state(true);
  let updateGolds = $state(true);
  /** The PB change is offered when there is one (with the option on). */
  const pbChange = $derived(preview(true).pb);
  const current = $derived(preview(updatePb));

  let dialog: HTMLDialogElement | undefined = $state();
  let cancelButton: HTMLButtonElement | undefined = $state();
  /** Closed by one of the buttons (not Escape): don't also report "cancel". */
  let chosen = false;

  $effect(() => {
    const element = dialog;
    if (!element) return;
    if (!element.open) element.showModal();
    untrack(() => {
      cancelButton?.focus();
      modals.open++;
    });
    return () => {
      untrack(() => modals.open--);
      if (element.open) element.close();
    };
  });

  function remove() {
    chosen = true;
    onremove({ updatePb: pbChange !== null && updatePb, updateGolds });
  }
</script>

<dialog
  bind:this={dialog}
  class="prompt"
  aria-labelledby="remove-run-title"
  onclose={() => {
    if (!chosen) oncancel();
  }}
>
  <p id="remove-run-title" class="title">remove run #{run}?</p>
  <p class="text">this can't be undone{last ? ', it is the last run' : ''}</p>
  {#if pbChange}
    <label>
      <input type="checkbox" bind:checked={updatePb} />
      <span>{last ? 'remove the PB' : 'update the PB to the next best run'}</span>
    </label>
    <p class="change" class:off={!updatePb}>
      PB {formatDuration(pbChange.from)} → {formatDuration(pbChange.to)}{pbChange.run !== null
        ? ` (#${pbChange.run})`
        : ''}
    </p>
  {/if}
  {#if current.golds.length > 0}
    <label>
      <input type="checkbox" bind:checked={updateGolds} />
      <span>{last ? 'remove all golds' : 'update golds to the best remaining segment'}</span>
    </label>
    <table class:off={!updateGolds}>
      <tbody>
        {#each current.golds as row (row.name)}
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
  <div class="actions">
    <button type="button" class="danger" disabled={busy} onclick={remove}>Remove</button>
    <button
      type="button"
      bind:this={cancelButton}
      disabled={busy}
      onclick={() => {
        chosen = true;
        oncancel();
      }}>Cancel</button
    >
  </div>
</dialog>

<style>
  .prompt {
    width: min(28rem, calc(100vw - 2 * var(--space-3)));
    padding: var(--space-3);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-1);
  }

  .prompt[open] {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .prompt::backdrop {
    background: var(--color-backdrop);
  }

  .title {
    margin: 0;
    font-weight: 600;
  }

  .text {
    margin: 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  table {
    margin-left: var(--space-5);
    border-collapse: collapse;
    font-size: 0.875em;
    font-variant-numeric: tabular-nums;
  }

  .change {
    margin: 0 0 0 var(--space-5);
    font-size: 0.875em;
    font-variant-numeric: tabular-nums;
  }

  /* Stays as it is when its option is off. */
  .change.off,
  table.off {
    opacity: 0.5;
    text-decoration: line-through;
  }

  th,
  td {
    padding: var(--space-1) var(--space-2) var(--space-1) 0;
    text-align: right;
    white-space: nowrap;
  }

  th {
    font-weight: normal;
    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  td.gold {
    color: var(--color-best-segment);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
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

  button.danger {
    border-color: var(--color-warning);
  }

  button:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
</style>
