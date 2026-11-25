import type { Choice, Difficulty, Question, SectionId } from '../models/question';
import { createRng, shuffle, type Rng } from './random';

/**
 * Hand-written banks list the correct answer first (easy to author and review).
 * We shuffle at build time with a seed derived from the id, so the order is
 * random-looking but stable across sessions (review screens stay consistent).
 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function withShuffledChoices(
  base: Omit<Question, 'choices' | 'answerIndex'>,
  correct: Choice,
  distractors: Choice[],
  rng?: Rng,
): Question {
  const r = rng ?? createRng(hashString(base.id));
  const all = shuffle(r, [correct, ...distractors]);
  return { ...base, choices: all, answerIndex: all.indexOf(correct) };
}

/** Compact authoring format: [prompt, correct, d1, d2, d3, explanation, difficulty?] */
export type TextItem = [string, string, string, string, string, string, Difficulty?];

export function buildTextBank(
  section: SectionId,
  subtype: string,
  idPrefix: string,
  promptTemplate: (stem: string) => string,
  items: TextItem[],
): Question[] {
  return items.map(([stem, correct, d1, d2, d3, explanation, difficulty], i) =>
    withShuffledChoices(
      {
        id: `${idPrefix}-${i + 1}`,
        section,
        subtype,
        prompt: promptTemplate(stem),
        explanation,
        difficulty: difficulty ?? 2,
      },
      { text: correct },
      [{ text: d1 }, { text: d2 }, { text: d3 }],
    ),
  );
}

/** Build numeric options around the answer: unique, positive-ish and plausible. */
export function numericChoices(rng: Rng, answer: number, spread: number[]): { choices: Choice[]; answerIndex: number } {
  const set = new Set<number>([answer]);
  for (const d of shuffle(rng, spread)) {
    if (set.size >= 4) break;
    const v = Math.round((answer + d) * 100) / 100;
    if (answer >= 0 && v < 0) continue;
    if (v !== answer && !set.has(v)) set.add(v);
  }
  let k = 1;
  while (set.size < 4) {
    const v = answer + k * 3;
    set.add(v);
    k++;
  }
  const values = shuffle(rng, [...set]);
  return { choices: values.map((v) => ({ text: formatNumber(v) })), answerIndex: values.indexOf(answer) };
}

export const formatNumber = (n: number): string =>
  Number.isInteger(n) ? n.toLocaleString('he-IL') : n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
