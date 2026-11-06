<script lang="ts">
  // Controls: bindings (with capture mode), input devices, comparison + timing method.
  // Step 10 adds run management + storage status; step 12 turns this into Settings.
  import { gamepadSource, inputDevices, inputManager } from '../lib/input/appInput';
  import { timerStore } from '../lib/timer/timerStore.svelte';
  import BindingsTable from '../lib/ui/BindingsTable.svelte';
  import DevicePanel from '../lib/ui/DevicePanel.svelte';
  import TimerSettings from '../lib/ui/TimerSettings.svelte';
</script>

<section class="controls-page">
  <h1>Controls</h1>

  <h2>Devices</h2>
  <DevicePanel devices={inputDevices} source={gamepadSource} />

  <h2>Bindings</h2>
  <BindingsTable manager={inputManager} pads={gamepadSource} devices={inputDevices} />

  {#if timerStore.comparisons.length > 0}
    <h2>Timer</h2>
    <TimerSettings store={timerStore} />
  {/if}

  <p class="note">
    Keyboard keys only reach the timer while its window is focused. Gamepads also work while another
    app (e.g. the game) has the focus.
  </p>
</section>

<style>
  .controls-page {
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

  .note {
    margin: var(--space-4) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }
</style>
