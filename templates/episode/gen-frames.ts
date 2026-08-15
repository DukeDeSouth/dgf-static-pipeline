// DGF TEMPLATE — frames from shots.ts → broll/frames/
// Run: npx tsx gen-frames.ts [--all|--only=H01,H02]
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { t2i, gpt2edit } from '../../src/lib/fal.js';
import { kieT2I } from '../../src/lib/kie.js';
import { SHOTS, ACT_CARDS, type ShotDef } from './shots.js';

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(HERE, '../../.env') });

const FRAMES = resolve(HERE, 'broll', 'frames');
const CAST = resolve(HERE, '../../canon/cast');
mkdirSync(FRAMES, { recursive: true });

const ALL_SHOTS = [...SHOTS, ...ACT_CARDS];

function expectedIds(): Set<string> {
  const orderPath = resolve(HERE, 'vo/shot-order.json');
  if (!existsSync(orderPath)) return new Set(ALL_SHOTS.map(s => s.id));
  const order = JSON.parse(readFileSync(orderPath, 'utf-8')) as { shots: Record<string, string[]> };
  const ids = new Set<string>(['T1', 'T2', 'T3']);
  for (const list of Object.values(order.shots)) list.forEach(id => ids.add(id));
  return ids;
}

async function genShot(shot: ShotDef, idx: number) {
  const out = resolve(FRAMES, `${shot.id}.png`);
  if (existsSync(out)) { console.log(`  skip: ${shot.id}`); return; }

  if (shot.castRef) {
    const ref = resolve(CAST, shot.castRef);
    if (!existsSync(ref)) throw new Error(`Missing cast ref: ${shot.castRef}`);
    await gpt2edit({ prompt: shot.prompt, refPaths: [ref], outPath: out });
  } else if (idx % 2 === 0) {
    await t2i({ prompt: shot.prompt, outPath: out });
  } else {
    await kieT2I({ prompt: shot.prompt, outPath: out });
  }
}

async function runBatch(targets: ShotDef[]) {
  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(s => genShot(s, ALL_SHOTS.indexOf(s))));
    for (const r of results) if (r.status === 'rejected') console.error(`  ❌ ${r.reason}`);
  }
}

async function main() {
  const all = process.argv.includes('--all');
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',') : null;
  const expected = expectedIds();

  const missingPrompts = [...expected].filter(id => !ALL_SHOTS.some(s => s.id === id));
  if (missingPrompts.length) {
    console.warn(`\n⚠ shots.ts missing prompts for: ${missingPrompts.join(', ')}`);
    console.warn('  Add them to shots.ts before --all\n');
  }

  if (!all && !only) {
    const toGen = ALL_SHOTS.filter(s => expected.has(s.id) && !existsSync(resolve(FRAMES, `${s.id}.png`)));
    console.log(`\n🖼 PLAN: ${expected.size} shots expected, ${toGen.length} to gen (~$${(toGen.length * 0.04).toFixed(2)})`);
    console.log('  → npx tsx gen-frames.ts --all');
    return;
  }

  let targets = ALL_SHOTS.filter(s => expected.has(s.id));
  if (only) targets = targets.filter(s => only.includes(s.id));

  console.log(`\n🖼 DGF frames: ${targets.length} shots\n`);
  await runBatch(targets);
  console.log('\nFRAMES_DONE');
}

main().catch(e => { console.error(e); process.exit(1); });
