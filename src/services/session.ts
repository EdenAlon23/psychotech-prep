import type { QuizPlan, SectionResult } from '../models/attempt';

/**
 * Hand-off of the active quiz plan between pages. A plan holds generated
 * questions that can't be re-derived from the URL, so we keep it in memory
 * (and sessionStorage, so an accidental refresh mid-quiz doesn't lose it).
 */
const KEY = 'pp.activePlan';
const PROGRESS_KEY = 'pp.activeProgress';
let active: QuizPlan | null = null;

export function setActivePlan(plan: QuizPlan): void {
  active = plan;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(plan));
    // A new plan always starts from scratch – never inherit another quiz's answers.
    sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function getActivePlan(): QuizPlan | null {
  if (active) return active;
  try {
    const raw = sessionStorage.getItem(KEY);
    active = raw ? (JSON.parse(raw) as QuizPlan) : null;
  } catch {
    active = null;
  }
  return active;
}

export function clearActivePlan(): void {
  active = null;
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Everything QuizPage needs to continue exactly where the user was after a
 * refresh or an accidental tab reload. The block timer is stored as an
 * absolute deadline (epoch ms), so reloading never hands out extra time.
 */
export interface QuizProgress {
  version: 1;
  blockIdx: number;
  qIdx: number;
  phase: 'intro' | 'running';
  chosen: Record<string, number>;
  revealed: string[];
  flagged: string[];
  /** Absolute end of the current block's countdown, or null when untimed / not started. */
  deadline: number | null;
  blockResults: SectionResult[];
  timesMs: Record<string, number>;
  startedAt: number;
}

export function saveProgress(progress: QuizProgress): void {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* quota / private mode – resuming is a convenience, not a requirement */
  }
}

/** Returns saved progress only if it is well-formed and fits the given plan. */
export function loadProgress(plan: QuizPlan): QuizProgress | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<QuizProgress>;
    if (p.version !== 1 || typeof p.blockIdx !== 'number' || typeof p.qIdx !== 'number') return null;
    const block = plan.blocks[p.blockIdx];
    if (!block || p.qIdx < 0 || p.qIdx >= Math.max(1, block.questions.length)) return null;
    const ids = new Set(plan.blocks.flatMap((b) => b.questions.map((q) => q.id)));
    const chosen = Object.fromEntries(
      Object.entries(p.chosen ?? {}).filter(([id, c]) => ids.has(id) && Number.isInteger(c)),
    );
    return {
      version: 1,
      blockIdx: p.blockIdx,
      qIdx: p.qIdx,
      phase: p.phase === 'intro' ? 'intro' : 'running',
      chosen,
      revealed: (p.revealed ?? []).filter((id) => ids.has(id)),
      flagged: (p.flagged ?? []).filter((id) => ids.has(id)),
      deadline: typeof p.deadline === 'number' ? p.deadline : null,
      blockResults: Array.isArray(p.blockResults) ? p.blockResults.slice(0, p.blockIdx) : [],
      timesMs: p.timesMs ?? {},
      startedAt: typeof p.startedAt === 'number' ? p.startedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Whole seconds left until `deadline` (never negative). */
export function secondsLeft(deadline: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
