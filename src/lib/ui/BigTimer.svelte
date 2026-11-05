<script lang="ts">
  import { semanticColorVar, type TimerView } from '../timer/layoutView';

  let { timer }: { timer: TimerView } = $props();
</script>

<div class="big-timer" style:color={semanticColorVar(timer.color)} role="timer">
  <span class="time">{timer.time}</span><span class="fraction">{timer.fraction}</span>
</div>

<style>
  .big-timer {
    font-family: var(--font-timer);
    font-variant-numeric: tabular-nums;
    font-size: var(--font-size-timer);
    line-height: 1.1;
    text-align: right;
    padding: var(--space-2) var(--space-3);
    white-space: nowrap;
  }

  .fraction {
    font-size: 0.6em;
  }
</style>
