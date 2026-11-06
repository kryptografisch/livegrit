<script lang="ts">
  // Settings → Splits: saved splits (the loaded ones marked; load, export, delete, + new
  // splits, import) and the runs of the loaded splits, sorted by Latest or Best (full run
  // time); a placeholder table with dummy runs for now. The
  // splits change in the Timer window too; they can't while an attempt runs there
  // (`appStorage.attemptInProgress`).
  import { appStorage } from '../storage/appStorage';
  import { timerStore } from '../timer/timerStore.svelte';
  import DuplicatePrompt from './DuplicatePrompt.svelte';
  import ImportButton from './ImportButton.svelte';
  import { ImportFlow } from './importFlow.svelte';
  import NewRunForm from './NewRunForm.svelte';
  import RunList from './RunList.svelte';
  import { formatClock, formatDate } from './format';
  import { bestRun, sortRuns, type RunSort } from './runSort';

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

  /** Placeholder runs until the real ones are shown (from the loaded splits' history). */
  const dummyRuns = [
    { attempt: 1, started: Date.UTC(2026, 10, 1, 18), time: 1_843_000, text: '30:43.00' },
    { attempt: 2, started: Date.UTC(2026, 10, 2, 18), time: null, text: '-' },
    { attempt: 3, started: Date.UTC(2026, 10, 3, 18), time: 1_789_500, text: '29:49.50' },
    { attempt: 4, started: Date.UTC(2026, 10, 4, 18), time: 1_812_250, text: '30:12.25' },
  ];

  let sort = $state<RunSort>('latest');
  const runs = $derived(sortRuns(dummyRuns, sort));
  /** Shown in gold, whatever the sort. */
  const best = $derived(bestRun(dummyRuns));
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
  <RunList storage={appStorage} />
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
  <DuplicatePrompt flow={imports} />
  {#if message && !creating && !imports.pending}
    <p class="muted" class:error={message === imports.error} role="status">{message}</p>
  {/if}

  <h2>Times of the loaded splits</h2>
  <p class="muted hint">Placeholder: the real times follow later.</p>
  <div class="sort" role="group" aria-label="Sort runs">
    Sort
    <div class="toggle">
      <button type="button" aria-pressed={sort === 'latest'} onclick={() => (sort = 'latest')}
        >Latest</button
      >
      <button type="button" aria-pressed={sort === 'best'} onclick={() => (sort = 'best')}
        >Best</button
      >
    </div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">Attempt</th>
          <th scope="col">Date</th>
          <th scope="col">Time</th>
          <th scope="col">Run time</th>
        </tr>
      </thead>
      <tbody>
        {#each runs as run (run.attempt)}
          <tr class:best={run === best}>
            <th scope="row">#{run.attempt}</th>
            <td class="date">{formatDate(run.started)}</td>
            <td class="date">{formatClock(run.started)}</td>
            <td>{run.text}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
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

  .sort {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    color: var(--color-text-muted);
  }

  .toggle {
    display: flex;
  }

  .toggle button {
    padding: var(--space-1) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: 0;
    cursor: pointer;
  }

  .toggle button:first-child {
    border-radius: var(--radius-1) 0 0 var(--radius-1);
  }

  .toggle button:last-child {
    border-left: none;
    border-radius: 0 var(--radius-1) var(--radius-1) 0;
  }

  .toggle button[aria-pressed='true'] {
    background: var(--color-current-split);
  }

  /* The best run (fastest full run): gold text, like a best segment. */
  tr.best th,
  tr.best td {
    color: var(--color-best-segment);
  }

  td.date {
    text-align: left;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: var(--space-1) var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  thead th {
    color: var(--color-text-muted);
    font-weight: normal;
  }

  tbody th {
    font-weight: normal;
  }

  td {
    text-align: right;
    color: var(--color-text-muted);
  }
</style>
