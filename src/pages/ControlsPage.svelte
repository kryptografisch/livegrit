<script lang="ts">
  // Step 6: read-only list of the default controls. Step 8 adds editable bindings, step 10
  // run management + storage status.
  import { ACTIONS } from '../lib/input/types';
  import { ACTION_LABELS, bindingLabel, defaultBindings } from '../lib/input/bindings';
  import { inputDevices } from '../lib/input/appInput';

  const defaults = defaultBindings();
</script>

<section class="controls-page">
  <h1>Controls</h1>
  <p class="warning">Keyboard and gamepad input only work while this tab/window is focused.</p>

  <h2>Available devices</h2>
  <ul class="devices">
    <li>Keyboard</li>
    {#each inputDevices.pads as pad (pad.index)}
      <li>{pad.name} <span class="slot">(gamepad {pad.index + 1})</span></li>
    {/each}
  </ul>
  <p class="hint">Press a button on your controller to detect it.</p>

  <h2>Default controls</h2>
  <dl class="bindings">
    {#each ACTIONS as action (action)}
      <dt>{ACTION_LABELS[action]}</dt>
      <dd>
        {#each defaults[action] as binding, i (i)}
          <kbd>{bindingLabel(binding)}</kbd>
        {:else}
          <span class="none">not bound</span>
        {/each}
      </dd>
    {/each}
  </dl>
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

  .warning {
    color: var(--color-warning);
  }

  .devices {
    margin: 0;
    padding-left: var(--space-4);
  }

  .slot {
    color: var(--color-text-muted);
  }

  .hint {
    margin: var(--space-2) 0 0;
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .bindings {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--space-2) var(--space-3);
    margin: 0;
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 0;
  }

  kbd {
    padding: 0 var(--space-2);
    font-family: var(--font-ui);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  .none {
    color: var(--color-text-muted);
  }
</style>
