// DGF TEMPLATE — A/B/C thumbnails (2D doodle + yellow CAPS hook)
// Format: Mo reacts + bold yellow question text ON image (VISUAL_CANON §5)
// Run: npx tsx gen-thumb.ts
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(HERE, '../../.env') });
fal.config({ credentials: process.env.FAL_KEY! });

const STYLE =
  'Deep Glitch Files 2D doodle explainer thumbnail: thick black outlines, flat saturated colors, ' +
  'doodle stick-figure Mo (white round head, big expressive eyes) reacting on one side to a central ' +
  'scene. Bold large yellow (#FFD700) CAPS text with thick black outline at top — short curiosity ' +
  'question hook. Bright high-contrast background, ONE focal element, readable at 150px width. ' +
  'Optional small FILE stamp in corner. No clutter.';

const THUMBS = [
  { file: 'thumbnail-A.png', prompt: `${STYLE} FILL ME — concept A: Mo surprised + central object + yellow CAPS hook text. 1280x720.` },
  { file: 'thumbnail-B.png', prompt: `${STYLE} FILL ME — concept B: before/after paradox + yellow CAPS hook text. 1280x720.` },
  { file: 'thumbnail-C.png', prompt: `${STYLE} FILL ME — concept C: single powerful metaphor + glitch accent on object + yellow CAPS hook text. 1280x720.` },
];

async function gen(t: typeof THUMBS[0]) {
  const out = resolve(HERE, t.file);
  if (existsSync(out)) { console.log(`  skip: ${t.file}`); return; }
  const result = await fal.subscribe('openai/gpt-image-2', {
    input: { prompt: t.prompt, image_size: { width: 1280, height: 720 }, quality: 'high', num_images: 1, output_format: 'png' },
    pollInterval: 3000,
  });
  const url = (result.data as any)?.images?.[0]?.url;
  if (!url) throw new Error(`No URL for ${t.file}`);
  const resp = await fetch(url);
  writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
  console.log(`  ✅ ${t.file}`);
}

async function main() {
  console.log('\n🎨 DGF Thumbnails (doodle + yellow CAPS) — 3 variants\n');
  await Promise.allSettled(THUMBS.map(gen));
  console.log('\nTHUMBS_DONE');
}

main().catch(e => { console.error(e); process.exit(1); });
