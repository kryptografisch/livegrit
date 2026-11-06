<script lang="ts">
  // "settings >>" left of the gear, for new users only (the parent decides: no saved
  // splits). Shown at once; after 2.5 s it wiggles (left, right), then a white band sweeps
  // over it 3 times (muted → white → muted, 1 s pause between), then it fades out and is
  // removed. CSS only; with reduced motion there is no wiggle or sweep, only the fade.
  let done = $state(false);

  function ended(event: AnimationEvent) {
    // Svelte prefixes scoped keyframe names (`svelte-<hash>-fade-out`).
    if (event.animationName.endsWith('fade-out')) done = true;
  }
</script>

{#if !done}
  <span class="settings-hint" aria-hidden="true" onanimationend={ended}>settings &gt;&gt;</span>
{/if}

<style>
  /* In the bottom bar, right before the gear (the parent places it). */
  .settings-hint {
    display: inline-block;
    white-space: nowrap;
    pointer-events: none;
    /* The band (40–60 % of a 250 % wide gradient) sweeps from left to right while the
       position goes 100 % → 0 %: its leading edge enters as the text starts, and the text
       turns muted again behind it once the leading edge is halfway. */
    color: transparent;
    background-image: linear-gradient(
      90deg,
      var(--color-text-muted) 0 40%,
      var(--color-text) 45% 55%,
      var(--color-text-muted) 60% 100%
    );
    background-size: 250% 100%;
    background-position: 100% 0;
    background-clip: text;
    -webkit-background-clip: text;
    /* 2.5 s wait; 0.6 s wiggle; 3 × (1.5 s sweep + 1 s pause) = 7.5 s; then the fade. */
    animation:
      wiggle 0.6s ease-in-out 2.5s,
      sweep 2.5s ease-in-out 3.1s 3,
      fade-out 0.6s ease 10.6s forwards;
  }

  /* A short nudge left, then right, back to rest. */
  @keyframes wiggle {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-6px);
    }
    60% {
      transform: translateX(4px);
    }
    80% {
      transform: translateX(-2px);
    }
  }

  @keyframes sweep {
    0% {
      background-position: 100% 0;
    }
    60%,
    100% {
      background-position: 0% 0;
    }
  }

  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-hint {
      animation: fade-out 0.6s ease 10.6s forwards;
    }
  }
</style>
