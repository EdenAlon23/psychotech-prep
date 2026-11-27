import { EXAMS, type ExamDef, type ExamId } from '../data/exams';
import type { Attempt } from '../models/attempt';
import type { SectionId } from '../models/question';

/**
 * The learner profile drives everything exam-specific: which sections are shown, which simulation runs,
 * the daily plan and the score estimate. Stored locally (no account needed); a future backend can sync it.
 */
export interface Profile {
  examId: ExamId;
  /** ISO date, '' = unknown. */
  testDate: string;
  /** Desired score on the exam's own scale, null = not set. */
  target: number | null;
  minutesPerDay: number;
  /** Self-reported starting level; seeds the adaptive engine before there is data. */
  level: 1 | 2 | 3;
  employer?: string;
  provider?: string;
  role?: string;
  createdAt: number;
}

const KEY = 'pp.profile.v1';

export function getProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return EXAMS.some((e) => e.id === p.examId) ? p : null;
  } catch { return null; }
}

export function saveProfile(p: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event('pp:profile'));
}

export const examById = (id: ExamId): ExamDef => EXAMS.find((e) => e.id === id) ?? EXAMS[0];
export const currentExam = (): ExamDef => examById(getProfile()?.examId ?? 'psychotech');
export const examSections = (exam: ExamDef): SectionId[] => [...new Set(exam.sections.map((s) => s.section))];

// ---------- adaptive ability (Elo) ----------

/**
 * Elo-style ability per section, on the same 1–3 scale as question difficulty.
 * Each answer nudges ability toward "harder" when correct and "easier" when wrong, weighted by how surprising
 * the result was. K shrinks as evidence accumulates so early answers move the estimate more than late ones.
 * Why Elo: O(1) per answer, stable, no training data needed, and it naturally handles mixed difficulties.
 */
export function sectionAbility(attempts: Attempt[], section: SectionId, seed: number): { ability: number; n: number } {
  let ability = seed;
  let n = 0;
  const answers = attempts.slice().reverse().flatMap((a) => a.answers).filter((x) => x.section === section && x.chosenIndex >= 0);
  for (const x of answers) {
    const expected = 1 / (1 + Math.exp(-(ability - x.difficulty) * 1.6));
    const k = Math.max(0.08, 0.5 / Math.sqrt(1 + n));
    ability += k * ((x.correct ? 1 : 0) - expected);
    ability = Math.min(3.4, Math.max(0.6, ability));
    n++;
  }
  return { ability, n };
}

/** Probability of a correct answer on a question of the given difficulty (same curve as the update rule). */
export const pCorrect = (ability: number, difficulty: number) => 1 / (1 + Math.exp(-(ability - difficulty) * 1.6));

/**
 * Picks the target difficulty for the next questions: the level where the learner succeeds ~70% of the time —
 * hard enough to learn, easy enough to stay motivated ("desirable difficulty").
 */
export function targetDifficulty(ability: number): 1 | 2 | 3 {
  let best: 1 | 2 | 3 = 1;
  let bestGap = Infinity;
  for (const d of [1, 2, 3] as const) {
    const gap = Math.abs(pCorrect(ability, d) - 0.7);
    if (gap < bestGap) { best = d; bestGap = gap; }
  }
  return best;
}

// ---------- score estimate ----------

/**
 * Rough score estimate on the exam's own scale: weighted mean of per-section expected accuracy at
 * medium difficulty, mapped linearly onto [min,max]. Always shown with the word "הערכה" — it is guidance only.
 */
export function estimateScore(exam: ExamDef, attempts: Attempt[], level: number): { value: number; confidence: 'low' | 'mid' | 'high' } | null {
  let wsum = 0;
  let acc = 0;
  let evidence = 0;
  for (const s of exam.sections) {
    const { ability, n } = sectionAbility(attempts, s.section, level);
    evidence += n;
    acc += s.weight * pCorrect(ability, 2);
    wsum += s.weight;
  }
  if (evidence < 10 || !wsum) return null;
  const frac = Math.min(1, Math.max(0, (acc / wsum - 0.2) / 0.75));
  const raw = exam.score.min + frac * (exam.score.max - exam.score.min);
  const value = Math.round(raw / exam.score.step) * exam.score.step;
  return { value, confidence: evidence < 60 ? 'low' : evidence < 200 ? 'mid' : 'high' };
}

// ---------- study plan ----------

export interface PlanItem { section: SectionId; count: number; minutes: number; reason: string }

/**
 * Today's plan: minutes/day split across the exam's sections by weight × weakness (low ability = more time).
 * Weekly a full simulation replaces the drills; in the last 2 days before the test only light review.
 */
export function todaysPlan(exam: ExamDef, attempts: Attempt[], profile: Profile, today = new Date()): { items: PlanItem[]; simulationDay: boolean; taper: boolean; daysLeft: number | null } {
  const daysLeft = profile.testDate ? Math.ceil((Date.parse(`${profile.testDate}T08:00:00`) - today.getTime()) / 86_400_000) : null;
  const taper = daysLeft !== null && daysLeft <= 2 && daysLeft >= 0;
  const simulationDay = !taper && today.getDay() === 5; // Fridays: full simulation
  const minutes = taper ? Math.min(20, profile.minutesPerDay) : profile.minutesPerDay;
  const scored = exam.sections.map((s) => {
    const { ability } = sectionAbility(attempts, s.section, profile.level);
    return { s, need: s.weight * (3.4 - ability) };
  });
  const total = scored.reduce((a, b) => a + b.need, 0) || 1;
  const items = scored
    .map(({ s, need }) => {
      const m = Math.max(3, Math.round((minutes * need) / total));
      return { section: s.section, minutes: m, count: Math.max(4, Math.round(m * 1.1)), reason: need / s.weight > 1.6 ? 'נקודת חולשה' : 'שימור' };
    })
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, taper ? 2 : 4);
  return { items, simulationDay, taper, daysLeft };
}
