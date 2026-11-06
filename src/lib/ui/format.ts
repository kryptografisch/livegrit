// Small display formatters for Settings (Splits, Data).

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Bytes as "512 B", "1.5 MB", "12 GB" (1 KB = 1024 B). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '?';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${Number(value.toFixed(digits))} ${UNITS[unit]}`;
}

/** A `Date.now()` value as a short local date and time. */
export function formatDateTime(time: number, locale?: string): string {
  return new Date(time).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "18 runs (5 complete)", "1 run (0 complete)". */
export function formatAttempts(attempts: number, completed: number): string {
  return `${attempts} ${attempts === 1 ? 'run' : 'runs'} (${completed} complete)`;
}

/** `usage` of `quota` in percent, 0–100 (0 for an unknown or zero quota). */
export function usagePercent(usage: number, quota: number): number {
  if (!(quota > 0) || !(usage > 0)) return 0;
  return Math.min(100, (usage / quota) * 100);
}

/** "42%", "3.5%", "0.12%", "< 0.01%" (tiny usage of a big quota still reads as non-zero). */
export function formatPercent(percent: number): string {
  if (percent <= 0) return '0%';
  if (percent < 0.01) return '< 0.01%';
  const digits = percent >= 10 ? 0 : percent >= 1 ? 1 : 2;
  return `${Number(percent.toFixed(digits))}%`;
}

/** A `Date.now()` value as a short local date ("Nov 6, 2026"). */
export function formatDate(time: number, locale?: string): string {
  return new Date(time).toLocaleDateString(locale, { dateStyle: 'medium' });
}

/** A `Date.now()` value as a local 24-hour clock time ("18:05"), in every locale. */
export function formatClock(time: number, locale?: string): string {
  return new Date(time).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/**
 * A duration in ms as a run time: "7:03.10", "1:02:03.45" (centiseconds, cut off like
 * LiveSplit, not rounded); "-" for `null`.
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '-';
  const sign = ms < 0 ? '-' : '';
  const centis = Math.floor(Math.abs(ms) / 10);
  const cs = centis % 100;
  const totalSeconds = Math.floor(centis / 100);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return `${sign}${clock}.${pad(cs)}`;
}
