// DGF TEMPLATE — VO (ElevenLabs DukeClay + with-timestamps)
// Run: npx tsx gen-vo.ts [--preview] [--only=hook,act1]
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(HERE, '../../.env') });

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY!;
const VOICE_ID = 'Mn8ouzOen8s5FX5UTC0M'; // DukeClay — LOCKED
const VO = resolve(HERE, 'vo');
mkdirSync(VO, { recursive: true });

// Wonder-first tone (SCRIPT_ENGINE). Без <break>. Числа словами. Сегмент ≤ 3 мин.
const SEGMENTS: { id: string; text: string }[] = [
  { id: 'hook', text: `FILL ME — Question Engine hook (self-projection, 20-30s).` },
  { id: 'setup', text: `FILL ME — наивная картина / «как все думают».` },
  { id: 'act1', text: `FILL ME — ACT 1: lived experience / context.` },
  { id: 'act2', text: `FILL ME — ACT 2: THE GLITCH — reveal + механизм.` },
  // { id: 'act2b', text: `FILL ME — optional second act2 block (как EP002 sleep paralysis).` },
  { id: 'act3', text: `FILL ME — ACT 3: payoff + «почему это про тебя».` },
  { id: 'outro', text: `FILL ME — open-loop тизер следующего файла (S-015, withhold имя/механизм).` },
];

async function tts(text: string, outPath: string) {
  if (existsSync(outPath)) { console.log(`  skip: ${outPath.split('/').pop()}`); return; }
  const alignPath = outPath.replace('.mp3', '.alignment.json');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVEN_KEY },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!r.ok) throw new Error(`TTS ${r.status}: ${await r.text()}`);
  const data = await r.json() as {
    audio_base64: string;
    alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };
  writeFileSync(outPath, Buffer.from(data.audio_base64, 'base64'));
  if (!data.alignment) throw new Error('No alignment — calc-timings не построить');
  writeFileSync(alignPath, JSON.stringify(data.alignment, null, 2));
  console.log(`  ✅ tts+alignment: ${outPath.split('/').pop()}`);
}

function dur(path: string): number {
  return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${path}"`).toString().trim());
}

async function main() {
  const preview = process.argv.includes('--preview');
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',') : null;
  let targets = SEGMENTS;
  if (preview) targets = SEGMENTS.slice(0, 1);
  if (only) targets = SEGMENTS.filter(s => only.includes(s.id));

  console.log(`\n🎙 DGF VO — DukeClay (${targets.length} segments)${preview ? ' [PREVIEW]' : ''}\n`);
  let total = 0;
  for (const seg of targets) {
    const out = resolve(VO, `vo-${seg.id}.mp3`);
    await tts(seg.text, out);
    total += dur(out);
    console.log(`    → ${seg.id}: ${dur(out).toFixed(1)}s`);
  }
  console.log(`\n── Total: ${Math.floor(total / 60)}m${Math.round(total % 60)}s`);
  if (preview) console.log('>>> Послушай preview → npx tsx gen-vo.ts');
  console.log('VO_DONE');
}

main().catch(e => { console.error(e); process.exit(1); });
