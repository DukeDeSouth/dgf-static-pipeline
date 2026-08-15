// DGF — pre-flight gates (cadence, wrap staleness)
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

export function fileMtime(path: string): number {
  return statSync(path).mtimeMs;
}

/** Scene-cut timestamps (seconds) via ffmpeg scene filter. */
export function probeSceneCuts(videoPath: string, maxCuts = 12): number[] {
  const raw = execSync(
    `ffmpeg -i "${videoPath}" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1`,
    { maxBuffer: 20 * 1024 * 1024 },
  ).toString();
  const times: number[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/pts_time:([\d.]+)/);
    if (m) times.push(parseFloat(m[1]));
    if (times.length >= maxCuts) break;
  }
  return times;
}

/** Expect ~5s cadence: cuts in first `windowSec` should be dense (≥ minCuts). */
export function verifyCadence(
  videoPath: string,
  opts?: { windowSec?: number; minCuts?: number; maxGapSec?: number },
): { ok: boolean; cuts: number[]; reason?: string } {
  const windowSec = opts?.windowSec ?? 30;
  const minCuts = opts?.minCuts ?? 4;
  const maxGapSec = opts?.maxGapSec ?? 8;

  const cuts = probeSceneCuts(videoPath, 20).filter(t => t <= windowSec);
  if (cuts.length < minCuts) {
    return {
      ok: false,
      cuts,
      reason: `Only ${cuts.length} cuts in first ${windowSec}s (need ≥${minCuts} for 5s cadence)`,
    };
  }

  for (let i = 1; i < cuts.length; i++) {
    const gap = cuts[i] - cuts[i - 1];
    if (gap > maxGapSec) {
      return {
        ok: false,
        cuts,
        reason: `Gap ${gap.toFixed(1)}s between cuts at ${cuts[i - 1].toFixed(1)}s–${cuts[i].toFixed(1)}s (max ${maxGapSec}s)`,
      };
    }
  }

  return { ok: true, cuts };
}

export function expectedVoShots(episodeDir: string): number | null {
  const orderPath = `${episodeDir}/vo/shot-order.json`;
  if (!existsSync(orderPath)) return null;
  const order = JSON.parse(readFileSync(orderPath, 'utf-8')) as { totalVoShots?: number; shots?: Record<string, string[]> };
  if (order.totalVoShots) return order.totalVoShots;
  if (order.shots) return Object.values(order.shots).flat().length;
  return null;
}

export interface WrapState {
  bodyPath: string;
  wrappedPath: string;
  bodyNormPath: string;
  stale: boolean;
  reasons: string[];
}

/** Wrapped is stale if missing, older than EP-final, or body-norm cache is older than EP-final. */
export function checkWrapStale(episodeDir: string): WrapState {
  const bodyPath = `${episodeDir}/EP-final.mp4`;
  const wrappedPath = `${episodeDir}/EP-final-wrapped.mp4`;
  const bodyNormPath = `${episodeDir}/out/wrap-tmp/body-norm.mp4`;
  const reasons: string[] = [];

  if (!existsSync(bodyPath)) {
    return { bodyPath, wrappedPath, bodyNormPath, stale: true, reasons: ['EP-final.mp4 missing'] };
  }

  const bodyMtime = fileMtime(bodyPath);

  if (!existsSync(wrappedPath)) reasons.push('EP-final-wrapped.mp4 missing');
  else if (fileMtime(wrappedPath) < bodyMtime) reasons.push('wrapped older than EP-final.mp4');

  if (existsSync(bodyNormPath) && fileMtime(bodyNormPath) < bodyMtime) {
    reasons.push('wrap cache body-norm.mp4 stale (EP-final rebuilt)');
  }

  return {
    bodyPath,
    wrappedPath,
    bodyNormPath,
    stale: reasons.length > 0,
    reasons,
  };
}
