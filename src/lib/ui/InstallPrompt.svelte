<script lang="ts">
  // The install bar above the nav. Gone for good once "+ Install" was clicked (saved in the
  // settings); the Data page keeps its own install button.
  import { router } from '../router.svelte';
  import { timerStore } from '../timer/timerStore.svelte';
  import { appStorage } from '../storage/appStorage';
  import { pwaInstall } from '../pwa/appPwa';
  import InstallButton from './InstallButton.svelte';

  // Not on the Data page (it has its own install section), not before the settings are
  // restored (no flash of a dismissed bar), not in the installed app and not during an
  // attempt (no layout shift mid-run).
  const shown = $derived(
    router.route !== 'data' &&
      appStorage.restored &&
      !appStorage.installBarDismissed &&
      !pwaInstall.installed &&
      !timerStore.attemptInProgress,
  );
</script>

{#if shown}
  <div class="install-bar">
    <span>Install as PWA to your desktop/homescreen</span>
    <InstallButton onclick={() => appStorage.dismissInstallBar()} />
  </div>
{/if}

<style>
  .install-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }

  .install-bar span {
    flex: 1;
  }
</style>
