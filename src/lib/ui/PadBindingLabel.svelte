<script lang="ts">
  // A pad binding with tags, button names for the pad's family: "[hold] RB + [press] A".
  // With `holding` instead of a binding: a button held right now ("[hold] A"). The plain
  // text is the accessible name.
  import {
    padBindingText,
    padButtonLabel,
    padLabelParts,
    type PadBinding,
    type PadFamily,
    type PadLabelPart,
  } from '../input/bindings';

  let {
    binding = null,
    holding = null,
    family = 'xbox',
  }: { binding?: PadBinding | null; holding?: number | null; family?: PadFamily } = $props();

  const parts = $derived<PadLabelPart[]>(
    binding
      ? padLabelParts(binding, family)
      : holding !== null
        ? [{ tag: 'hold', button: padButtonLabel(holding, family) }]
        : [],
  );
  const text = $derived(
    binding
      ? padBindingText(binding, family)
      : holding !== null
        ? `Hold ${padButtonLabel(holding, family)}`
        : '',
  );
</script>

<span class="pad-label" aria-label={text}>
  {#each parts as part, i (i)}
    {#if i > 0}<span class="plus" aria-hidden="true">+</span>{/if}
    <span class="part" aria-hidden="true">
      <span class="tag" class:hold={part.tag === 'hold'}>{part.tag}</span>
      {part.button}
    </span>
  {/each}
</span>

<style>
  .pad-label {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
  }

  .part {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    white-space: nowrap;
  }

  .plus {
    color: var(--color-text-muted);
  }

  .tag {
    padding: 0 var(--space-1);
    font-size: 0.75em;
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
  }

  .tag.hold {
    color: var(--color-text);
    background: var(--color-current-split);
    border-color: transparent;
  }
</style>
