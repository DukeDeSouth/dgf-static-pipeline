# Deep Glitch Files — EPISODE STRUCTURE

> Макроструктура «файла», act cards, re-hooks, retention, формат assemble. Опора: конвенция `Rabbithole/canon/EPISODE_STRUCTURE.md` + `USServerPvPMode/canon/EPISODE_STRUCTURE.md`. Длина: **6:30–8:45** (sweet spot Zenn; оба выброса 3:58 и 12:58 флопнули).

---

## 1. Макроструктура

```
INTRO (canon, ~5s)        — Keeper достаёт дело, file-stamp FILE 0NN, glitch-вспышка лого
  → HOOK (VO, 0-15s)      — Question Engine (H1-H5), self-projection, БЕЗ slop-опенера
  → SETUP (VO, 30-60s)    — «как ты это видишь / как все думают» (наивная картина)
  → 🎬 ACT CARD 1 (3.5s)  — doodle broll + glitch sting, БЕЗ VO
  → ACT 1 (VO, ~2 мин)    — заводим в обыденное, ставим ожидание
  → 🎬 ACT CARD 2 (3.5s)  — THE GLITCH bumper (момент сбоя)
  → ACT 2 (VO, ~2-3 мин)  — THE GLITCH: где обыденное даёт сбой; механизм/история/вера + ИСТОЧНИКИ
  → 🎬 ACT CARD 3 (3.5s)
  → ACT 3 (VO, ~1.5-2 мин)— payoff + «почему это про ТЕБЯ» (self-resonance); honest unknown если гипотеза
  → PAYOFF (на ~75-80%)   — главный поворот «файла»
  → OUTRO + CTA (VO, 15-25s)
DISCLAIMER (canon, ~4s)   — AI-disclosure (S-013)
ENDCARD (canon, ~15s)     — следующий файл + подписка
```

---

## 2. Ключевые принципы retention

- **Act Cards** — 3.5s переходы между актами: уникальный doodle broll + glitch sting (2s sound-branding). НЕ статичный фон. Решают мычание ElevenLabs + дают паузу + sound-бренд. **ACT CARD 2 = «glitch bumper»** (визуальный сигнал поворота).
- **Re-hooks** — каждый акт ЗАКАНЧИВАЕТСЯ микро-тизером следующего (open loop внутри эпизода).
- **Pattern interrupts** — визуальный/аудио reset каждые 45-90s; broll меняется каждые 7-8s; glitch-вспышка = сильнейший interrupt (дозировать 1-3/эпизод).
- **Payoff на 75-80%**, не в самом конце. CTA после payoff.
- **Self-resonance в ACT3** — обязателен мост «...и вот почему это про тебя» (рычаг H2/self-projection даже в исторических/космических темах).
- **Honest-unknown payoff** — для спекулятивных тем (S-018): payoff = «вот граница, где наука молкнет», поданная как ценность, не как недосказ.
- **YouTube Chapters** — обязательно в описании, 5-8 шт, первый на 00:00.

---

## 3. Glitch как структурный инструмент

| Где | Glitch-интенсивность |
|---|---|
| INTRO лого | короткая вспышка (бренд) |
| ACT CARD 2 (the glitch) | главный сбой эпизода — самый сильный |
| Момент reveal в ACT2 | локальный сбой на ключевом кадре |
| Остальное | НЕТ (яркая цельная 2D иллюстрация) |

Правило: **1-3 настоящих глитча на эпизод**. Переизбыток = теряется и удар, и cozy-тон (L2).

---

## 4. Assemble — segment types (под движок Rabbithole/Cutaway)

```typescript
// VO-сегмент (голос + doodle broll)
{ name: 'hook', voFile: 'vo-hook.mp3', shots: ['H1', 'H2'] }

// Act card (БЕЗ голоса — broll + glitch sting)
{ name: 'glitch1', voFile: null, shots: [], isTransition: true,
  transText: 'FILE 0NN', actCardBroll: 'act-card-2-glitch.mp4' }

// следующий VO-сегмент
{ name: 'act2', voFile: 'vo-act2.mp3', shots: ['G1','G2', ...] }
```

Assemble-пайплайн (канонический, как в репо): per-segment normalize shots → concat → extract SFX → mix VO + SFX@30% → act cards (3.5s trim+fade + glitch sting) → concat body → music @15% zone-based → loudnorm -14 LUFS / -1.5 TP / LRA 11 → wrap intro+body+disclaimer+endcard.

---

## 5. Pre-release checklist

- [ ] HOOK ≤15s, self-projection, без slop-опенера (S-001)
- [ ] RIGOR: каждый load-bearing claim сорснут + размечен; гипотеза названа гипотезой (S-005/S-018)
- [ ] ≥1 POV-момент на акт (S-019)
- [ ] OUTRO = open-loop тизер следующего файла, withhold (S-015)
- [ ] 1-3 glitch-момента, не больше
- [ ] AI-disclosure включён (S-013) + disclaimer-bumper
- [ ] Длина 6:30–8:45
- [ ] Chapters 5-8 в описании
- [ ] file-stamp / лого / текст = overlay, не AI
- [ ] Каст по канону (Mo present), стиль-преамбула во всех промптах

---

*Создан: 2026-06-02 · структура «файла»: hook→setup→[act card→act]×3→payoff(75%)→outro. Glitch = структурный pattern-interrupt (1-3/эп). Act card 2 = glitch bumper. Конвенция Rabbithole/US Server.*
*Связано: VISUAL_CANON.md, SCRIPT_ENGINE.md, HANDOFF.md*
