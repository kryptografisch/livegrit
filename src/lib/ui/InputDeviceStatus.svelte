<script lang="ts">
  // Footer of the Timer page: "Keyboard + Gamepad 1 + …". Only controllers in use are
  // listed: a pad appears once one of its presses triggered an action (a mapped button),
  // since bindings don't belong to a device; other connected pads are left out. Its full
  // name is in the tooltip.
  import { padLabel, type InputDeviceStore } from '../input/inputDevice.svelte';

  let { devices }: { devices: InputDeviceStore } = $props();
</script>

<footer class="input-device">
  Keyboard{#each devices.usedPads as pad (pad.index)}{' + '}<span title={pad.name}
      >{padLabel(pad)}</span
    >{/each}
</footer>

<style>
  .input-device {
    padding: var(--space-1) var(--space-3);
    font-size: 0.75em;
    color: var(--color-text-muted);
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
