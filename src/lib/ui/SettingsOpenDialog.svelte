<script lang="ts">
  // Modal on the Timer page while a Settings window is open (`WindowSync.settingsOpen`).
  // Timer input is off meanwhile (`modals`), so keys and pad buttons pressed while binding
  // them in the Settings window don't also start or split the timer here. It can't be
  // dismissed (Escape does nothing): it goes away when the Settings window closes, e.g. by
  // "Close settings". Settings can't be opened during an attempt (the gear is disabled);
  // one opened anyway (e.g. typed into another tab) shows no modal here then, it is locked
  // itself instead (`SettingsPage`), so the attempt can always be split.
  import { untrack } from 'svelte';
  import { windowSync } from '../sync/appSync';
  import { timerStore } from '../timer/timerStore.svelte';
  import { modals } from './modal.svelte';
  import { closeSettings, focusSettings, settingsWindow } from './settingsWindow.svelte';

  const show = $derived(windowSync.settingsOpen && !timerStore.attemptInProgress);

  let dialog: HTMLDialogElement | undefined = $state();
  let closeButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    const element = dialog;
    if (!show || !element) return;
    if (!element.open) element.showModal();
    untrack(() => {
      closeButton?.focus();
      modals.open++;
    });
    return () => {
      untrack(() => modals.open--);
      if (element.open) element.close();
    };
  });
</script>

<dialog
  bind:this={dialog}
  class="settings-open"
  aria-labelledby="settings-open-title"
  oncancel={(e) => e.preventDefault()}
  onclose={() => {
    // Chrome closes a modal on a repeated Escape despite `preventDefault`: reopen it.
    if (show && dialog && !dialog.open) dialog.showModal();
  }}
>
  <p id="settings-open-title" class="title">Settings page open</p>
  <p>
    The settings are open in another window. While it's open, the timer here ignores keys and
    controller buttons, so setting up bindings there doesn't start or split the timer.
  </p>
  <p class="note">
    Changes made there apply here right away. Close the settings to use the timer again. If they
    stay open in a browser tab, close that tab.
  </p>
  <div class="actions">
    {#if settingsWindow.owned}
      <button type="button" onclick={() => focusSettings()}>Show settings</button>
    {/if}
    <button type="button" bind:this={closeButton} onclick={() => closeSettings()}>
      Close settings
    </button>
  </div>
</dialog>

<style>
  .settings-open {
    width: min(26rem, calc(100vw - 2 * var(--space-3)));
    padding: var(--space-3);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-personal-best);
    border-radius: var(--radius-1);
  }

  .settings-open[open] {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .settings-open::backdrop {
    background: var(--color-backdrop);
  }

  p {
    margin: 0;
  }

  .title {
    font-weight: 600;
  }

  .note {
    font-size: 0.875em;
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--space-2);
  }

  button {
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-1);
    cursor: pointer;
  }
</style>
