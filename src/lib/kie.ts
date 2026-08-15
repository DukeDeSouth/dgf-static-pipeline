// kie.ai client — GPT Image 2 text-to-image via Kie.ai API (parallel with fal.ai)
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, existsSync } from 'node:fs';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
const KIE_KEY = process.env.KIE_KEY!;
const BASE = 'https://api.kie.ai/api/v1';

async function poll<T>(url: string, check: (d: any) => T | null, maxMs = 120_000): Promise<T> {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${KIE_KEY}` } });
    const json = await r.json();
    const result = check(json);
    if (result !== null) return result;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`poll timeout: ${url}`);
}

/** GPT Image 2 text-to-image via Kie.ai */
export async function kieT2I(opts: { prompt: string; outPath: string; retries?: number }): Promise<void> {
  if (existsSync(opts.outPath)) { console.log(`  kie-t2i exists, skip`); return; }
  const maxAttempts = (opts.retries ?? 2) + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const createResp = await fetch(`${BASE}/jobs/createTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIE_KEY}` },
        body: JSON.stringify({
          model: 'gpt-image-2-text-to-image',
          input: { prompt: opts.prompt, aspect_ratio: '16:9', resolution: '2K' },
        }),
      });
      if (!createResp.ok) throw new Error(`kie createTask: ${createResp.status} ${await createResp.text().catch(() => '')}`);
      const { data } = await createResp.json();
      const taskId = data?.taskId;
      if (!taskId) throw new Error('kie: no taskId');

      const url = await poll(
        `${BASE}/jobs/recordInfo?taskId=${taskId}`,
        (json) => {
          const d = json?.data;
          if (d?.state === 'success') {
            try {
              const parsed = JSON.parse(d.resultJson);
              return parsed?.resultUrls?.[0] ?? null;
            } catch { return null; }
          }
          if (d?.state === 'failed') throw new Error(`kie task failed: ${d.failReason ?? 'unknown'}`);
          return null;
        }
      );

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`kie download: ${resp.status}`);
      writeFileSync(opts.outPath, Buffer.from(await resp.arrayBuffer()));
      console.log(`  ✅ kie-t2i: ${opts.outPath.split('/').pop()}`);
      return;
    } catch (e: any) {
      if (attempt === maxAttempts - 1) throw e;
      console.warn(`  kie-t2i retry ${attempt + 1}: ${e.message?.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
