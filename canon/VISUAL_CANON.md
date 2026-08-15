# Deep Glitch Files — VISUAL CANON

> Стиль-библия канала. Читать ПЕРЕД любым gen. Каст и объекты — ТОЛЬКО по этому файлу, не изобретать на ходу.
> **Принцип (LOCKED 2026-08-14)**: **2D doodle explainer** как визуальная система (формат, к которому привыкла аудитория YouTube) + **glitch** как сигнатурный приём в момент аномалии + **FILE**-фрейминг. Реестр каста = canon-first moat.

> ⚠️ **PIVOT 2026-08-14**: claymation → 2D doodle. Старые clay-ассеты (`canon/cast/*`, `canon/brand/*`, bumpers) = **LEGACY** (EP001-02 архив). Новые эпизоды — только по этому канону. Реген: `npx tsx canon/gen-cast.ts`.

---

## 1. Визуальная ДНК

**Базовый look**: чистый **2D digital doodle explainer** — толстые чёрные контуры, плоские насыщенные цвета, простой фон (один цвет или лёгкий градиент), персонаж-наблюдатель с круглой головой и большими глазами. Формат, который зритель уже узнаёт с explainer-каналов (Tp Dossier / Kurzgesagt-lite / modern edu-cartoon).

**НЕ используем**: claymation, stop-motion, 3D, photorealism, Pixar-cute, anime.

**Glitch-слой (сигнатура канала)**: в момент «глитча» (ACT2 reveal) чистая 2D-иллюстрация на доли секунды **сбоит** — scanline jitter, channel-split teal/magenta, datamosh-smear, дублирование контура, кратковременное «разрывание» кадра. **Дозированно** — 1-3 раза за эпизод на ключевых поворотах. В остальное время мир яркий и цельный.

> Двойная функция glitch: (1) бренд «files on glitches»; (2) дифференциатор от generic doodle — наш сбой узнаваем.

**Files-фрейминг**: эпизод = «дело из архива» — file-stamp (`FILE 0NN`), redaction-плашки. В видео — FFmpeg overlay. На **тамбнейлах** — маленький stamp в углу (опционально).

**Тон визуала**: bright-curious по умолчанию → короткий uncanny-холодок в glitch-моменте. Soft, БЕЗ графичной жести (R5).

---

## 2. Палитра (LOCKED)

| Роль | HEX | Где |
|---|---|---|
| Outline (контуры) | `#1A1A1A` | все линии персонажей и объектов |
| Doodle white (голова Mo) | `#FAFAFA` | круглая голова, светлые зоны |
| Skin warm (руки/тело) | `#F5D6C6` | тон кожи doodle-персонажа |
| Sky blue (фон) | `#4A9FE8` | небо, простые фоны |
| Grass / nature | `#5CB85C` | природа, позитивные сцены |
| Cream panel | `#F5F0E6` | инфо-плашки, нейтральный фон |
| Thumb yellow (CAPS) | `#FFD700` | **только тамбнейлы** — жирный вопрос |
| File red (таб папки) | `#E63946` | file-folder, акценты «дела» |
| Glitch teal | `#2BB6A8` | glitch-артефакты, scan-lines |
| Glitch magenta | `#D6347B` | channel-split в глитче |

Правило: яркие плоские цвета доминируют; glitch-холод только в момент сбоя.

---

## 3. Style preamble (вставлять в КАЖДЫЙ AI-промпт gen-frames)

```
Deep Glitch Files style: clean 2D digital doodle explainer illustration, thick black outlines,
flat saturated colors, simple expressive stick-figure human with large round eyes and white circular
head, bright friendly educational YouTube cartoon aesthetic, simple single-color or gradient
background, bold readable composition. No photorealism, no 3D, no clay, no stop-motion, no anime.
No on-screen text, no logos, no lettering (added later via overlay). 16:9.
```

**Glitch-шоты ONLY** — добавить к preamble:
```
A brief digital glitch tearing through the illustration — scanline jitter, channel split in teal
(#2BB6A8) and magenta (#D6347B), datamosh smear, duplicated outlines, momentary corruption of
the flat colors.
```

**Анти-паттерны промпта**: claymation, polymer clay, fingerprints, 3D render, photorealistic humans, anime eyes, Pixar style, читаемый текст в in-video кадре (кроме gen-thumb), glitch на каждом кадре.

---

## 4. КАСТ (LOCKED archetypes — reusable across все 5 вен)

Принцип: малый переиспользуемый ансамбль в одном doodle-стиле. Canon-first: один ref → gpt2edit во всех шотах.

