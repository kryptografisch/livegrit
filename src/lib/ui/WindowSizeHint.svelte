<script lang="ts">
  // Bottom bar of the Timer page while the window's size differs from last time: both
  // sizes, so the window can be sized the same again (OBS window capture). × keeps the
  // current size instead.
  import type { WindowSizeMemory } from './windowSize.svelte';

  let { memory }: { memory: WindowSizeMemory } = $props();

  const size = (s: { width: number; height: number }) => `${s.width} × ${s.height}`;
</script>

{#if memory.hint && memory.last}
  <div class="size-hint" role="status">
    <span>
      Window {size(memory.current)}, last time {size(memory.last)}
    </span>
    <button
      type="button"
      onclick={() => memory.accept()}
      aria-label="Keep the current window size"
      title="Keep the current window size">×</button
    >
  </div>
{/if}

<style>
  .size-hint {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
    font-size: 0.75em;
    color: var(--color-warning);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    font-variant-numeric: tabular-nums;
  }

  .size-hint span {
    flex: 1;
    min-width: 0;
  }

  button {
    padding: 0 var(--space-2);
    font: inherit;
    font-size: 1.25em;
    line-height: 1;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
