// DGF TEMPLATE — Final assembly (5s cadence, reads vo/shot-order.json)
// Run: npx tsx assemble-final.ts
// Then: npx tsx ../../canon/wrap-with-bumpers.ts EP-final.mp4
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const VO_DIR = resolve(HERE, 'vo');
const FRAMES = resolve(HERE, 'broll', 'frames');
const OUT_DIR = resolve(HERE, 'out');
const MUSIC_DIR = resolve(HERE, '../../music');
const STING = resolve(HERE, '../../canon/bumpers/glitch-sting.m4a');
const FINAL = resolve(HERE, 'EP-final.mp4');
const CARD_DUR = 3.5;
mkdirSync(OUT_DIR, { recursive: true });

const TIMINGS: Record<string, Record<string, { start: number; dur: number }>> =
  JSON.parse(readFileSync(resolve(VO_DIR, 'timings.json'), 'utf-8'));

const ORDER = JSON.parse(readFileSync(resolve(VO_DIR, 'shot-order.json'), 'utf-8')) as {
  bodyOrder: string[];
  shots: Record<string, string[]>;
  intervalSec?: number;
};

interface SegDef { id: string; shots: string[]; isActCard?: boolean }
const SEGMENTS: SegDef[] = ORDER.bodyOrder.map((id) => {
  if (id.startsWith('T')) return { id, shots: [id], isActCard: true };
  return { id, shots: ORDER.shots[id] };
});
const BODY_ORDER = ORDER.bodyOrder;

function ff(args: string, label: string) {
  console.log(`  ff: ${label}`);
  execSync(`ffmpeg -y ${args}`, { stdio: 'pipe', maxBuffer: 200 * 1024 * 1024 });
}

function dur(p: string): number {
  return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`).toString().trim());
}

let shotIndex = 0;
function kenburns(frame: string, duration: number, out: string, shotId: string, maxZoom = 1.05) {
  if (existsSync(out)) { shotIndex++; return; }
  const zoomIn = shotIndex % 2 === 0;
  const frames = Math.max(1, Math.round(duration * 30));
  const step = (maxZoom - 1) / frames;
  const zExpr = zoomIn ? `min(${maxZoom},1+on*${step.toFixed(6)})` : `max(1,${maxZoom}-on*${step.toFixed(6)})`;
  const vf = [
    'scale=2048:1152:flags=lanczos',
    `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
    'format=yuv420p',
  ].join(',');
  ff(
    `-loop 1 -i "${frame}" -vf "${vf}" -t ${duration.toFixed(3)} -c:v libx264 -crf 18 -preset fast -an "${out}"`,
    `kenburns ${shotId} (${duration.toFixed(1)}s)`
  );
  shotIndex++;
}

function buildContentSeg(seg: SegDef): string {
  const segOut = resolve(OUT_DIR, `seg-${seg.id}.mp4`);
  if (existsSync(segOut)) { console.log(`  skip seg-${seg.id}`); return segOut; }

  const voFile = resolve(VO_DIR, `vo-${seg.id}.mp3`);
  const timings = TIMINGS[seg.id];
  const shotClips: string[] = [];

  for (const shotId of seg.shots) {
    const t = timings?.[shotId];
    if (!t) { console.warn(`  ⚠ no timing ${shotId}`); continue; }
    const shotOut = resolve(OUT_DIR, `_shot-${shotId}.mp4`);
    if (existsSync(shotOut)) { shotClips.push(shotOut); continue; }

    const fp = resolve(FRAMES, `${shotId}.png`);
    const vOnly = resolve(OUT_DIR, `_v-${shotId}.mp4`);
    if (existsSync(fp)) kenburns(fp, t.dur, vOnly, shotId);
    else ff(`-f lavfi -i "color=c=0x4A9FE8:s=1920x1080:d=${t.dur}:r=30,format=yuv420p" -c:v libx264 -crf 18 -an "${vOnly}"`, `placeholder ${shotId}`);

    const aSlice = resolve(OUT_DIR, `_a-${shotId}.aac`);
    if (!existsSync(aSlice)) {
      ff(`-i "${voFile}" -ss ${t.start.toFixed(3)} -t ${t.dur.toFixed(3)} -vn -af aresample=48000 -ac 2 -c:a aac -b:a 192k "${aSlice}"`, `slice ${shotId}`);
    }
    ff(`-i "${vOnly}" -i "${aSlice}" -c:v copy -c:a aac -ar 48000 -ac 2 -shortest "${shotOut}"`, `mux ${shotId}`);
    shotClips.push(shotOut);
  }

  const list = resolve(OUT_DIR, `list-${seg.id}.txt`);
  writeFileSync(list, shotClips.map(p => `file '${p}'`).join('\n'));
  ff(`-f concat -safe 0 -i "${list}" -c copy "${segOut}"`, `concat ${seg.id}`);
  console.log(`  ✅ seg-${seg.id} (${dur(segOut).toFixed(1)}s, ${shotClips.length} shots)`);
  return segOut;
}

