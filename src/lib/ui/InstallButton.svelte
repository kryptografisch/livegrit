<script lang="ts">
  // "+ Install": the browser's install dialog where there is one (Chromium), otherwise a
  // modal with instructions for this browser. `onclick` runs first (e.g. hide the bar).
  import { pwaInstall } from '../pwa/appPwa';
  import InstallHelpDialog from './InstallHelpDialog.svelte';

  let { onclick }: { onclick?: () => void } = $props();

  let helpOpen = $state(false);

  async function install() {
    onclick?.();
    if (!(await pwaInstall.install())) helpOpen = true;
  }
</script>

<button type="button" class="install" onclick={install}>+ Install</button>
<InstallHelpDialog bind:open={helpOpen} />

<style>
  .install {
    padding: var(--space-1) var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-personal-best);
    border-radius: var(--radius-1);
    cursor: pointer;
  }
</style>
