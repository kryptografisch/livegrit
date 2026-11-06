<script lang="ts">
  // Bottom bar of the Timer page while the window's size differs from last time: both
  // sizes, so the window can be sized the same again (OBS window capture). "save this
  // size" keeps the current size instead. Once the sizes match it turns green and is
  // removed when the window isn't resized for a moment (see `WindowSizeMemory`).
  import type { WindowSizeMemory } from './windowSize.svelte';

  let { memory }: { memory: WindowSizeMemory } = $props();

  const size = (s: { width: number; height: number }) => `${s.width} × ${s.height}`;
</script>

{#if memory.hint && memory.last}
  <div class="size-hint" class:matched={memory.hintState === 'matched'} role="status">
    <span>
      Window {size(memory.current)}, last time {size(memory.last)}
    </span>
    {#if memory.hintState === 'differs'}
      <button
        type="button"
        class="link"
        onclick={() => memory.accept()}
        title="Remember the current window size instead">save this size</button
      >
    {/if}
  </div>
{/if}

<style>
  .size-hint {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    font-size: 0.75em;
    color: var(--color-warning);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    font-variant-numeric: tabular-nums;
  }

  .size-hint.matched {
    color: var(--color-ahead-gaining);
  }

  .size-hint span {
    flex: 1;
    min-width: 0;
  }

  .link {
    padding: 0;
    font: inherit;
    color: inherit;
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
