import type { Question } from '../models/question';
import { pick, randInt, type Rng } from '../utils/random';

/**
 * GMAT-style Data Sufficiency. The five answer choices are fixed; each template knows which statements
 * suffice, so the key is computed, not written by hand.
 */
const CHOICES = [
  'Statement (1) ALONE is sufficient, but statement (2) alone is not.',
  'Statement (2) ALONE is sufficient, but statement (1) alone is not.',
  'BOTH statements TOGETHER are sufficient, but NEITHER alone is.',
  'EACH statement ALONE is sufficient.',
  'Statements (1) and (2) TOGETHER are NOT sufficient.',
];
type Key = 0 | 1 | 2 | 3 | 4;
interface Spec { subtype: string; q: string; s1: string; s2: string; key: Key; why: string; difficulty: 1 | 2 | 3 }

const templates: ((rng: Rng) => Spec)[] = [
  (rng) => { const a = randInt(rng, 2, 9), s = randInt(rng, 10, 30);
    return { subtype: 'Algebra', difficulty: 1, key: 0, q: 'What is the value of x?', s1: `${a}x + 4 = ${a * s + 4}`, s2: `x² = ${s * s}`,
      why: `(1) gives one value x = ${s}. (2) allows x = ${s} or x = −${s}, so it is not sufficient.` }; },
  (rng) => { const x = randInt(rng, 3, 12), y = randInt(rng, 2, 9);
    return { subtype: 'Systems', difficulty: 2, key: 2, q: 'What is the value of x?', s1: `x + y = ${x + y}`, s2: `x − y = ${x - y}`,
      why: 'Each statement has two unknowns. Together they form two independent equations, which give a unique x.' }; },
  (rng) => { const n = pick(rng, [12, 18, 20, 30]);
    return { subtype: 'Number properties', difficulty: 2, key: 1, q: 'Is the positive integer n even?', s1: `n is a multiple of 3`, s2: `n is a multiple of ${pick(rng, [4, 6, 10])}`,
      why: `Multiples of 3 can be odd (9) or even (${n}). Every multiple of an even number is even, so (2) alone answers "yes".` }; },
  (rng) => { const p = pick(rng, [20, 25, 40]);
    return { subtype: 'Percents', difficulty: 2, key: 4, q: 'How many employees does company X have?', s1: `${p}% of the employees work remotely.`, s2: 'The number of remote employees grew by 10 this year.',
      why: 'Neither statement nor both together give an actual count — only a percentage and a change.' }; },
  (rng) => { const r = randInt(rng, 2, 8);
    return { subtype: 'Geometry', difficulty: 1, key: 3, q: 'What is the area of circle C?', s1: `The radius of C is ${r}.`, s2: `The circumference of C is ${2 * r}π.`,
      why: 'Each statement fixes the radius, and the radius fixes the area.' }; },
  (rng) => { const avg = randInt(rng, 60, 90);
    return { subtype: 'Statistics', difficulty: 3, key: 1, q: 'What is the sum of the five numbers in set S?', s1: `The median of S is ${avg}.`, s2: `The mean of S is ${avg}.`,
      why: `The mean fixes the sum (5 × ${avg} = ${5 * avg}). The median says nothing about the sum.` }; },
];

export function generateDataSufficiency(rng: Rng, id: string): Question {
  const spec = pick(rng, templates)(rng);
  return {
    id, section: 'dataSufficiency', subtype: spec.subtype, difficulty: spec.difficulty, dir: 'ltr',
    prompt: `${spec.q}\n(1) ${spec.s1}\n(2) ${spec.s2}`,
    choices: CHOICES.map((text) => ({ text })), answerIndex: spec.key,
    explanation: spec.why,
  };
}
