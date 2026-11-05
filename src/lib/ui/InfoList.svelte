<script lang="ts">
  import { semanticColorVar, type InfoView } from '../timer/layoutView';

  let { info }: { info: InfoView[] } = $props();
</script>

<dl class="info-list">
  {#each info as item, i (i)}
    <div class="item">
      <dt>{item.key}</dt>
      <dd style:color={semanticColorVar(item.color)}>{item.value}</dd>
    </div>
  {/each}
</dl>

<style>
  .info-list {
    margin: 0;
    padding: var(--space-1) var(--space-3) var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .item {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-family: var(--font-timer);
    font-variant-numeric: tabular-nums;
  }
</style>
