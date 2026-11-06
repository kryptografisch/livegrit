<script lang="ts">
  // Available input devices: the keyboard and every connected pad with its button count and
  // a test. The indicator is lit while the browser reports any pressed button on the pad
  // (shows the controller works). The label shows what a binding would record, with the
  // same detection as capture mode: "[hold] A" while a button is held with nothing decided
  // yet, then hold + press or two together (further buttons are ignored); once all buttons
  // are up, the placeholder again (so a single press only shows as "[hold] A" while down).
  // Button names follow the pad's family (Xbox / PlayStation).
  import { PadComboRecorder } from '../input/capture';
  import { pressedButtons, type GamepadSource } from '../input/gamepadSource';
  import type { InputDeviceStore } from '../input/inputDevice.svelte';
  import { rafTicker } from '../ticker';
  import type { PadBinding } from '../input/bindings';
  import PadBindingLabel from './PadBindingLabel.svelte';

  let { devices, source }: { devices: InputDeviceStore; source: GamepadSource } = $props();

  interface PadTest {
    buttons: number;
    /** The detected binding while buttons are still down; `null` once all are released. */
    binding: PadBinding | null;
    /** A button held with nothing decided yet. */
    holding: number | null;
    /** Any button pressed right now. */
    lit: boolean;
  }

  let tests = $state.raw<Record<number, PadTest>>({});

  const same = (a: PadTest, b: PadTest) =>
    a.buttons === b.buttons &&
    a.binding === b.binding &&
    a.holding === b.holding &&
    a.lit === b.lit;

  // One recorder per pad (its results aren't tagged with the pad). Polled once per frame;
  // `tests` is only replaced when something visible changed.
  $effect(() => {
    const recorders = new Map<number, { id: string; recorder: PadComboRecorder }>();
    return rafTicker().subscribe((now) => {
      const pads = source.pads;
      const next: Record<number, PadTest> = {};
      let changed = Object.keys(tests).length !== pads.length;
      for (const snap of pads) {
        let entry = recorders.get(snap.index);
        // A new pad (or another pad in that slot) starts without a label.
        const fresh = !entry || entry.id !== snap.id;
        if (!entry || fresh) {
          entry = { id: snap.id, recorder: new PadComboRecorder() };
          recorders.set(snap.index, entry);
        }
        const old = fresh ? undefined : tests[snap.index];
        const binding = entry.recorder.update([snap], now);
        const anyPressed = pressedButtons(snap.buttons).length > 0;
        const test: PadTest = {
          buttons: snap.buttons.length,
          // All buttons up: back to the placeholder.
          binding: anyPressed ? (binding ?? old?.binding ?? null) : null,
          holding: entry.recorder.holding,
          lit: anyPressed,
        };
        if (!old || !same(old, test)) changed = true;
        next[snap.index] = test;
      }
      for (const index of [...recorders.keys()]) {
        if (!(index in next)) recorders.delete(index);
      }
      if (changed) tests = next;
    });
  });
</script>

<ul class="devices">
  <li class="device">Keyboard</li>
  {#each devices.pads as pad (pad.index)}
    {@const test = tests[pad.index]}
    {@const buttons = test?.buttons ?? 0}
    <li class="device">
      <span>
        {pad.name}
        <span class="muted">
          [gamepad {pad.index + 1}] ({buttons}
          {buttons === 1 ? 'button' : 'buttons'})
        </span>
      </span>
      <span class="live">
        <span class="indicator" class:on={test?.lit} aria-hidden="true"></span>
        <span aria-live="polite">
          {#if test?.holding != null}
            <PadBindingLabel holding={test.holding} family={pad.family} />
          {:else if test?.binding}
            <PadBindingLabel binding={test.binding} family={pad.family} />
          {:else}
            <span class="muted">Press a button to test</span>
          {/if}
        </span>
      </span>
    </li>
  {/each}
</ul>
<p class="hint">
  Press a button on your controller to detect it (browsers hide pads until a button is pressed while
  this page is focused).
</p>

<style>
  .devices {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .device {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .muted {
    color: var(--color-text-muted);
  }

  .live {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    /* Same height with and without a label: no jumping. */
    min-height: 1.5em;
  }

  .indicator {
    flex: none;
    width: 1.75rem;
    height: 0.75rem;
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  .indicator.on {
    background: var(--color-current-split);
  }

  .hint {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }
</style>
