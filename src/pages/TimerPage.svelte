<script lang="ts">
  import { onMount } from 'svelte';
  import { timerStore } from '../lib/timer/timerStore.svelte';
  import RunHeader from '../lib/ui/RunHeader.svelte';
  import SplitList from '../lib/ui/SplitList.svelte';
  import BigTimer from '../lib/ui/BigTimer.svelte';
  import InfoList from '../lib/ui/InfoList.svelte';
  import TimerButtons from '../lib/ui/TimerButtons.svelte';

  let loadError = $state<string | null>(null);

  onMount(() => {
    void (async () => {
      await timerStore.init();
      // Dev only, until import exists (step 5): load a fixture so the page has a run.
      if (import.meta.env.DEV && !timerStore.hasRun) {
        const { default: text } = await import('../../tests/fixtures/real-time.lss?raw');
        timerStore.loadSplits(text);
      }
    })().catch((error: unknown) => {
      console.error('[timer] failed to start', error);
      loadError = error instanceof Error ? error.message : String(error);
    });
  });

  const view = $derived(timerStore.view);
</script>

<section class="timer-page">
  {#if view}
    {#if view.title}
      <RunHeader title={view.title} />
    {/if}
    {#if view.splits}
      <SplitList splits={view.splits} onscroll={(d) => timerStore.scrollSplits(d)} />
    {:else}
      <div class="spacer"></div>
    {/if}
    {#if view.timer}
      <BigTimer timer={view.timer} />
    {/if}
    {#if view.info.length > 0}
      <InfoList info={view.info} />
    {/if}
    <TimerButtons store={timerStore} />
  {:else}
    <div class="empty">
      {#if loadError}
        <p class="error">Could not start the timer: {loadError}</p>
      {:else if timerStore.ready}
        <p>No run loaded. Import a .lss file (coming in step 5).</p>
      {:else}
        <p>Loading…</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .timer-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-bg);
  }

  .spacer {
    flex: 1;
  }

  .empty {
    flex: 1;
    display: grid;
    place-items: center;
    padding: var(--space-3);
    color: var(--color-text-muted);
    text-align: center;
  }

  .error {
    color: var(--color-warning);
  }
</style>
