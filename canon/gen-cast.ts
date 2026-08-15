// Deep Glitch Files — cast & thumbnail register (2D doodle style).
// Run: npx tsx canon/gen-cast.ts
import 'dotenv/config';
import { fal } from '@fal-ai/client';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

fal.config({ credentials: process.env.FAL_KEY! });
const HERE = dirname(fileURLToPath(import.meta.url));
const CAST = resolve(HERE, 'cast');
mkdirSync(CAST, { recursive: true });

// VISUAL_CANON.md §3 — 2D doodle explainer (LOCKED 2026-08-14)
const STYLE =
  'Deep Glitch Files style: clean 2D digital doodle explainer illustration, thick black outlines, ' +
  'flat saturated colors, simple expressive stick-figure human with large round eyes and white circular ' +
  'head, bright friendly educational YouTube cartoon aesthetic, simple background, bold readable ' +
  'composition. No photorealism, no 3D, no clay, no stop-motion, no anime.';

async function dl(url: string, out: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`dl ${r.status}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

async function gpt2(prompt: string, out: string) {
  if (existsSync(out)) { console.log(`  skip (exists): ${out.split('/').pop()}`); return; }
  const result = await fal.subscribe('openai/gpt-image-2', {
    input: { prompt, image_size: { width: 1920, height: 1080 }, quality: 'high', num_images: 1, output_format: 'png' },
    pollInterval: 3000,
  });
  const url = (result.data as any)?.images?.[0]?.url;
  if (!url) throw new Error(`gpt2: no URL — ${JSON.stringify(result).slice(0, 300)}`);
  await dl(url, out);
  console.log(`  ✅ ${out.split('/').pop()}`);
}

async function nano(prompt: string, out: string) {
  if (existsSync(out)) { console.log(`  skip (exists): ${out.split('/').pop()}`); return; }
  const result = await fal.subscribe('fal-ai/nano-banana-pro', {
    input: { prompt, aspect_ratio: '16:9', resolution: '2K', output_format: 'png', num_images: 1, safety_tolerance: '6' },
    pollInterval: 3000,
  });
  const url = (result.data as any)?.images?.[0]?.url;
  if (!url) throw new Error(`nano: no URL — ${JSON.stringify(result).slice(0, 300)}`);
  await dl(url, out);
  console.log(`  ✅ ${out.split('/').pop()}`);
}

const MO_PROMPT =
  `${STYLE} Character reference sheet of "Mo", the viewer-surrogate: white circular head, ` +
  `large round expressive eyes, simple line mouth, thin stick-figure body, short brown hair strokes, ` +
  `thick black outlines, flat colors. Full body standing, neutral sky-blue background. ` +
  `Emotion read through eyes and posture. No text, no logos.`;

const KEEPER_PROMPT =
  `${STYLE} Pair of simple doodle hands with thick black outlines opening a manila file folder ` +
  `with a red tab. Faceless — only hands and folder. Dark neutral background. No text.`;

const THUMB_PROMPT =
  `${STYLE} YouTube thumbnail, bright high-contrast composition. Doodle stick-figure Mo (white ` +
  `circular head, big eyes) on the left reacting with surprise to a dissolving baby figure on the ` +
  `right corrupting into a digital glitch with teal (#2BB6A8) and magenta (#D6347B) scanlines. ` +
  `Bold large yellow (#FFD700) text with thick black outline at top reading ` +
  `"WHY CAN'T YOU REMEMBER BEING BORN?". Small corner stamp "FILE 011". 1280x720.`;

async function main() {
  console.log('\n🎬 Deep Glitch Files — doodle cast/thumbnail gen\n');
  console.log('1/3 Mo reference…');
  await gpt2(MO_PROMPT, resolve(CAST, 'mo-reference-doodle.png'));
  console.log('2/3 Keeper hands…');
  await gpt2(KEEPER_PROMPT, resolve(CAST, 'keeper-hands-doodle.png'));
  console.log('3/3 Thumbnail mock…');
  await nano(THUMB_PROMPT, resolve(HERE, 'thumbnail-mock-doodle-ep11.png'));
  console.log('\n✅ DONE → canon/cast/mo-reference-doodle.png + keeper-hands-doodle.png + thumbnail-mock-doodle-ep11.png\n');
}
main().catch((e) => { console.error(e); process.exit(1); });
