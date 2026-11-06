<script lang="ts">
  // Storage status: persistent yes/no, usage/quota, a button to ask for persistence, and
  // the reminder that an .lss export is the real backup.
  import { estimate, persist, persisted, type StorageEstimateInfo } from '../storage/persist';
  import { formatBytes, formatPercent, usagePercent } from './format';
  import { pwaUpdate } from '../pwa/appPwa';

  let { available }: { available: boolean } = $props();

  /** `undefined` while loading, `null` if the browser can't tell. */
  let isPersisted = $state<boolean | null | undefined>(undefined);
  let usage = $state<StorageEstimateInfo | null | undefined>(undefined);
  /** Filled share of the quota in percent (0 while unknown). */
  const percent = $derived(usage ? usagePercent(usage.usage, usage.quota) : 0);
  let message = $state<string | null>(null);
  let busy = $state(false);

  async function refresh() {
    [isPersisted, usage] = await Promise.all([persisted(), estimate()]);
  }

  $effect(() => {
    void refresh();
  });

  async function request() {
    busy = true;
    try {
      const granted = await persist();
      message =
        granted === true
          ? 'Persistent storage granted.'
          : granted === false
            ? 'The browser declined. Chrome decides by itself (e.g. after installing the app or bookmarking it); Firefox asks.'
            : 'This browser does not support persistent storage here (it needs https or localhost).';
      await refresh();
    } finally {
      busy = false;
    }
  }

  const offlineText = $derived(
    {
      ready: 'yes, the app starts without a connection',
      pending: 'not yet, the app is still being cached',
      unsupported: 'no (needs the built app over https or localhost)',
    }[pwaUpdate.offline],
  );

  const persistedText = $derived(
    isPersisted === undefined
      ? '…'
      : isPersisted === null
        ? 'unknown (not supported here)'
        : isPersisted
          ? 'yes'
          : 'no (the browser may delete the data when space is low)',
  );
</script>

<dl class="status">
  <dt>Saving</dt>
  <dd>{available ? 'yes, in this browser (IndexedDB)' : 'not available, only in memory'}</dd>
  <dt>Offline</dt>
  <dd>{offlineText}</dd>
  <dt>Persistent</dt>
  <dd>{persistedText}</dd>
  <dt>Used</dt>
  <dd>
    {#if usage === undefined}
      …
    {:else if usage === null}
      unknown
    {:else}
      <span class="usage">
        <span
          class="bar"
          role="meter"
          aria-label="Storage used"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={percent}
          aria-valuetext={formatPercent(percent)}
        >
          <span class="fill" style:width="{percent}%"></span>
        </span>
        <span>
          {formatBytes(usage.usage)} of {formatBytes(usage.quota)} ({formatPercent(percent)})
        </span>
      </span>
    {/if}
  </dd>
</dl>

{#if isPersisted !== true}
  <button type="button" disabled={busy || isPersisted === null} onclick={request}>
    Request persistent storage
  </button>
{/if}
{#if message}
  <p class="muted" role="status">{message}</p>
{/if}

<p class="note">
  Clearing this site's data in the browser (or uninstalling the app) deletes all saved splits and
  settings, also with persistent storage. Export your splits as .lss: that file is the real backup.
</p>

<style>
  .status {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--space-1) var(--space-3);
    margin: 0 0 var(--space-2);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
  }

  .usage {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
  }

  .bar {
    flex: 0 0 8rem;
    height: 0.5rem;
    overflow: hidden;
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  .fill {
    display: block;
    height: 100%;
    /* A sliver stays visible for tiny values (MB of a GB quota). */
    min-width: 2px;
    background: var(--color-personal-best);
  }

  .muted {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .note {
    margin: var(--space-3) 0 0;
    padding: var(--space-2);
    font-size: 0.875em;
    color: var(--color-warning);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-1);
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

  button:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
</style>
