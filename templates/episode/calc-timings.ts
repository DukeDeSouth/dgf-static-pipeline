// DGF TEMPLATE — 5s shot grid → vo/timings.json + vo/shot-order.json
// Run after gen-vo.ts: npx tsx calc-timings.ts
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const VO = resolve(HERE, 'vo');

/** LOCKED: новый визуальный хук каждые ≤5s (retention canon). */
export const INTERVAL_SEC = 5;

const SEGMENTS: { id: string; voFile: string; prefix: string }[] = [
  { id: 'hook', voFile: 'vo-hook', prefix: 'H' },
  { id: 'setup', voFile: 'vo-setup', prefix: 'S' },
  { id: 'act1', voFile: 'vo-act1', prefix: 'A' },
  { id: 'act2', voFile: 'vo-act2', prefix: 'B' },
  // { id: 'act2b', voFile: 'vo-act2b', prefix: 'C' },
  { id: 'act3', voFile: 'vo-act3', prefix: 'D' },
  { id: 'outro', voFile: 'vo-outro', prefix: 'O' },
];

const BODY_ORDER = [
  'hook', 'setup', 'T1', 'act1', 'T2', 'act2', /* 'act2b', */ 'T3', 'act3', 'outro',
];

function dur(path: string): number {
  return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${path}"`).toString().trim());
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function main() {
  console.log(`\n📐 DGF calc-timings — ${INTERVAL_SEC}s grid\n`);
  const timings: Record<string, Record<string, { start: number; dur: number }>> = {};
  const shotOrder: Record<string, string[]> = {};
  let totalShots = 0;

  for (const seg of SEGMENTS) {
    const totalDur = dur(resolve(VO, `${seg.voFile}.mp3`));
    timings[seg.id] = {};
    shotOrder[seg.id] = [];
    let t = 0;
    let i = 1;
    while (t < totalDur - 0.05) {
      const d = Math.min(INTERVAL_SEC, totalDur - t);
      const id = `${seg.prefix}${pad(i)}`;
      timings[seg.id][id] = { start: +t.toFixed(3), dur: +d.toFixed(3) };
      shotOrder[seg.id].push(id);
      console.log(`  ${seg.id} ${id}: ${t.toFixed(2)}s + ${d.toFixed(2)}s`);
      t += d;
      i++;
      totalShots++;
    }
    console.log(`  → ${seg.id}: ${i - 1} shots (${totalDur.toFixed(1)}s)\n`);
  }

  writeFileSync(resolve(VO, 'timings.json'), JSON.stringify(timings, null, 2));
  writeFileSync(resolve(VO, 'shot-order.json'), JSON.stringify({
    version: 2,
    intervalSec: INTERVAL_SEC,
    bodyOrder: BODY_ORDER,
    shots: shotOrder,
    totalVoShots: totalShots,
  }, null, 2));

  console.log(`✅ ${totalShots} VO shots (+ 3 act cards T1-T3) → vo/timings.json, vo/shot-order.json`);
  console.log('TIMINGS_DONE');
}

main();
