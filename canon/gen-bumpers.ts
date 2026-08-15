// Deep Glitch Files — Generate canon bumpers: intro (5s), disclaimer (4s), endcard (15s).
// Strategy: render text frames via Nano Banana Pro (no drawtext dependency),
// then FFmpeg composes them into video with optional Suno audio.
// Also extracts 2s glitch-sting from intro for act-card transitions.
// Usage: npx tsx canon/gen-bumpers.ts
import 'dotenv/config';
import { fal } from '@fal-ai/client';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

fal.config({ credentials: process.env.FAL_KEY! });

const HERE = dirname(fileURLToPath(import.meta.url));
const BUMPERS = resolve(HERE, 'bumpers');
const FRAMES = resolve(BUMPERS, 'frames');
mkdirSync(FRAMES, { recursive: true });

const KEEPER = resolve(HERE, 'cast/keeper-hands.png');
const LOGO = resolve(HERE, 'brand/logo.png');
const AVATAR = resolve(HERE, 'brand/avatar.png');

async function dl(url: string, out: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`dl ${r.status}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

async function nano(prompt: string, out: string, aspect = '16:9') {
  if (existsSync(out)) { console.log(`  skip frame: ${out.split('/').pop()}`); return; }
  const result = await fal.subscribe('fal-ai/nano-banana-pro', {
    input: { prompt, aspect_ratio: aspect, resolution: '2K', output_format: 'png', num_images: 1, safety_tolerance: '6' },
    pollInterval: 3000,
  });
  const url = (result.data as any)?.images?.[0]?.url;
  if (!url) throw new Error(`nano fail: ${JSON.stringify(result).slice(0, 300)}`);
  await dl(url, out);
  console.log(`  ✅ frame: ${out.split('/').pop()}`);
}

function ff(args: string, label: string) {
  console.log(`  ff: ${label}`);
  execSync(`ffmpeg -y ${args}`, { stdio: 'pipe' });
}

const STYLE_BASE =
  'Dark background (#16140F), warm clay aesthetic, subtle film grain, ' +
  'handmade stop-motion feel. Clean composition.';

// ── STEP 1: Generate static frames via Nano Banana Pro ──────────────────

async function genFrames() {
  console.log('\n📐 Step 1: Generating bumper frames (Nano Banana Pro)\n');

  await nano(
    `${STYLE_BASE} YouTube intro card. Center: a pair of rough terracotta clay hands ` +
    `opening a cream-colored clay file folder on a dark tabletop. Above the hands, ` +
    `bold large condensed white sans-serif text "DEEP GLITCH FILES" with a teal (#2BB6A8) ` +
    `and magenta (#D6347B) digital glitch scanline tearing through the middle of the text. ` +
    `Below in small monospace typewriter font: "reality has glitches. we pull the files." ` +
    `in teal (#2BB6A8). Dark vignette. Cinematic.`,
    resolve(FRAMES, 'intro-frame.png'),
  );

  await nano(
    `${STYLE_BASE} YouTube disclaimer card, serious tone. Dark background (#16140F). ` +
    `Center: bold yellow-orange warning symbol ⚠ at top. Below it large bold condensed ` +
    `white sans-serif text "AI-GENERATED VISUALS". Below that, two lines in smaller ` +
    `monospace typewriter font in cream (#E8D6B8): "All claims are sourced." and ` +
    `"Speculation is labeled as hypothesis." Clean, minimal, no imagery, just text ` +
    `on dark background. Subtle teal (#2BB6A8) thin horizontal line above and below text block.`,
    resolve(FRAMES, 'disclaimer-frame.png'),
  );

  await nano(
    `${STYLE_BASE} YouTube end card / subscribe screen. Dark background (#16140F). ` +
    `Top center: bold condensed sans-serif text "SOURCES IN THE DESCRIPTION" in ` +
    `teal (#2BB6A8). Below: larger text "DEEP GLITCH FILES" in cream (#E8D6B8) ` +
    `with a subtle magenta (#D6347B) glitch tear on one letter. Below: small ` +
    `typewriter text "the next file is already open." in magenta. Bottom-left corner: ` +
    `small clay figure silhouette (Mo). Large empty center area for YouTube end-screen ` +
    `elements. Clean, minimal, cinematic.`,
    resolve(FRAMES, 'endcard-frame.png'),
  );
}

// ── STEP 2: Compose video bumpers with FFmpeg ───────────────────────────

