# Deep Glitch Files — Static Pipeline (без моушена)

> **Рабочий режим с 2026-08-14.** Видео только на шотах: ноль I2V (Seedance/Kling).
> «Движение» контента = FFmpeg Ken Burns (`zoompan`). Доказано на EP002 (7:25).
> Motion-вариант (EP002 I2V, $69.75) — архивный справочник, не рабочий путь.

---

## Фазы

```
research.md → script.md → SHOTLIST.md (2 слоя: VO/timing + Visual notes)
→ gen-vo.ts (DukeClay + with-timestamps)
→ calc-timings.ts → vo/timings.json + vo/shot-order.json (5s grid)
→ shots.ts (промпты по shot-order) → gen-frames.ts
→ VISUAL REVIEW (каждый PNG — единственный гейт качества картинки)
→ assemble-static.ts (review gate: кадры без зума)
→ assemble-final.ts (Ken Burns + 3-zone music + two-pass loudnorm)
→ canon/wrap-with-bumpers.ts → EP-final-wrapped.mp4
→ gen-thumb.ts (A/B/C) + YOUTUBE.md
```

---

## Что убрано vs motion-EP002

| Убрано | Замена |
|---|---|
| `gen-i2v-all.ts` / `gen-i2v-test.ts` | Ken Burns в `assemble-final.ts` |
| End-frames (gpt2edit пары) | Не нужны |
| Motion-промпты (3-layer, 6 rules) | Не нужны |
| `CINEMA_TECHNIQUES_AUDIT.md` per-shot | Опционально для hero-шотов в Visual notes |
| Seedance 2.0 Standard ($0.302/s × 45) | $0 |

**Стоимость static-эпизода (~67 шотов @ 5s):** VO ~$2 + кадры ~$2.70 + thumbs ~$0.12 = **~$5–7** (vs $69.75 EP002 I2V).

---

## DGF-специфика (не generic)

| Параметр | Значение |
|---|---|
| Голос | **DukeClay** `Mn8ouzOen8s5FX5UTC0M`, `eleven_multilingual_v2`, stab 0.5 / sim 0.75 |
| Style preamble | `canon/VISUAL_CANON.md` §3 — в КАЖДЫЙ промпт gen-frames |
| Каст | Mo, Keeper, Chorus — `canon/cast/*-doodle.png`, gpt2edit с ref. Clay refs = LEGACY |
| Glitch-шоты | Добавить glitch-блок preamble только на ACT2 reveal (1-3 за эпизод) |
| Act cards | T1/T2/T3 — статичный кадр + Ken Burns 1.08 + `canon/bumpers/glitch-sting.m4a` @45% |
| Музыка | **3-zone** (EP002): A=Artifact at Night / B=Muted System Check / C=Campfire Drift @15% |
| Bumpers | intro 5s + disclaimer 4s + endcard 15s → `canon/wrap-with-bumpers.ts` |
| Структура VO | hook → setup → T1 → act1 → T2 → act2 [→ act2b] → T3 → act3 → outro |
| Тон скрипта | wonder-first (SCRIPT_ENGINE), не forensic-debunk |
| Шоты | **5s cadence** (LOCKED с EP003): новый кадр каждые ≤5s; `calc-timings.ts` строит grid автоматически |
| shots.ts | Один промпт на каждый ID из `vo/shot-order.json` + ACT_CARDS T1–T3 |

---

## SHOTLIST.md (2 слоя)

```markdown
## SECTION — vo_segment: `act1`

| # | ID | Gen | VO text | Words | Dur |
|---|---|---|---|---|---|
| 1 | A1 | static | "For almost all of human history..." | 18 | 7.2s |

| Visual notes |
|---|
| A1: Mo (doodle) reacting to scene, bright flat colors, simple background |
```

`Gen`: `static` (t2i doodle) / `receipt` (gpt2edit с raw-скрином, если есть источник).

---

## Ken Burns (assemble-final)

- Апскейл `scale=2048:1152` перед `zoompan` (убирает субпиксельное дрожание)
- Зум 1.0→1.06 (текстовые/сложные кадры — 1.05)
- Чётный шот index → zoom-in, нечётный → zoom-out
- Act cards: зум 1.08, 3.5s

---

## 3-zone music

Сегменты помечаются зоной в `assemble-final.ts`:

| Zone | Сегменты | Трек (`music/`) |
|---|---|---|
| A | hook, setup, act1 | Artifact at Night.mp3 |
| B | act2, act2b | Muted System Check.mp3 |
| C | act3, outro | Campfire Drift.mp3 |

Сборка: concat A→B→C через `ffmpeg concat demuxer`, trim под body duration, mix @15%.

Fallback: один трек `Artifact at Night.mp3` с `acrossfade`-лупом (не `stream_loop -1`).

---

## Порядок запуска

```bash
# из корня репозитория dgf-static-pipeline/
cd episodes/003-my-topic   # скопировать из templates/episode/

npx tsx gen-vo.ts --preview
npx tsx gen-vo.ts
npx tsx calc-timings.ts
npx tsx gen-frames.ts              # план
npx tsx gen-frames.ts --sample     # ревью стиля
npx tsx gen-frames.ts --all
# >>> VISUAL REVIEW каждого PNG <<<
npx tsx assemble-static.ts         # смотреть целиком
npx tsx assemble-final.ts          # Ken Burns + 3-zone + loudnorm
npx tsx ../../canon/wrap-with-bumpers.ts EP-final.mp4   # --force after EP-final rebuild
npx tsx gen-thumb.ts
npx tsx ../../canon/upload-youtube.ts . --privacy=unlisted
```

---

## Частые фейлы (DGF static)

| Фейл | Fix |
|---|---|
| Клей выглядит как CGI, не handmade | Усилить «visible fingerprints, tool marks» в preamble; не «smooth Pixar» |
| Glitch заливает весь кадр | Glitch preamble только на 1-3 reveal-шота (VISUAL_CANON §1) |
| Каст «плывёт» между шотами | gpt2edit с `canon/cast/*-reference.png`, не перегенерировать фигуру |
| Слайдшоу-ощущение | 5s cadence + Ken Burns мягкий (1.05–1.06); промпты в `shots.ts` должны менять композицию каждый шот |
| Missing shot IDs | `gen-frames.ts` валидирует `shots.ts` против `shot-order.json` |
| VO drift | Перегенерить VO → calc-timings → удалить кэш assembly (`_v-*`, `seg-*`, body, final) |
| **Wrapped ≠ EP-final** | **Никогда не копировать `*-wrapped.mp4` вручную.** После rebuild `EP-final.mp4` → `wrap-with-bumpers.ts --force` (кэш `body-norm.mp4` иначе stale) |
| Upload wrong cut | `upload-youtube.ts` auto re-wrap + cadence gate; проверь первые 30s в Studio |
| Pumping audio | Two-pass LINEAR loudnorm, один раз в конце |
| Act card тишина | glitch-sting.m4a обязателен @≤50% |

---

*Спека static-режима DGF. Motion-оригинал: EP002 `gen-i2v-all.ts` + `assemble.ts` (архив).*
*Шаблоны: `pipeline/templates/episode/`. Правила: `.cursor/rules/static-mode.mdc`.*
