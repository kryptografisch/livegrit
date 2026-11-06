<script lang="ts">
  // Footer of the Timer page: the device last used for an action ("Keyboard" until a pad
  // button triggers one, then the pad's name).
  import type { InputDeviceStore } from '../input/inputDevice.svelte';

  let { devices }: { devices: InputDeviceStore } = $props();

  const label = $derived(devices.lastUsed.kind === 'pad' ? devices.lastUsed.name : 'Keyboard');
</script>

<footer class="input-device">{label}</footer>

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
