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

  <div class="focus-warning" role="note">
    <strong>Input only works while the timer is focused.</strong>
    Browsers send keyboard and gamepad input only to the focused tab/window. While you play, the game
    has the focus, so the timer can't see your presses. Keep the timer window focused (for example on
    a second screen next to a console or emulator capture), or use the on-screen buttons.
  </div>

  <h2>Devices</h2>
  <DevicePanel devices={inputDevices} source={gamepadSource} />

  <h2>Bindings</h2>
  <BindingsTable manager={inputManager} pads={gamepadSource} devices={inputDevices} />

  {#if timerStore.comparisons.length > 0}
    <h2>Timer</h2>
    <TimerSettings store={timerStore} />
  {/if}
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

  .focus-warning {
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-warning);
    border-left-width: 4px;
    border-radius: var(--radius-1);
  }

  .focus-warning strong {
    display: block;
    color: var(--color-warning);
  }
</style>