| ID | Имя | Роль | Канон-описание | Ref |
|---|---|---|---|---|
| **CAST-MO** | **Mo** | Зритель-суррогат («ты») | Круглая белая голова, **большие круглые глаза**, простой рот (линия или «o»), тонкое тело stick-figure, короткие волосы (коричневые штрихи). Эмоция через позу и глаза. Появляется в КАЖДОМ файле. НЕ clay, НЕ uncanny-пустое лицо. | `canon/cast/mo-reference-doodle.png` ⏳ regen |
| **CAST-ARCHIVE** | The Keeper | Хранитель файлов | Пара простых doodle-рук (толстый контур) открывающих manila-папку с красным табом. Faceless — только руки + папка. Тёмный или нейтральный фон. | `canon/cast/keeper-hands-doodle.png` ⏳ regen |
| **CAST-CHORUS** | The Others | Ансамбль/толпа | 5-7 doodle-фигур с точками-глазами, переодеваются атрибутами (одежда, факел, город). Тот же контурный стиль. | `chorus-*-doodle.png` ⏳ regen |
| **CAST-MICE** | The Twenty-Five | Мотив-существа | Doodle-мыши в мини-загоне, тесно, часть апатичные. Тот же стиль. | `mice-universe25-doodle.png` ⏳ regen |

**LEGACY clay refs** (`mo-reference-uncanny.png`, `keeper-hands.png`, etc.) — только для EP001-02 архива. Не использовать в новых промптах.

---

## 5. Thumbnail-система (LOCKED — отличается от in-video)

In-video кадры = **без текста**. Тамбнейлы = **другой контракт** (проверенный формат explainer-ниши):

| Элемент | Правило |
|---|---|
| Текст | **Жирный жёлтый CAPS** (`#FFD700`) с **чёрным outline** — короткий вопрос-хук (3-6 слов). AI рисует текст НА тамбнейле (gen-thumb.ts). |
| Композиция | Mo (doodle) сбоку **реагирует** на центральный объект/сцену. Один фокус. |
| Фон | Яркий или контрастный — читается на 150px ширины |
| FILE stamp | Маленький «FILE 0NN» в углу (опционально) |
| Title vs thumb | Title в YouTube **расширяет** вопрос; не дублировать дословно |

Референс формата: Tp Dossier (жёлтый CAPS + doodle-реактор). Наш дифференциатор: glitch-акцент на объекте + FILE stamp + big-questions домен.

---

## 6. Реестр персистентных объектов

| ID | Объект | Статус |
|---|---|---|
| BRAND-LOGO | Лого (папка + glitch-разрыв) | ⏳ REGEN doodle — `canon/brand/logo.png` LEGACY clay |
| BRAND-BANNER | YouTube banner | ⏳ REGEN doodle |
| BRAND-AVATAR | Avatar 800×800 | ⏳ REGEN doodle (Mo + glitch-scan) |
| FILE-FOLDER | Manila-папка doodle | ⏳ `canon/props/file-folder-doodle.png` |
| FILE-STAMP | FFmpeg overlay `FILE 0NN` | ✅ валидирован — overlay, не AI |
| THUMB-STYLE | Yellow CAPS + Mo reaction + glitch accent | ✅ LOCKED 2026-08-14 |
| GLITCH-OVERLAY | Alpha glitch (assemble) | ⏳ TODO FFmpeg |
| INTRO / DISCLAIMER / ENDCARD | Bumpers | ⏳ REGEN под doodle (clay bumpers = LEGACY) |

---

## 7. Шот-типы (static pipeline)

- **Static frame (t2i / gpt2edit)**: основной тип — doodle-иллюстрация по VO.
- **Ken Burns (FFmpeg)**: pan/zoom на статике.
- **Glitch-shot**: обычный кадр + glitch preamble на ACT2 reveal; опционально glitch-overlay в assemble.
- **Receipt-shot**: gpt2edit с raw-скрином источника (если есть).

---

## 8. Текст / лого / file-stamp

| Контекст | Правило |
|---|---|
| In-video frames | AI **не рисует** текст → FFmpeg overlay |
| Thumbnails | AI **рисует** жёлтый CAPS-хук (gen-thumb.ts) |
| Лого / FILE stamp в видео | Всегда FFmpeg overlay |

---

*Создан: 2026-06-02 (claymation) · **PIVOT: 2026-08-14 → 2D doodle explainer** + glitch + FILE-фрейминг. Каст: Mo + Keeper + Chorus. Реген: `canon/gen-cast.ts`.*
*Связано: HANDOFF.md, EPISODE_STRUCTURE.md, pipeline/STATIC_PIPELINE_REFERENCE.md*
