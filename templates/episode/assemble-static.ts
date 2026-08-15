// DGF TEMPLATE — Static review gate (reads vo/shot-order.json, no Ken Burns)
// Run: npx tsx assemble-static.ts
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const VO_DIR = resolve(HERE, 'vo');
const FRAMES = resolve(HERE, 'broll', 'frames');
const TMP = resolve(HERE, 'tmp-static');
const OUT = resolve(HERE, 'EP-static-test.mp4');
const MUSIC = resolve(HERE, '../../music/Artifact at Night.mp3');
const STING = resolve(HERE, '../../canon/bumpers/glitch-sting.m4a');
const CARD_DUR = 3.5;
mkdirSync(TMP, { recursive: true });

const TIMINGS: Record<string, Record<string, { start: number; dur: number }>> =
  JSON.parse(readFileSync(resolve(VO_DIR, 'timings.json'), 'utf-8'));

const ORDER = JSON.parse(readFileSync(resolve(VO_DIR, 'shot-order.json'), 'utf-8')) as {
  bodyOrder: string[];
  shots: Record<string, string[]>;
};

interface SegDef { id: string; shots: string[]; isActCard?: boolean }
const SEGMENTS: SegDef[] = ORDER.bodyOrder.map((id) => {
  if (id.startsWith('T')) return { id, shots: [id], isActCard: true };
  return { id, shots: ORDER.shots[id] };
});
const BODY_ORDER = ORDER.bodyOrder;

function ff(cmd: string, label?: string) {
  if (label) console.log(`  [ffmpeg] ${label}`);
  execSync(`ffmpeg ${cmd}`, { stdio: 'pipe', maxBuffer: 100 * 1024 * 1024 });
}

function dur(p: string): number {
  return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`).toString().trim());
}

function stillClip(frame: string, duration: number, out: string) {
  if (existsSync(out)) return;
  ff(
    `-y -loop 1 -t ${duration.toFixed(3)} -i "${frame}" ` +
    `-vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,fps=30" ` +
    `-c:v libx264 -crf 20 -preset ultrafast -an "${out}"`
  );
}

function buildContentSeg(seg: SegDef): string {
  const segOut = resolve(TMP, `seg-${seg.id}.mp4`);
  if (existsSync(segOut)) return segOut;

  const voFile = resolve(VO_DIR, `vo-${seg.id}.mp3`);
  const timings = TIMINGS[seg.id];
  const shotClips: string[] = [];

  for (const shotId of seg.shots) {
    const t = timings?.[shotId];
    if (!t) continue;
    const fp = resolve(FRAMES, `${shotId}.png`);
    const vOnly = resolve(TMP, `_v-${shotId}.mp4`);
    const shotOut = resolve(TMP, `_shot-${shotId}.mp4`);
    if (existsSync(shotOut)) { shotClips.push(shotOut); continue; }

    if (existsSync(fp)) stillClip(fp, t.dur, vOnly);
    else ff(`-y -f lavfi -i "color=c=0x4A9FE8:s=1920x1080:d=${t.dur}:r=30" -c:v libx264 -crf 20 -an "${vOnly}"`);

    const aSlice = resolve(TMP, `_a-${shotId}.aac`);
    if (!existsSync(aSlice)) {
      ff(`-y -i "${voFile}" -ss ${t.start.toFixed(3)} -t ${t.dur.toFixed(3)} -vn -af aresample=48000 -ac 2 -c:a aac -b:a 192k "${aSlice}"`);
    }
    ff(`-y -i "${vOnly}" -i "${aSlice}" -c:v copy -c:a aac -ar 48000 -ac 2 -shortest "${shotOut}"`);
    shotClips.push(shotOut);
  }

  const list = resolve(TMP, `list-${seg.id}.txt`);
  writeFileSync(list, shotClips.map(p => `file '${p}'`).join('\n'));
  ff(`-y -f concat -safe 0 -i "${list}" -c copy "${segOut}"`);
  console.log(`  ✅ seg-${seg.id} (${shotClips.length} shots)`);
  return segOut;
}

function buildActCard(shotId: string): string {
  const out = resolve(TMP, `seg-card-${shotId}.mp4`);
  if (existsSync(out)) return out;
  const fp = resolve(FRAMES, `${shotId}.png`);
  const vOnly = resolve(TMP, `_cardv-${shotId}.mp4`);
  if (existsSync(fp)) stillClip(fp, CARD_DUR, vOnly);
  ff(
    `-y -i "${vOnly}" -ss 0 -t ${CARD_DUR} -i "${STING}" ` +
    `-filter_complex "[1:a]volume=0.45,afade=t=in:st=0:d=0.3,afade=t=out:st=${CARD_DUR - 0.5}:d=0.5,aresample=48000,aformat=channel_layouts=stereo[a]" ` +
    `-map 0:v -map "[a]" -c:v copy -c:a aac -ac 2 -b:a 192k -ar 48000 -shortest "${out}"`
  );
  return out;
}

function main() {
  console.log('\n🔧 DGF Static Assembly (5s cadence review gate)\n');

  const parts: string[] = [];
  for (const id of BODY_ORDER) {
    const seg = SEGMENTS.find(s => s.id === id);
    if (!seg) continue;
    parts.push(seg.isActCard ? buildActCard(seg.shots[0]) : buildContentSeg(seg));
  }

  const masterList = resolve(TMP, 'master.txt');
  writeFileSync(masterList, parts.map(p => `file '${p}'`).join('\n'));
  const body = resolve(TMP, 'body.mp4');
  ff(`-y -f concat -safe 0 -i "${masterList}" -c copy "${body}"`, 'concat body');
  const bodyDur = dur(body);

  const mixed = resolve(TMP, 'mixed.mp4');
  if (existsSync(MUSIC)) {
    ff(
      `-y -i "${body}" -stream_loop -1 -i "${MUSIC}" ` +
      `-filter_complex "[1:a]volume=0.15,afade=t=in:d=3,afade=t=out:st=${(bodyDur - 4).toFixed(1)}:d=4[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]" ` +
      `-map 0:v -map "[a]" -t ${bodyDur.toFixed(2)} -c:v copy -c:a aac -b:a 192k "${mixed}"`,
      'music'
    );
  } else {
    execSync(`cp "${body}" "${mixed}"`);
  }

  const statsRaw = execSync(`ffmpeg -i "${mixed}" -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1`).toString();
  const m = statsRaw.match(/\{[\s\S]*\}/);
  if (m) {
    const s = JSON.parse(m[0]);
    ff(
      `-y -i "${mixed}" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${s.input_i}:measured_LRA=${s.input_lra}:measured_TP=${s.input_tp}:measured_thresh=${s.input_thresh}:offset=${s.target_offset}:linear=true" -c:a aac -b:a 192k "${OUT}"`,
      'loudnorm'
    );
  } else {
    ff(`-y -i "${mixed}" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k "${OUT}"`);
  }

  console.log(`\n✅ EP-static-test.mp4 — ${dur(OUT).toFixed(1)}s`);
  console.log('STATIC_TEST_DONE');
}

main().catch(e => { console.error(e); process.exit(1); });
