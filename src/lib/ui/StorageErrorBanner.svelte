<script lang="ts">
  // The last storage problem (`appStorage.error`), on every page, dismissible.
  import { appStorage } from '../storage/appStorage';
</script>

{#if appStorage.error}
  <div class="banner" role="alert">
    <span>{appStorage.error}</span>
    <button type="button" onclick={() => appStorage.clearError()} aria-label="Dismiss">×</button>
  </div>
{/if}

<style>
  .banner {
    display: flex;
    align-items: start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    color: var(--color-warning);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-warning);
  }

  .banner span {
    flex: 1;
  }

  .banner button {
    padding: 0 var(--space-2);
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