function genIntroVideo() {
  const out = resolve(BUMPERS, 'intro.mp4');
  if (existsSync(out)) { console.log('  skip: intro.mp4 exists'); return; }

  const frame = resolve(FRAMES, 'intro-frame.png');
  if (!existsSync(frame)) { console.log('  ⚠ no intro-frame.png'); return; }

  const introMusic = resolve(BUMPERS, 'intro-music.mp3');
  const hasMusic = existsSync(introMusic);

  const audioFlag = hasMusic
    ? `-i "${introMusic}"`
    : `-f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" -t 5`;

  // Ken Burns slow zoom on intro frame + fade in
  ff(
    `-loop 1 -t 5 -i "${frame}" ${audioFlag} ` +
    `-filter_complex "[0:v]scale=2200:-1,zoompan=z='min(zoom+0.001,1.12)':d=150:s=1920x1080:` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',setsar=1,format=yuv420p,` +
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5[v]" ` +
    `-map "[v]" -map 1:a -c:v libx264 -crf 18 -preset fast -c:a aac -ac 2 -b:a 192k -t 5 -shortest "${out}"`,
    'intro.mp4'
  );
}

function genDisclaimerVideo() {
  const out = resolve(BUMPERS, 'disclaimer.mp4');
  if (existsSync(out)) { console.log('  skip: disclaimer.mp4 exists'); return; }

  const frame = resolve(FRAMES, 'disclaimer-frame.png');
  if (!existsSync(frame)) { console.log('  ⚠ no disclaimer-frame.png'); return; }

  const sfx = resolve(BUMPERS, 'disclaimer-sfx.mp3');
  const hasSfx = existsSync(sfx);

  const audioFlag = hasSfx
    ? `-i "${sfx}"`
    : `-f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" -t 4`;

  ff(
    `-loop 1 -t 4 -i "${frame}" ${audioFlag} ` +
    `-filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
    `setsar=1,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=3.5:d=0.5[v]" ` +
    `-map "[v]" -map 1:a -c:v libx264 -crf 18 -preset fast -c:a aac -ac 2 -b:a 192k -t 4 -shortest "${out}"`,
    'disclaimer.mp4'
  );
}

function genEndcardVideo() {
  const out = resolve(BUMPERS, 'endcard.mp4');
  if (existsSync(out)) { console.log('  skip: endcard.mp4 exists'); return; }

  const frame = resolve(FRAMES, 'endcard-frame.png');
  if (!existsSync(frame)) { console.log('  ⚠ no endcard-frame.png'); return; }

  const endcardMusic = resolve(BUMPERS, 'endcard-music.mp3');
  const hasMusic = existsSync(endcardMusic);

  const audioFlag = hasMusic
    ? `-i "${endcardMusic}"`
    : `-f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" -t 15`;

  ff(
    `-loop 1 -t 15 -i "${frame}" ${audioFlag} ` +
    `-filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
    `setsar=1,format=yuv420p,fade=t=in:st=0:d=0.5[v]" ` +
    `-map "[v]" -map 1:a -c:v libx264 -crf 18 -preset fast -c:a aac -ac 2 -b:a 192k -t 15 -shortest "${out}"`,
    'endcard.mp4'
  );
}

function genGlitchSting() {
  const introMp4 = resolve(BUMPERS, 'intro.mp4');
  const out = resolve(BUMPERS, 'glitch-sting.m4a');
  if (existsSync(out)) { console.log('  skip: glitch-sting exists'); return; }
  if (!existsSync(introMp4)) { console.log('  skip: no intro.mp4 yet for sting'); return; }

  ff(
    `-i "${introMp4}" -vn -af "afade=t=in:d=0.1,afade=t=out:st=1.4:d=0.6" -t 2.0 -c:a aac -b:a 192k "${out}"`,
    'glitch-sting (2s from intro)'
  );
}

// ── MAIN ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎬 Deep Glitch Files — canon bumpers\n');

  await genFrames();

  console.log('\n🎥 Step 2: Composing video bumpers (FFmpeg)\n');
  genIntroVideo();
  genDisclaimerVideo();
  genEndcardVideo();
  genGlitchSting();

  console.log('\n✅ Bumpers done → canon/bumpers/');
  console.log('   intro.mp4 (5s), disclaimer.mp4 (4s), endcard.mp4 (15s)');
  if (existsSync(resolve(BUMPERS, 'glitch-sting.m4a')))
    console.log('   glitch-sting.m4a (2s act-card sting)');
  console.log('\n💡 Add Suno audio to bumpers/ then re-run to upgrade:');
  console.log('   intro-music.mp3, disclaimer-sfx.mp3, endcard-music.mp3\n');
}
main().catch(e => { console.error(e); process.exit(1); });