function buildActCard(shotId: string, num: number): string {
  const out = resolve(OUT_DIR, `actcard-${num}.mp4`);
  if (existsSync(out)) return out;
  const fp = resolve(FRAMES, `${shotId}.png`);
  const vOnly = resolve(OUT_DIR, `_acv-${shotId}.mp4`);
  if (existsSync(fp)) kenburns(fp, CARD_DUR, vOnly, shotId, 1.06);
  ff(
    `-i "${vOnly}" -i "${STING}" ` +
    `-filter_complex "[1:a]aresample=48000,pan=stereo|FL=FC|FR=FC,afade=t=in:d=0.1,afade=t=out:st=1.5:d=0.5,volume=0.45[a]" ` +
    `-map 0:v -map "[a]" -c:v copy -c:a aac -ac 2 -b:a 192k -ar 48000 -t ${CARD_DUR} -shortest "${out}"`,
    `actcard ${num}`
  );
  return out;
}

function main() {
  const t0 = Date.now();
  const interval = ORDER.intervalSec ?? 5;
  console.log(`\n🎬 DGF Final Assembly — ${interval}s cadence, ${ORDER.shots ? Object.values(ORDER.shots).flat().length : '?'} VO shots\n`);

  const parts: string[] = [];
  let cardNum = 0;
  for (const id of BODY_ORDER) {
    const seg = SEGMENTS.find(s => s.id === id);
    if (!seg) continue;
    if (seg.isActCard) {
      cardNum++;
      parts.push(buildActCard(seg.shots[0], cardNum));
    } else {
      parts.push(buildContentSeg(seg));
    }
  }

  const bodyList = resolve(OUT_DIR, 'body-concat.txt');
  writeFileSync(bodyList, parts.map(p => `file '${p}'`).join('\n'));
  const body = resolve(OUT_DIR, 'body.mp4');
  ff(`-f concat -safe 0 -i "${bodyList}" -c copy "${body}"`, 'concat body');
  const bodyDur = dur(body);
  console.log(`  Body: ${Math.floor(bodyDur / 60)}:${String(Math.round(bodyDur % 60)).padStart(2, '0')} (${shotIndex} cuts)`);

  const zoneA = resolve(MUSIC_DIR, 'Artifact at Night.mp3');
  const zoneB = resolve(MUSIC_DIR, 'Muted System Check.mp3');
  const zoneC = resolve(MUSIC_DIR, 'Campfire Drift.mp3');
  const musicList = resolve(OUT_DIR, 'music-concat.txt');
  writeFileSync(musicList, [zoneA, zoneB, zoneC].map(p => `file '${p}'`).join('\n'));
  const musicBed = resolve(OUT_DIR, 'music-bed.mp3');
  ff(
    `-f concat -safe 0 -i "${musicList}" -af "afade=t=in:d=2,afade=t=out:st=${(bodyDur - 3).toFixed(1)}:d=3" ` +
    `-t ${bodyDur.toFixed(2)} -c:a libmp3lame -b:a 192k "${musicBed}"`,
    '3-zone music bed'
  );
  const mixed = resolve(OUT_DIR, 'mixed.mp4');
  ff(
    `-i "${body}" -i "${musicBed}" ` +
    `-filter_complex "[1:a]volume=0.15[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]" ` +
    `-map 0:v -map "[a]" -t ${bodyDur.toFixed(2)} -c:v copy -c:a aac -b:a 192k "${mixed}"`,
    'mix VO + music@15%'
  );

  const statsRaw = execSync(`ffmpeg -i "${mixed}" -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1`).toString();
  const m = statsRaw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Loudnorm pass 1 failed');
  const s = JSON.parse(m[0]);

  if (existsSync(FINAL)) unlinkSync(FINAL);
  ff(
    `-i "${mixed}" -c:v copy ` +
    `-af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${s.input_i}:measured_LRA=${s.input_lra}:measured_TP=${s.input_tp}:measured_thresh=${s.input_thresh}:offset=${s.target_offset}:linear=true" ` +
    `-c:a aac -b:a 192k -ar 48000 -movflags +faststart "${FINAL}"`,
    'loudnorm → EP-final'
  );

  console.log(`\n✅ EP-final.mp4 — ${dur(FINAL).toFixed(1)}s (${((Date.now() - t0) / 1000).toFixed(0)}s build)`);
  console.log(`   Next: npx tsx ../../canon/wrap-with-bumpers.ts ${FINAL} --force`);
  console.log('ASSEMBLE_DONE');
}

main();
