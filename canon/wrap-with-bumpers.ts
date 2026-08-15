// Deep Glitch Files — Wraps EP-final.mp4 with canon bumpers: intro + body + disclaimer + endcard.
// Usage: npx tsx canon/wrap-with-bumpers.ts <EP-final.mp4> [--force]
// LOCKED: never copy/rename wrapped by hand — always run this after assemble-final rebuild.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCadence } from '../src/lib/episode-gates.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const INTRO = resolve(HERE, 'bumpers/intro.mp4');
const DISCLAIMER = resolve(HERE, 'bumpers/disclaimer.mp4');
const ENDCARD = resolve(HERE, 'bumpers/endcard.mp4');

function ff(args: string, label: string) {
  console.log(`  ff: ${label}`);
  execSync(`ffmpeg -y ${args}`, { stdio: 'pipe' });
}

function dur(path: string): number {
  return parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${path}"`)
      .toString().trim()
  );
}

function needsNormalize(src: string, dst: string, force: boolean): boolean {
  if (force) return true;
  if (!existsSync(dst)) return true;
  return statSync(src).mtimeMs > statSync(dst).mtimeMs;
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const input = args.find(a => !a.startsWith('--'));

if (!input || !existsSync(input)) {
  console.error('Usage: npx tsx canon/wrap-with-bumpers.ts <EP-final.mp4> [--force]');
  process.exit(1);
}

for (const [name, path] of [['intro', INTRO], ['disclaimer', DISCLAIMER], ['endcard', ENDCARD]] as const) {
  if (!existsSync(path)) {
    console.error(`Missing bumper: ${name} at ${path}\nRun: npx tsx canon/gen-bumpers.ts`);
    process.exit(1);
  }
}

const epDir = dirname(input);
const epName = basename(input, '.mp4');
const wrapped = resolve(epDir, `${epName}-wrapped.mp4`);
const tmpDir = resolve(epDir, 'out', 'wrap-tmp');

if (force && existsSync(tmpDir)) {
  rmSync(tmpDir, { recursive: true, force: true });
  console.log('  🗑 cleared wrap-tmp (--force)');
}

const t0 = Date.now();
console.log(`\n🎬 Wrapping ${basename(input)} with Deep Glitch Files bumpers\n`);

// Pre-flight: body cadence (skip if old sparse episode without shot-order)
const cadence = verifyCadence(input, { windowSec: 30, minCuts: 4, maxGapSec: 8 });
if (!cadence.ok) {
  console.warn(`  ⚠ Cadence check: ${cadence.reason}`);
  console.warn('    Cuts:', cadence.cuts.map(t => t.toFixed(1) + 's').join(', ') || 'none');
} else {
  console.log(`  ✅ Cadence OK (${cadence.cuts.length} cuts in first 30s)`);
}

mkdirSync(tmpDir, { recursive: true });

const VF = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1,format=yuv420p';
const ENC = '-c:v libx264 -crf 20 -preset fast -c:a aac -ac 2 -b:a 192k -ar 48000';

const normParts: [string, string, string][] = [
  [INTRO, resolve(tmpDir, 'intro-norm.mp4'), 'intro'],
  [input, resolve(tmpDir, 'body-norm.mp4'), 'body'],
  [DISCLAIMER, resolve(tmpDir, 'disclaimer-norm.mp4'), 'disclaimer'],
  [ENDCARD, resolve(tmpDir, 'endcard-norm.mp4'), 'endcard'],
];

let bodyRebuilt = false;
for (const [src, dst, label] of normParts) {
  if (needsNormalize(src, dst, force)) {
    if (label === 'body') bodyRebuilt = true;
    ff(`-i "${src}" -vf "${VF}" -af "aresample=48000" ${ENC} "${dst}"`, `normalize ${label}`);
  } else {
    console.log(`  skip normalize ${label} (cache fresh)`);
  }
}

const concatList = resolve(tmpDir, 'concat.txt');
writeFileSync(concatList, normParts.map(([, dst]) => `file '${dst}'`).join('\n'));

const concatted = resolve(tmpDir, 'concatted.mp4');
if (bodyRebuilt || force || !existsSync(concatted)) {
  ff(`-f concat -safe 0 -i "${concatList}" -c copy "${concatted}"`, 'concat all parts');
} else {
  console.log('  skip concat (cache fresh)');
}

const totalDur = dur(concatted);
if (existsSync(wrapped)) rmSync(wrapped);
ff(
  `-i "${concatted}" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "${wrapped}"`,
  `loudnorm → ${epName}-wrapped`
);

const manifest = {
  source: basename(input),
  sourceMtime: statSync(input).mtime.toISOString(),
  wrappedMtime: statSync(wrapped).mtime.toISOString(),
  bodyRebuilt,
  durationSec: totalDur,
  cadence: cadence.ok ? 'ok' : cadence.reason,
};
writeFileSync(resolve(tmpDir, 'wrap-manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n✅ ${basename(wrapped)}`);
console.log(`   Duration: ${Math.floor(totalDur / 60)}m${Math.round(totalDur % 60)}s`);
console.log(`   Time: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('WRAP_DONE');
