<script lang="ts">
  import { pwaUpdate } from '../pwa/appPwa';
</script>

{#if pwaUpdate.offered}
  <div class="update" role="status">
    <span>Update available.</span>
    <button type="button" onclick={() => pwaUpdate.apply()}>Reload</button>
    <button type="button" onclick={() => pwaUpdate.dismiss()}>Later</button>
  </div>
{/if}

<style>
  .update {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-personal-best);
  }

  .update span {
    flex: 1;
  }

  .update button {
    padding: var(--space-1) var(--space-2);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }
</style>
