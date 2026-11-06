<script lang="ts">
  // Editable bindings: per action the keys and pad buttons/combos. "+ Add" starts capture
  // mode for that cell: the next key (or pad button/combo, confirmed on release) is added.
  // Escape cancels. The input manager is disabled on this page, so nothing reaches the timer.
  import { ACTIONS, type Action } from '../input/types';
  import {
    ACTION_LABELS,
    bindingId,
    bindingLabel,
    defaultBindings,
    withBinding,
    withoutBinding,
    type Binding,
    type Bindings,
    padButtonLabel,
  } from '../input/bindings';
  import type { InputDeviceStore } from '../input/inputDevice.svelte';
  import { captureKey, PadComboRecorder } from '../input/capture';
  import type { GamepadSource } from '../input/gamepadSource';
  import type { InputManager } from '../input/inputManager';
  import { rafTicker } from '../ticker';
  import PadBindingLabel from './PadBindingLabel.svelte';
  import { untrack } from 'svelte';

  let {
    manager,
    pads,
    devices,
  }: { manager: InputManager; pads: GamepadSource; devices: InputDeviceStore } = $props();

  type Kind = Binding['kind'];

  // The manager holds the live copy (saved by the storage layer). Follows its changes, so
  // bindings restored from storage after this page was opened show up too.
  let bindings = $state.raw<Bindings>(untrack(() => manager.bindings));
  $effect(() => manager.onBindingsChange((next) => (bindings = next)));
  let capture = $state<{ action: Action; kind: Kind } | null>(null);
  /** Pad combo being recorded (for display). */
  let pending = $state<string | null>(null);
  let message = $state<string | null>(null);
  let confirmReset = $state(false);
  /** The code of a captured key: its keyup is swallowed (Space would click the button). */
  let swallowKeyUp: string | null = null;

  function apply(next: Bindings) {
    manager.bindings = next; // updates `bindings` via onBindingsChange
  }

  function startCapture(action: Action, kind: Kind) {
    if (capture?.action === action && capture.kind === kind) {
      stopCapture();
      return;
    }
    capture = { action, kind };
    pending = null;
    message = null;
    confirmReset = false;
  }

  /** Ends capture mode; its hints go too (callers set a result message afterwards). */
  function stopCapture() {
    capture = null;
    pending = null;
    message = null;
  }

  function add(action: Action, binding: Binding) {
    const result = withBinding(bindings, action, binding);
    apply(result.bindings);
    stopCapture();
    message =
      result.movedFrom.length > 0
        ? `${bindingLabel(binding, devices.labelFamily)} moved from ${result.movedFrom
            .map((a) => ACTION_LABELS[a])
            .join(', ')} to ${ACTION_LABELS[action]}.`
        : null;
  }

  function remove(action: Action, binding: Binding) {
    apply(withoutBinding(bindings, action, bindingId(binding)));
    message = null;
  }

  function resetToDefaults() {
    apply(defaultBindings());
    confirmReset = false;
    stopCapture();
    message = 'Controls reset to the defaults.';
  }

  // Keyboard while capturing (capture phase, so nothing else on the page sees the key).
  $effect(() => {
    const current = capture;
    if (!current) return;
    const down = (event: KeyboardEvent) => {
      const result = captureKey(event);
      if (result.type === 'ignore') {
        // Key repeats of the key that started capture mode (e.g. a held Enter).
        event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      swallowKeyUp = event.code;
      if (result.type === 'cancel') stopCapture();
      else if (current.kind === 'pad') message = 'Press a gamepad button (Esc cancels).';
      else if (result.type === 'invalid') message = result.message;
      else add(current.action, result.binding);
    };
    window.addEventListener('keydown', down, { capture: true });
    return () => window.removeEventListener('keydown', down, { capture: true });
  });

  // Swallow the keyup of a captured key: Space/Enter on the focused "+ Add" button would
  // otherwise click it and start capture mode again.
  $effect(() => {
    const up = (event: KeyboardEvent) => {
      if (swallowKeyUp !== event.code) return;
      swallowKeyUp = null;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keyup', up, { capture: true });
    return () => window.removeEventListener('keyup', up, { capture: true });
  });

  // Pad buttons / combos while capturing a pad binding.
  $effect(() => {
    const current = capture;
    if (current?.kind !== 'pad') return;
    const recorder = new PadComboRecorder();
    recorder.update(pads.pads, performance.now());
    const unsubscribe = rafTicker().subscribe((now) => {
      const binding = recorder.update(pads.pads, now);
      if (binding) {
        add(current.action, binding);
        return;
      }
      const held = recorder.holding;
      const label = held === null ? null : padButtonLabel(held, devices.labelFamily);
      if (label !== pending) pending = label;
    });
    return unsubscribe;
  });

  function captureText(action: Action, kind: Kind): string {
    if (kind === 'key') return `Press a key for ${ACTION_LABELS[action]}… (Esc cancels)`;
    return pending
      ? `Holding ${pending}: press a second button for a combo, or release it… (Esc cancels)`
      : `Press a gamepad button or combo for ${ACTION_LABELS[action]}… (Esc cancels)`;
  }
</script>

<div class="table-wrap">
  <table class="bindings">
    <thead>
      <tr>
        <th scope="col">Action</th>
        <th scope="col">Keyboard</th>
        <th scope="col">Gamepad</th>
      </tr>
    </thead>
    <tbody>
      {#each ACTIONS as action (action)}
        <tr>
          <th scope="row">{ACTION_LABELS[action]}</th>
          {#each ['key', 'pad'] as const as kind (kind)}
            {@const active = capture?.action === action && capture.kind === kind}
            <td class:capturing={active}>
              <div class="cell">
                {#each bindings[action].filter((b) => b.kind === kind) as binding (bindingId(binding))}
                  <span class="chip">
                    <kbd
                      >{#if binding.kind === 'pad'}<PadBindingLabel
                          {binding}
                          family={devices.labelFamily}
                        />{:else}{bindingLabel(binding, devices.labelFamily)}{/if}</kbd
                    >
                    <button
                      type="button"
                      class="remove"
                      onclick={() => remove(action, binding)}
                      aria-label={`Remove ${bindingLabel(binding, devices.labelFamily)} from ${ACTION_LABELS[action]}`}
                      title="Remove">×</button
                    >
                  </span>
                {/each}
                <button
                  type="button"
                  class="add"
                  aria-pressed={active}
                  onclick={() => startCapture(action, kind)}
                  title={kind === 'key' ? 'Add a key' : 'Add a gamepad button or combo'}
                >
                  {active ? 'Press…' : '+ Add'}
                </button>
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="status" aria-live="polite">
  {#if capture}
    <p class="capture">
      {captureText(capture.action, capture.kind)}
      <button type="button" onclick={stopCapture}>Cancel</button>
    </p>
  {/if}
  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>

<div class="actions">
  {#if confirmReset}
    <span>Reset all controls to the defaults?</span>
    <button type="button" onclick={resetToDefaults}>Reset</button>
    <button type="button" onclick={() => (confirmReset = false)}>Keep</button>
  {:else}
    <button type="button" onclick={() => (confirmReset = true)}>Reset to defaults</button>
  {/if}
</div>

<div class="hint">
  <p>Gamepad bindings are detected from how you press the buttons:</p>
  <ul>
    <li><strong>Single:</strong> press one button.</li>
    <li>
      <strong>Hold + press:</strong> hold one button, then press a second one (e.g. hold Select, press
      A). Only this order triggers it.
    </li>
    <li>
      <strong>Together:</strong> press two buttons at the same time (within 0.1 s, any order).
    </li>
  </ul>
  <p>
    A combo is saved at its second button, a single button when you release it. The game still
    receives every press, so on a shared controller pick a combo the game doesn't use. A single
    binding on one of the combo's buttons still fires on its own.
  </p>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }

  .bindings {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: var(--space-2);
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid var(--color-border);
  }

  thead th {
    font-weight: normal;
    color: var(--color-text-muted);
  }

  tbody th {
    font-weight: normal;
    white-space: nowrap;
  }

  td.capturing {
    background: var(--color-current-split);
  }

  .cell {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
  }

  .chip {
    display: inline-flex;
    align-items: stretch;
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  kbd {
    padding: 0 var(--space-2);
    font-family: var(--font-ui);
    white-space: nowrap;
  }

  button {
    padding: var(--space-1) var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .remove {
    padding: 0 var(--space-2);
    color: var(--color-text-muted);
    background: none;
    border: none;
    border-left: 1px solid var(--color-border);
    border-radius: 0;
  }

  .remove:hover {
    color: var(--color-text);
  }

  .add {
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .add[aria-pressed='true'] {
    color: var(--color-text);
  }

  .status p {
    margin: var(--space-2) 0 0;
  }

  .capture {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .message {
    color: var(--color-warning);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .hint {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .hint p,
  .hint ul {
    margin: var(--space-1) 0;
  }

  .hint ul {
    padding-left: var(--space-4);
  }
</style>
