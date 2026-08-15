# DGF Static Pipeline

Faceless **2D doodle** long-form YouTube pipeline — **no I2V**, shots + FFmpeg Ken Burns only.

Proven on EP003 (67 shots @ 5s cadence, ~5:45). Motion/I2V variant is **not** included (see Kolobok motion scripts in monorepo for that).

## Quick start

```bash
git clone <your-repo-url> dgf-static-pipeline && cd dgf-static-pipeline
cp .env.example .env   # fill FAL_KEY, KIE_KEY, ELEVENLABS_API_KEY
npm install

# New episode
cp -r templates/episode episodes/004-my-topic
cd episodes/004-my-topic
# Edit: gen-vo SEGMENTS, script, shots.ts (after calc-timings)

npx tsx gen-vo.ts --preview && npx tsx gen-vo.ts
npx tsx calc-timings.ts
npx tsx gen-frames.ts --all
npx tsx assemble-static.ts
npx tsx assemble-final.ts
npx tsx ../../canon/wrap-with-bumpers.ts EP-final.mp4 --force
npx tsx gen-thumb.ts
npx tsx ../../canon/upload-youtube.ts . --privacy=unlisted
```

**Requires:** Node 20+, FFmpeg/ffprobe in PATH.

## Structure

```
dgf-static-pipeline/
├── .env.example
├── templates/episode/     # copy → episodes/{slug}/
├── episodes/              # your productions (gitignored outputs)
├── src/lib/               # fal, kie, episode-gates
├── canon/                 # VISUAL_CANON, wrap, upload, cast refs
├── music/                 # add 3-zone tracks (see music/README.md)
├── reference/             # STATIC_PIPELINE_REFERENCE.md, static-mode.mdc
└── examples/episode-starter/
```

## API keys

| Key | Service | Used for |
|---|---|---|
| `FAL_KEY` | fal.ai | GPT Image 2 (frames, thumbs, cast) |
| `KIE_KEY` | kie.ai | Alternate t2i (batch parallelism) |
| `ELEVENLABS_API_KEY` | ElevenLabs | VO with word timestamps |

## Assets you must add locally

| Asset | Path | How |
|---|---|---|
| 3-zone music | `music/*.mp3` | See `music/README.md` |
| Bumpers (optional) | `canon/bumpers/intro.mp4` etc. | `npx tsx canon/gen-bumpers.ts` or your own |
| Cast refs | `canon/cast/*-doodle.png` | Included (Mo, Keeper). Regen: `npx tsx canon/gen-cast.ts` |
| Act card sting | `canon/bumpers/glitch-sting.m4a` | Included |

## Invariants (don't skip)

1. **5s cadence** — `calc-timings.ts` builds grid → fill `shots.ts` per `vo/shot-order.json`
2. **After every `assemble-final` rebuild** → `wrap-with-bumpers.ts --force` (never `cp` wrapped files)
3. **Upload** → `upload-youtube.ts` auto re-wraps if stale + cadence gate
4. **Visual review** every PNG before assembly

## Cost

~$5–7/episode (~67 frames + VO + thumbs). Zero I2V.

## Docs

- `reference/STATIC_PIPELINE_REFERENCE.md` — full phase spec
- `reference/rules/static-mode.mdc` — enforcement rules
- `canon/VISUAL_CANON.md` — style bible
- `canon/EPISODE_STRUCTURE.md` — act cards, VO structure

## vs motion pipeline

This repo is **static only** (Ken Burns). For Seedance/Kling I2V motion pipeline, use the separate motion export (Kolobok / EP002 scripts in LouisKartavyi monorepo).

## Sync from monorepo

If you maintain LouisKartavyi internally, run from monorepo:

```bash
./scripts/sync-from-louiskartavyi.sh
```
