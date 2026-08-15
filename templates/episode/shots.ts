// DGF TEMPLATE — shot prompts (one per calc-timings grid cell, ~5s each)
// FILL after calc-timings.ts — count must match vo/shot-order.json
// Run: npx tsx gen-frames.ts --all

import { STYLE, GLITCH } from './style.js';

export interface ShotDef {
  id: string;
  prompt: string;
  glitch?: boolean;
  castRef?: string;
}

function shot(id: string, scene: string, opts?: { glitch?: boolean; mo?: boolean; keeper?: boolean }) {
  let prompt = `${STYLE} ${scene}`;
  if (opts?.glitch) prompt += GLITCH;
  const castRef = opts?.mo ? 'mo-reference-doodle.png' : opts?.keeper ? 'keeper-hands-doodle.png' : undefined;
  return { id, prompt, glitch: opts?.glitch, castRef };
}

/** VO shots — IDs from shot-order.json (H01, S01, A01, B01, D01, O01, …) */
export const SHOTS: ShotDef[] = [
  // HOOK — FILL: one prompt per H01, H02, …
  shot('H01', 'FILL ME — opening hook visual.', { mo: true }),
  shot('H02', 'FILL ME'),
  // … add all shots listed in vo/shot-order.json after calc-timings
];

/** Act cards (3.5s, not in VO grid) */
export const ACT_CARDS: ShotDef[] = [
  shot('T1', 'FILL ME — act card 1 focal image.'),
  shot('T2', 'FILL ME — THE GLITCH act card.', { glitch: true }),
  shot('T3', 'FILL ME — act card 3 transition.'),
];
