// Generates LiveGrit's own .lss test fixtures with internally consistent data.
// Usage: node tests/fixtures/generate.mjs   (writes next to this file)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = dirname(fileURLToPath(import.meta.url));

const esc = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// ms -> "HH:MM:SS.fffffff" (LiveSplit "complete" format)
function fmt(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const frac = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)}.${p(frac, 3)}0000`;
}
const sec = (x) => Math.round(x * 1000);

// time = { real?: ms, game?: ms }
function timeXml(t) {
  let x = '';
  if (t.real != null) x += `<RealTime>${fmt(t.real)}</RealTime>`;
  if (t.game != null) x += `<GameTime>${fmt(t.game)}</GameTime>`;
  return x;
}
function timeTag(name, t, attrs = '') {
  const inner = t ? timeXml(t) : '';
  return inner ? `<${name}${attrs}>${inner}</${name}>` : `<${name}${attrs} />`;
}
function date(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

const cumulative = (arr) => {
  let acc = 0;
  return arr.map((v) => (acc += v));
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/**
 * spec: { game, category, segments: string[], groups?: [{start,end,name}],
 *   attempts: [{ real: number[] (segment secs), loads?: number[], pause?: secs }],
 *   hasGameTime?: bool, custom?: { name, real: number[] (segment secs) }[], startDate }
 * An attempt is finished when it has a time for every segment.
 */
function build(spec) {
  const n = spec.segments.length;
  const methods = spec.hasGameTime ? ['real', 'game'] : ['real'];

  const attempts = spec.attempts.map((a, i) => {
    const real = a.real.map(sec);
    const game = spec.hasGameTime ? a.real.map((r, j) => sec(r) - sec(a.loads[j])) : null;
    const finished = real.length === n;
    return { id: i + 1, real, game, finished, pause: a.pause != null ? sec(a.pause) : null };
  });

  // PB per timing method = finished attempt with the lowest total in that method.
  const pb = {};
  for (const m of methods) {
    const fin = attempts.filter((a) => a.finished);
    if (fin.length === 0) continue;
    pb[m] = cumulative(fin.reduce((best, a) => (sum(a[m]) < sum(best[m]) ? a : best))[m]);
  }

  // Golds per method = min over all segment history entries.
  const gold = (m, j) => {
    const vals = attempts.filter((a) => a[m] && a[m].length > j).map((a) => a[m][j]);
    return vals.length ? Math.min(...vals) : null;
  };

  const L = [];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push('<Run version="1.8.1">');
  L.push('  <GameIcon />');
  L.push(`  <GameName>${esc(spec.game)}</GameName>`);
  L.push(`  <CategoryName>${esc(spec.category)}</CategoryName>`);
  L.push('  <Metadata>');
  L.push('    <Run id="" />');
  L.push('    <Platform usesEmulator="False"></Platform>');
  L.push('    <Region></Region>');
  L.push('    <SpeedrunComVariables />');
  L.push('    <CustomVariables />');
  L.push('  </Metadata>');
  L.push('  <LayoutPath></LayoutPath>');
  L.push('  <Offset>00:00:00</Offset>');
  L.push(`  <AttemptCount>${attempts.length}</AttemptCount>`);

  if (attempts.length === 0) {
    L.push('  <AttemptHistory />');
  } else {
    L.push('  <AttemptHistory>');
    let t = spec.startDate.getTime();
    for (const a of attempts) {
      const total = sum(a.real) + (a.pause ?? 0);
      const started = new Date(t);
      // a reset attempt still lasted a bit longer than its completed segments
      const ended = new Date(t + (a.finished ? total : total + 20000));
      t += 86400000; // one attempt per day
      const attrs = `id="${a.id}" started="${date(started)}" isStartedSynced="True" ended="${date(ended)}" isEndedSynced="True"`;
      const tm = a.finished ? { real: sum(a.real), game: a.game ? sum(a.game) : null } : null;
      let inner = tm ? timeXml(tm) : '';
      if (a.pause != null) inner += `<PauseTime>${fmt(a.pause)}</PauseTime>`;
      L.push(inner ? `    <Attempt ${attrs}>${inner}</Attempt>` : `    <Attempt ${attrs} />`);
    }
    L.push('  </AttemptHistory>');
  }

  L.push('  <Segments>');
  for (let j = 0; j < n; j++) {
    L.push('    <Segment>');
    L.push(`      <Name>${esc(spec.segments[j])}</Name>`);
    L.push('      <Icon />');
    L.push('      <SplitTimes>');
    const pbTime = {};
    for (const m of methods) if (pb[m]) pbTime[m] = pb[m][j];
    L.push(`        ${timeTag('SplitTime', pbTime, ' name="Personal Best"')}`);
    for (const c of spec.custom ?? []) {
      L.push(`        ${timeTag('SplitTime', { real: cumulative(c.real.map(sec))[j] }, ` name="${esc(c.name)}"`)}`);
    }
    L.push('      </SplitTimes>');
    const g = {};
    for (const m of methods) {
      const v = gold(m, j);
      if (v != null) g[m] = v;
    }
    L.push(`      ${timeTag('BestSegmentTime', g)}`);
    const hist = attempts.filter((a) => a.real.length > j);
    if (hist.length === 0) {
      L.push('      <SegmentHistory />');
    } else {
      L.push('      <SegmentHistory>');
      for (const a of hist) {
        L.push(`        ${timeTag('Time', { real: a.real[j], game: a.game ? a.game[j] : null }, ` id="${a.id}"`)}`);
      }
      L.push('      </SegmentHistory>');
    }
    L.push('    </Segment>');
  }
  L.push('  </Segments>');

  if (spec.groups?.length) {
    L.push('  <SegmentGroups>');
    for (const gr of spec.groups) {
      L.push(`    <SegmentGroup start="${gr.start}" end="${gr.end}"><Name>${esc(gr.name)}</Name></SegmentGroup>`);
    }
    L.push('  </SegmentGroups>');
  }

  L.push('  <AutoSplitterSettings />');
  L.push('</Run>');
  return L.join('\n') + '\n';
}

const fixtures = {
  // Real time only; finished + reset attempts, a pause, a custom comparison,
  // and names that need XML escaping / are non-ASCII.
  'real-time.lss': {
    game: 'Pixel Quest',
    category: 'Any%',
    segments: ['Forest Gate', 'Höhle', 'Bridge & Tower', 'Ice <Caverns>', 'Final Boss'],
    startDate: new Date(Date.UTC(2026, 9, 1, 18, 0, 0)),
    custom: [{ name: 'Goal', real: [60, 78, 70, 92, 115] }],
    attempts: [
      { real: [65.2, 80.1, 72.9, 95.4, 120.3] },
      { real: [63.8, 78.4, 75.0] },
      { real: [62.1, 79.9, 70.2, 93.0, 118.7], pause: 5 },
      { real: [] },
      { real: [61.5, 81.2, 71.1, 92.4, 116.9] },
      { real: [60.9, 77.8] },
    ],
  },
  // Real time + game time (game time = real time minus load times).
  'game-time.lss': {
    game: 'Clockwork Lab',
    category: 'Any% (Load Removed)',
    segments: ['Boiler Room', 'Gear Hall', 'Steam Lift', 'Clock Tower'],
    hasGameTime: true,
    startDate: new Date(Date.UTC(2026, 9, 10, 19, 30, 0)),
    attempts: [
      { real: [45.0, 70.5, 88.2, 102.3], loads: [3.0, 4.5, 2.2, 5.1] },
      { real: [44.1, 72.0], loads: [2.9, 4.0] },
      { real: [43.5, 69.9, 90.0, 99.8], loads: [2.8, 4.1, 3.5, 4.6] },
    ],
  },
  // Native segment groups (start inclusive, end exclusive); last segment ungrouped.
  'segment-groups.lss': {
    game: 'Starlight Saga',
    category: 'All Worlds',
    segments: ['1-1', '1-2', 'World 1 Boss', '2-1', '2-2', 'World 2 Boss', 'Final Escape'],
    groups: [
      { start: 0, end: 3, name: 'World 1' },
      { start: 3, end: 6, name: 'World 2' },
    ],
    startDate: new Date(Date.UTC(2026, 9, 20, 17, 0, 0)),
    attempts: [
      { real: [30.4, 41.2, 55.0, 35.1, 44.8, 60.3, 25.5] },
      { real: [29.8, 40.1, 57.2, 34.0] },
      { real: [30.1, 40.6, 53.9, 34.7, 45.2, 58.8, 24.9] },
    ],
  },
  // A freshly created run: no attempts, no times at all.
  'new-run.lss': {
    game: 'My Game',
    category: 'Any%',
    segments: ['Start', 'Middle', 'End'],
    startDate: new Date(Date.UTC(2026, 10, 1)),
    attempts: [],
  },
};

for (const [name, spec] of Object.entries(fixtures)) {
  writeFileSync(join(outDir, name), build(spec));
  console.log('wrote', name);
}

// Not a valid split file: truncated XML. For the parse-error path.
writeFileSync(
  join(outDir, 'invalid.lss'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<Run version="1.8.1">\n  <GameName>Broken</GameName>\n  <Segments>\n    <Segment>\n      <Name>Oops\n',
);
console.log('wrote invalid.lss');
