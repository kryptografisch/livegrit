<script lang="ts">
  import { semanticColorVar, type TimerView } from '../timer/layoutView';

  /** `scale`: percent of the default size (Settings → Timer → UI). */
  let { timer, scale = 100 }: { timer: TimerView; scale?: number } = $props();
</script>

<div
  class="big-timer"
  style:color={semanticColorVar(timer.color)}
  style:--timer-scale={scale / 100}
  role="timer"
>
  <span class="time">{timer.time}</span><span class="fraction">{timer.fraction}</span>
</div>

<style>
  .big-timer {
    font-family: var(--font-timer);
    font-variant-numeric: tabular-nums;
    font-size: calc(var(--font-size-timer) * var(--timer-scale, 1));
    line-height: 1.1;
    text-align: right;
    padding: var(--space-2) var(--space-3);
    white-space: nowrap;
  }

  .fraction {
    font-size: 0.6em;
  }
</style>
