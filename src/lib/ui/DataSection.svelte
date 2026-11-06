<script lang="ts">
  // Settings → Data: the PWA install and the storage status. Everything is stored in this
  // browser; the .lss export (Settings → Splits) is the real backup.
  import { appStorage } from '../storage/appStorage';
  import { timerStore } from '../timer/timerStore.svelte';
  import StoragePanel from './StoragePanel.svelte';
  import InstallButton from './InstallButton.svelte';
  import { pwaInstall } from '../pwa/appPwa';

  const ready = $derived(timerStore.ready && appStorage.restored);
</script>

{#if !ready}
  <p class="muted">Loading…</p>
{:else}
  {#if !pwaInstall.installed}
    <h2>Progressive Web App</h2>
    <div class="install">
      <InstallButton />
      <p>
        Install split-lite as an app on your desktop or home screen: it opens in its own window and
        starts offline.
      </p>
    </div>
  {/if}

  <h2>Storage</h2>
  <StoragePanel available={appStorage.available} />
{/if}

<style>
  h2 {
    font-size: var(--font-size-base);
    margin: var(--space-4) 0 var(--space-2);
  }

  h2:first-child {
    margin-top: 0;
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

  .muted {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }
</style>
