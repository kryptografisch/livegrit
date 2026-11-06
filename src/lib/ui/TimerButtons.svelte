<script lang="ts">
  // On-screen controls, mainly for touch. Hidden by default on keyboard/mouse devices
  // (toggle in the run toolbar). They dispatch through the input manager like every other
  // source, so a button click and a key press within the de-dupe window fire once.
  import type { TimerStore } from '../timer/timerStore.svelte';
  import type { InputManager } from '../input/inputManager';
  import type { Action } from '../input/types';

  let { store, input }: { store: TimerStore; input: InputManager } = $props();

  const splitLabel = $derived(store.phase === 'NotRunning' ? 'Start' : 'Split');

  function press(action: Action, event: MouseEvent & { currentTarget: HTMLButtonElement }) {
    input.dispatch(action, 'pointer');
    // Don't keep focus: a focused button would otherwise react to Space/Enter as well.
    event.currentTarget.blur();
  }
</script>

<div class="timer-buttons">
  <button type="button" class="primary" onclick={(e) => press('split', e)}>{splitLabel}</button>
  <button type="button" onclick={(e) => press('undo', e)}>Undo</button>
  <button type="button" onclick={(e) => press('skip', e)}>Skip</button>
  <button type="button" onclick={(e) => press('pause', e)}>
    {store.phase === 'Paused' ? 'Resume' : 'Pause'}
  </button>
  <button type="button" onclick={(e) => press('reset', e)}>Reset</button>
</div>

<style>
  .timer-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }

  button {
    flex: 1 1 4.5rem;
    padding: var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  button.primary {
    border-color: var(--color-text-muted);
  }
</style>
