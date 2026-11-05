<script lang="ts">
  // A button that opens the file picker for a splits file. No `accept` filter: the core
  // reads several split formats, and mobile pickers grey out unknown extensions like .lss.
  let {
    onfile,
    label = 'Import .lss',
    primary = false,
    disabled = false,
  }: {
    onfile: (file: File) => void;
    label?: string;
    primary?: boolean;
    disabled?: boolean;
  } = $props();

  let input: HTMLInputElement | undefined = $state();

  function picked(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    // Reset, so picking the same file again fires `change` again.
    event.currentTarget.value = '';
    if (file) onfile(file);
  }
</script>

<button type="button" class:primary {disabled} onclick={() => input?.click()}>{label}</button>
<input bind:this={input} type="file" hidden onchange={picked} />

<style>
  button {
    padding: var(--space-2) var(--space-3);
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

  button:disabled {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
</style>
