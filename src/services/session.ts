import type { QuizPlan } from '../models/attempt';

/**
 * Hand-off of the active quiz plan between pages. A plan holds generated
 * questions that can't be re-derived from the URL, so we keep it in memory
 * (and sessionStorage, so an accidental refresh mid-quiz doesn't lose it).
 */
const KEY = 'pp.activePlan';
let active: QuizPlan | null = null;

export function setActivePlan(plan: QuizPlan): void {
  active = plan;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(plan));
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
  } catch {
    /* ignore */
  }
}
