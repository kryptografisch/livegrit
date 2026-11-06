<script lang="ts">
  // "+ Install": the browser's install dialog where there is one (Chromium), otherwise a
  // modal with instructions for this browser. `ondone` runs once that is over (the browser
  // dialog answered or the instructions closed), e.g. to hide the bar. Not before: hiding
  // the bar unmounts this button and with it the instructions modal.
  import { pwaInstall } from '../pwa/appPwa';
  import InstallHelpDialog from './InstallHelpDialog.svelte';

  let { ondone }: { ondone?: () => void } = $props();

  let helpOpen = $state(false);

  async function install() {
    if (await pwaInstall.install()) ondone?.();
    else helpOpen = true;
  }

  function setHelpOpen(value: boolean) {
    helpOpen = value;
    if (!value) ondone?.();
  }
</script>

<button type="button" class="install" onclick={install}>+ Install</button>
<InstallHelpDialog bind:open={() => helpOpen, setHelpOpen} />

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
