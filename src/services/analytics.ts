import type { AnswerRecord, Attempt } from '../models/attempt';
import type { SectionId } from '../models/question';
import { SECTION_BY_ID, SECTIONS } from '../data/sections';
import { sectionText, tr } from '../i18n';
import { currentExam, examSections } from './profile';

export interface Stat {
  total: number;
  correct: number;
  accuracy: number; // 0..1
  avgTimeSec: number;
}

export interface SubtypeStat extends Stat {
  section: SectionId;
  subtype: string;
  /** Bayesian-smoothed error rate, recency weighted. Higher = weaker. */
  weakness: number;
}

const emptyStat = (): Stat => ({ total: 0, correct: 0, accuracy: 0, avgTimeSec: 0 });

function summarise(answers: AnswerRecord[]): Stat {
  if (answers.length === 0) return emptyStat();
  const correct = answers.filter((a) => a.correct).length;
  const time = answers.reduce((s, a) => s + a.timeMs, 0);
  return { total: answers.length, correct, accuracy: correct / answers.length, avgTimeSec: time / answers.length / 1000 };
}

/** All answers, newest first. */
export const allAnswers = (attempts: Attempt[]): AnswerRecord[] =>
  [...attempts].sort((a, b) => b.finishedAt - a.finishedAt).flatMap((a) => a.answers);

export function sectionStats(attempts: Attempt[]): Record<SectionId, Stat> {
  const answers = allAnswers(attempts);
  return Object.fromEntries(SECTIONS.map((s) => [s.id, summarise(answers.filter((a) => a.section === s.id))])) as Record<SectionId, Stat>;
}

/**
 * Weakness = (weighted wrong + 1) / (weighted total + 2) — Laplace smoothing
 * prevents a single wrong answer from flagging a topic as "0% accuracy",
 * and exponential decay (half-life of 30 answers) makes recent performance
 * count more, so improvement actually shows up.
 */
export function subtypeStats(attempts: Attempt[]): SubtypeStat[] {
  const groups = new Map<string, AnswerRecord[]>();
  for (const a of allAnswers(attempts)) {
    const k = `${a.section}|${a.subtype}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  const HALF_LIFE = 30;
  return [...groups.entries()].map(([k, list]) => {
    const [section, subtype] = k.split('|') as [SectionId, string];
    let wTotal = 0;
    let wWrong = 0;
    list.forEach((a, i) => {
      const w = Math.pow(0.5, i / HALF_LIFE);
      wTotal += w;
      if (!a.correct) wWrong += w;
    });
    const s = summarise(list);
    // Slow answers are a weakness too (even if correct): add a pace penalty.
    const target = SECTION_BY_ID[section].targetSecPerQuestion;
    const pacePenalty = s.avgTimeSec > target ? Math.min(0.15, ((s.avgTimeSec - target) / target) * 0.15) : 0;
    return { section, subtype, ...s, weakness: (wWrong + 1) / (wTotal + 2) + pacePenalty };
  });
}

export const weakestSubtypes = (attempts: Attempt[], n = 5, minAnswers = 3): SubtypeStat[] =>
  subtypeStats(attempts)
    .filter((s) => s.total >= minAnswers)
    .sort((a, b) => b.weakness - a.weakness)
    .slice(0, n);

export interface HistoryPoint {
  at: number;
  score: number;
  title: string;
  id: string;
}

export const simulationHistory = (attempts: Attempt[]): HistoryPoint[] =>
  attempts
    .filter((a) => a.mode === 'simulation')
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .map((a) => ({ at: a.finishedAt, id: a.id, title: a.title, score: attemptScore(a) }));

export const attemptScore = (a: Attempt): number => {
  const total = a.answers.length;
  return total === 0 ? 0 : Math.round((a.answers.filter((x) => x.correct).length / total) * 100);
};

/**
 * Rough 1–9 estimate (stanine-like). Real institutes norm against a population
 * we don't have, so this is explicitly labelled an estimate in the UI.
 */
export function estimatedLevel(accuracy: number): number {
  const cuts = [0.2, 0.32, 0.44, 0.55, 0.65, 0.74, 0.82, 0.9];
  return 1 + cuts.filter((c) => accuracy >= c).length;
}

export function practiceDays(attempts: Attempt[]): number {
  return new Set(attempts.map((a) => new Date(a.finishedAt).toDateString())).size;
}

export interface Recommendation {
  text: string;
  section?: SectionId;
  subtype?: string;
}

export function recommendations(attempts: Attempt[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const stats = sectionStats(attempts);
  const allowed = new Set(examSections(currentExam()));
  const examSecs = SECTIONS.filter((s) => allowed.has(s.id));
  const title = (id: SectionId) => sectionText(SECTION_BY_ID[id]).title;
  const untouched = examSecs.filter((s) => stats[s.id].total === 0);
  if (attempts.length === 0) {
    return [{ text: tr('התחל בסימולציה כדי לקבל תמונת מצב ראשונית – המערכת תתאים את התרגול לפי התוצאות.', 'Start with a practice test to get a baseline – practice then adapts to your results.') }];
  }
  for (const w of weakestSubtypes(attempts, 3)) {
    recs.push({
      text: tr(
        `חיזוק: ${title(w.section)} – ${w.subtype} (דיוק ${Math.round(w.accuracy * 100)}% ב-${w.total} שאלות).`,
        `Strengthen: ${title(w.section)} – ${w.subtype} (${Math.round(w.accuracy * 100)}% accuracy on ${w.total} questions).`,
      ),
      section: w.section, subtype: w.subtype,
    });
  }
  for (const s of examSecs) {
    const st = stats[s.id];
    if (st.total >= 5 && st.avgTimeSec > s.targetSecPerQuestion * 1.3)
      recs.push({ text: tr(
        `קצב: ב${title(s.id)} ממוצע ${Math.round(st.avgTimeSec)} שנ' לשאלה (יעד ~${s.targetSecPerQuestion}). תרגלו עם טיימר.`,
        `Pace: ${title(s.id)} averages ${Math.round(st.avgTimeSec)}s per question (target ~${s.targetSecPerQuestion}s). Practice with the timer on.`,
      ), section: s.id });
  }
  if (untouched.length > 0)
    recs.push({ text: tr(`עוד לא תרגלת: ${untouched.map((s) => title(s.id)).join(', ')}.`, `Not practiced yet: ${untouched.map((s) => title(s.id)).join(', ')}.`), section: untouched[0].id });
  if (simulationHistory(attempts).length === 0) recs.push({ text: tr('עשה לפחות סימולציה מלאה אחת עם זמן לפני המבחן.', 'Take at least one full timed practice test before exam day.') });
  return recs.slice(0, 6);
}
