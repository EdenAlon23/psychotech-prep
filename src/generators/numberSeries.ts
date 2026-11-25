import type { Difficulty, Question } from '../models/question';
import { numericChoices } from '../utils/questionBuilder';
import { pick, randInt, type Rng } from '../utils/random';

interface SeriesSpec {
  subtype: string;
  terms: number[];
  explanation: string;
  difficulty: Difficulty;
}

type SeriesFactory = (rng: Rng) => SeriesSpec;

const LEN = 6; // 5 shown + 1 to find

const factories: SeriesFactory[] = [
  // Constant difference
  (rng) => {
    const start = randInt(rng, 2, 60);
    const d = pick(rng, [3, 4, 6, 7, 8, 9, 11, 12, 13, -4, -6, -7]);
    const startAdj = d < 0 ? start + 80 : start;
    const terms = Array.from({ length: LEN }, (_, i) => startAdj + i * d);
    return { subtype: 'הפרש קבוע', terms, difficulty: 1, explanation: `בכל צעד ${d > 0 ? 'מוסיפים' : 'מחסירים'} ${Math.abs(d)}.` };
  },
  // Geometric
  (rng) => {
    const r = pick(rng, [2, 3]);
    const start = r === 2 ? randInt(rng, 1, 7) : randInt(rng, 1, 3);
    const terms = Array.from({ length: LEN }, (_, i) => start * r ** i);
    return { subtype: 'כפל קבוע', terms, difficulty: 1, explanation: `כל איבר שווה לקודמו כפול ${r}.` };
  },
  // Growing difference (2nd order)
  (rng) => {
    const start = randInt(rng, 1, 20);
    const d0 = randInt(rng, 1, 5);
    const step = pick(rng, [1, 2, 3]);
    const terms = [start];
    for (let i = 1; i < LEN; i++) terms.push(terms[i - 1] + d0 + (i - 1) * step);
    return {
      subtype: 'הפרש משתנה',
      terms,
      difficulty: 2,
      explanation: `ההפרשים בין האיברים גדלים ב-${step} בכל צעד: ${terms.slice(1).map((t, i) => t - terms[i]).join(', ')}.`,
    };
  },
  // Two interleaved series
  (rng) => {
    const a = randInt(rng, 1, 15);
    const b = randInt(rng, 20, 50);
    const da = pick(rng, [2, 3, 4, 5]);
    const db = pick(rng, [-2, -3, -4, 5, 6]);
    const terms = Array.from({ length: LEN }, (_, i) => (i % 2 === 0 ? a + (i / 2) * da : b + ((i - 1) / 2) * db));
    return {
      subtype: 'סדרות משולבות',
      terms,
      difficulty: 2,
      explanation: `שתי סדרות שזורות: במקומות האי-זוגיים ${da > 0 ? '+' : ''}${da} בכל פעם, ובמקומות הזוגיים ${db > 0 ? '+' : ''}${db} בכל פעם.`,
    };
  },
  // Alternating operations (+a, -b)
  (rng) => {
    const start = randInt(rng, 10, 40);
    const up = pick(rng, [5, 7, 8, 9, 10]);
    const down = pick(rng, [2, 3, 4]);
    const terms = [start];
    for (let i = 1; i < LEN; i++) terms.push(terms[i - 1] + (i % 2 === 1 ? up : -down));
    return { subtype: 'פעולות מתחלפות', terms, difficulty: 2, explanation: `מתחלפים: ‎+${up}, ואז ‎−${down}, וחוזר חלילה.` };
  },
  // Multiply then add
  (rng) => {
    const m = pick(rng, [2, 3]);
    const add = pick(rng, [-1, 1, 2]);
    const start = randInt(rng, 1, 4);
    const terms = [start];
    for (let i = 1; i < LEN; i++) terms.push(terms[i - 1] * m + add);
    return {
      subtype: 'פעולה מורכבת',
      terms,
      difficulty: 3,
      explanation: `כל איבר = האיבר הקודם × ${m} ${add >= 0 ? '+' : '−'} ${Math.abs(add)}.`,
    };
  },
  // Fibonacci-like
  (rng) => {
    const a = randInt(rng, 1, 6);
    const b = randInt(rng, 2, 8);
    const terms = [a, b];
    for (let i = 2; i < LEN; i++) terms.push(terms[i - 1] + terms[i - 2]);
    return { subtype: 'סכום קודמים', terms, difficulty: 3, explanation: 'כל איבר שווה לסכום שני האיברים שלפניו.' };
  },
  // Squares / cubes with offset
  (rng) => {
    const offset = pick(rng, [0, 1, -1, 2]);
    const n0 = randInt(rng, 1, 5);
    const terms = Array.from({ length: LEN }, (_, i) => (n0 + i) ** 2 + offset);
    const off = offset === 0 ? '' : ` ${offset > 0 ? '+' : '−'} ${Math.abs(offset)}`;
    return {
      subtype: 'ריבועים',
      terms,
      difficulty: 3,
      explanation: `האיברים הם ריבועים של מספרים עוקבים${off}: ${n0}²${off}, ${n0 + 1}²${off}, …`,
    };
  },
  // Multiplier increases (×1, ×2, ×3 …)
  (rng) => {
    const start = randInt(rng, 1, 3);
    const terms = [start];
    for (let i = 1; i < LEN; i++) terms.push(terms[i - 1] * i);
    return { subtype: 'פעולה מורכבת', terms, difficulty: 3, explanation: 'המכפיל גדל בכל צעד: ×1, ×2, ×3, ×4, ×5.' };
  },
];

/**
 * Two task formats appear in real batteries: "what comes next" and
 * "what is missing in the middle". We randomise between them.
 */
export function generateNumberSeries(rng: Rng, id: string): Question {
  const spec = pick(rng, factories)(rng);
  const missingMiddle = rng() < 0.3;
  const hideIdx = missingMiddle ? randInt(rng, 1, LEN - 2) : LEN - 1;
  const answer = spec.terms[hideIdx];
  const shown = spec.terms.map((t, i) => (i === hideIdx ? '?' : String(t)));
  const typicalStep = Math.max(1, Math.abs(spec.terms[2] - spec.terms[1]));
  const { choices, answerIndex } = numericChoices(rng, answer, [
    1, -1, 2, -2, typicalStep, -typicalStep, Math.round(typicalStep / 2) || 3,
  ]);
  return {
    id,
    section: 'numberSeries',
    subtype: spec.subtype,
    prompt: missingMiddle ? 'איזה מספר חסר בסדרה?' : 'איזה מספר ממשיך את הסדרה?',
    codeBlock: shown.join('   ,   '),
    choices,
    answerIndex,
    explanation: `${spec.explanation} לכן התשובה היא ${answer}.`,
    difficulty: spec.difficulty,
  };
}
