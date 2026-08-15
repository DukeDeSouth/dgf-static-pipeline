// fal.ai client — DukeDeSouth v2 (GPT2 t2i/edit + Seedance/Kling i2v)
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

// Repo root .env (HANDOFF: FAL_KEY lives in monorepo root, not pipeline/.env)
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
fal.config({ credentials: process.env.FAL_KEY! });

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4',
};

export async function upload(path: string, mimeOverride?: string): Promise<string> {
  const ext = path.split('.').pop()!.toLowerCase();
  const blob = new Blob([readFileSync(path)], { type: mimeOverride || MIME[ext] || 'application/octet-stream' });
  return fal.storage.upload(blob);
}

async function dl(url: string, outPath: string) {
  const resp = await fetch(url);
  writeFileSync(outPath, Buffer.from(await resp.arrayBuffer()));
}

// ── IMAGE GENERATION ───────────────────────────────────────

/** GPT Image 2 — text-to-image (no reference). */
export async function t2i(opts: { prompt: string; outPath: string; retries?: number }): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  t2i exists, skip`); return; }
  const maxAttempts = (opts.retries ?? 2) + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fal.subscribe('openai/gpt-image-2', {
        input: { prompt: opts.prompt, image_size: { width: 1920, height: 1080 }, quality: 'high', num_images: 1, output_format: 'png' },
        pollInterval: 3000,
      });
      const url = (result.data as any)?.images?.[0]?.url;
      if (!url) throw new Error('t2i: no image URL');
      await dl(url, opts.outPath);
      console.log(`  ✅ t2i: ${opts.outPath.split('/').pop()}`);
      return;
    } catch (e: any) {
      if (attempt === maxAttempts - 1) throw e;
      console.warn(`  t2i retry ${attempt + 1}: ${e.message?.slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/** GPT Image 2 — edit with reference image(s). Used for overlays, end-frames, receipt highlights. */
export async function gpt2edit(opts: { prompt: string; refPaths: string[]; outPath: string; retries?: number }): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  gpt2edit exists, skip`); return; }
  const maxAttempts = (opts.retries ?? 2) + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const urls = await Promise.all(opts.refPaths.map((p) => upload(p, 'image/png')));
      const result = await fal.subscribe('openai/gpt-image-2/edit', {
        input: { prompt: opts.prompt, image_urls: urls, image_size: { width: 1920, height: 1080 }, quality: 'high', num_images: 1, output_format: 'png' },
        pollInterval: 3000,
      });
      const url = (result.data as any)?.images?.[0]?.url;
      if (!url) throw new Error('gpt2edit: no image URL');
      await dl(url, opts.outPath);
      console.log(`  ✅ gpt2edit: ${opts.outPath.split('/').pop()}`);
      return;
    } catch (e: any) {
      if (attempt === maxAttempts - 1) throw e;
      console.warn(`  gpt2edit retry ${attempt + 1}: ${e.message?.slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ── VIDEO GENERATION ───────────────────────────────────────

/** Seedance 2.0 Fast — start+end frame interpolation with action prompt. */
export async function seedanceFast(opts: {
  startPath: string;
  endPath?: string;
  prompt: string;
  outPath: string;
  duration?: string;
}): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  seedance exists, skip`); return; }
  const startUrl = await upload(opts.startPath);
  const input: Record<string, any> = {
    prompt: opts.prompt,
    image_url: startUrl,
    duration: opts.duration ?? '5',
    aspect_ratio: '16:9',
    resolution: '720p',
    generate_audio: false,
  };
  if (opts.endPath) input.end_image_url = await upload(opts.endPath);

  const result = await fal.subscribe('bytedance/seedance-2.0/fast/image-to-video', {
    input,
    pollInterval: 3000,
    logs: true,
  });
  const videoUrl = (result as any).data?.video?.url;
  if (!videoUrl) throw new Error(`seedance: no video URL\n${JSON.stringify(result).slice(0, 300)}`);
  await dl(videoUrl, opts.outPath);
  console.log(`  ✅ seedance: ${opts.outPath.split('/').pop()}`);
}

/** Seedance 2.0 Standard — best quality I2V ($0.302/s), 720p, audio capable. */
export async function seedanceStd(opts: {
  startPath: string;
  endPath?: string;
  prompt: string;
  outPath: string;
  duration?: string;
}): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  seedance-std exists, skip`); return; }
  const startUrl = await upload(opts.startPath);
  const input: Record<string, any> = {
    prompt: opts.prompt,
    image_url: startUrl,
    duration: opts.duration ?? '5',
    aspect_ratio: '16:9',
    resolution: '720p',
    generate_audio: false,
  };
  if (opts.endPath) input.end_image_url = await upload(opts.endPath);

  const result = await fal.subscribe('bytedance/seedance-2.0/image-to-video', {
    input,
    pollInterval: 3000,
    logs: true,
  });
  const videoUrl = (result as any).data?.video?.url;
  if (!videoUrl) throw new Error(`seedance-std: no video URL\n${JSON.stringify(result).slice(0, 300)}`);
  await dl(videoUrl, opts.outPath);
  console.log(`  ✅ seedance-std: ${opts.outPath.split('/').pop()}`);
}

/** Kling 3.0 Pro — i2v without audio. Cheaper ($0.112/s), 1080p native. */
export async function klingI2V(opts: {
  imagePath: string;
  prompt: string;
  outPath: string;
  duration?: string;
}): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  kling exists, skip`); return; }
  const imageUrl = await upload(opts.imagePath);
  const result = await fal.subscribe('fal-ai/kling-video/v3/standard/image-to-video', {
    input: {
      prompt: opts.prompt,
      image_url: imageUrl,
      duration: opts.duration ?? '5',
      aspect_ratio: '16:9',
      generate_audio: false,
    },
    pollInterval: 3000,
    logs: true,
  });
  const videoUrl = (result as any).data?.video?.url;
  if (!videoUrl) throw new Error(`kling: no video URL\n${JSON.stringify(result).slice(0, 300)}`);
  await dl(videoUrl, opts.outPath);
  console.log(`  ✅ kling: ${opts.outPath.split('/').pop()}`);
}

/** Legacy Seedance R2V — kept for backward compat. */
export async function i2v(opts: {
  imagePath: string;
  prompt: string;
  outPath: string;
  duration?: string;
}): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  i2v exists, skip`); return; }
  const imageUrl = await upload(opts.imagePath);
  const result = await fal.subscribe('bytedance/seedance-2.0/reference-to-video', {
    input: {
      prompt: opts.prompt,
      image_urls: [imageUrl],
      duration: opts.duration ?? '8',
      aspect_ratio: '16:9',
      resolution: '1080p',
      generate_audio: false,
    },
    logs: true,
  });
  const videoUrl = (result as any).data?.video?.url;
  if (!videoUrl) throw new Error(`i2v: no video URL\n${JSON.stringify(result).slice(0, 400)}`);
  await dl(videoUrl, opts.outPath);
  console.log(`  ✅ i2v: ${opts.outPath}`);
}
