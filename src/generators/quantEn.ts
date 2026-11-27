import type { Difficulty, Question } from '../models/question';
import { pick, randInt, type Rng } from '../utils/random';
import { shuffle } from '../utils/random';

/**
 * English quantitative problems (SAT Math, GMAT Quant, psychometric-style algebra).
 * Every template computes its own answer, so the key is always correct; distractors model typical mistakes.
 */
interface Spec { subtype: string; prompt: string; answer: number; explanation: string; difficulty: Difficulty; wrong: number[] }

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));

const templates: ((rng: Rng) => Spec)[] = [
  // Linear equation
  (rng) => {
    const a = randInt(rng, 2, 9), x = randInt(rng, -6, 12), b = randInt(rng, -20, 20);
    const c = a * x + b;
    return { subtype: 'Linear equations', difficulty: 1, answer: x,
      prompt: `If ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${c}, what is the value of x?`,
      explanation: `Subtract ${b} from both sides: ${a}x = ${c - b}. Divide by ${a}: x = ${x}.`,
      wrong: [(c + b) / a, x + 1, -x, (c - b)] };
  },
  // Percent change
  (rng) => {
    const base = pick(rng, [40, 50, 80, 120, 200, 250]), p = pick(rng, [10, 20, 25, 40]);
    const up = rng() < 0.5;
    const answer = base * (1 + (up ? p : -p) / 100);
    return { subtype: 'Percent', difficulty: 1, answer,
      prompt: `A jacket costs $${base}. Its price is ${up ? 'increased' : 'decreased'} by ${p}%. What is the new price, in dollars?`,
      explanation: `${p}% of ${base} is ${(base * p) / 100}; ${up ? 'add' : 'subtract'} it: ${fmt(answer)}.`,
      wrong: [base * (up ? 1 - p / 100 : 1 + p / 100), (base * p) / 100, base + (up ? p : -p)] };
  },
  // Successive percent (GMAT trap)
  (rng) => {
    const p = pick(rng, [10, 20, 25, 50]);
    const answer = Math.round(((1 + p / 100) * (1 - p / 100) - 1) * 10000) / 100;
    return { subtype: 'Percent', difficulty: 3, answer,
      prompt: `A stock rises ${p}% on Monday and falls ${p}% on Tuesday. By what percent has its value changed overall? (negative = decrease)`,
      explanation: `Multiply the factors: ${1 + p / 100} × ${1 - p / 100} = ${(1 + p / 100) * (1 - p / 100)}, i.e. a change of ${answer}%. The changes do not cancel out.`,
      wrong: [0, -p, p / 10, -2 * p] };
  },
  // Ratio
  (rng) => {
    const a = randInt(rng, 2, 5), b = randInt(rng, a + 1, 9), k = randInt(rng, 3, 12);
    const total = (a + b) * k;
    return { subtype: 'Ratios', difficulty: 2, answer: b * k,
      prompt: `The ratio of cats to dogs in a shelter is ${a}:${b}. If there are ${total} cats and dogs in all, how many dogs are there?`,
      explanation: `${a} + ${b} = ${a + b} parts; each part is ${total} ÷ ${a + b} = ${k}. Dogs: ${b} × ${k} = ${b * k}.`,
      wrong: [a * k, total / 2, b * (k + 1), total - b] };
  },
  // Average
  (rng) => {
    const n = randInt(rng, 4, 6), avg = randInt(rng, 60, 90), newAvg = avg + randInt(rng, 1, 4);
    const answer = newAvg * (n + 1) - avg * n;
    return { subtype: 'Averages', difficulty: 2, answer,
      prompt: `The average of ${n} test scores is ${avg}. What score on the next test would raise the average to ${newAvg}?`,
      explanation: `Current total: ${n} × ${avg} = ${n * avg}. Needed total: ${n + 1} × ${newAvg} = ${newAvg * (n + 1)}. Next score: ${answer}.`,
      wrong: [newAvg, newAvg + (newAvg - avg), answer - n, answer + 5] };
  },
  // Rate / work
  (rng) => {
    const [a, b] = pick(rng, [[3, 6], [4, 12], [6, 12], [10, 15], [12, 24]] as const);
    const answer = (a * b) / (a + b);
    return { subtype: 'Rates & work', difficulty: 3, answer,
      prompt: `Pipe A fills a tank in ${a} hours and pipe B fills it in ${b} hours. Working together, how many hours do they need?`,
      explanation: `Rates add: 1/${a} + 1/${b} = ${a + b}/${a * b} of the tank per hour, so the time is ${a * b}/${a + b} = ${fmt(answer)} hours.`,
      wrong: [(a + b) / 2, a + b, Math.abs(b - a), Math.min(a, b)] };
  },
  // Distance / speed
  (rng) => {
    const v1 = pick(rng, [30, 40, 60]), v2 = pick(rng, [60, 80, 120].filter((v) => v !== v1));
    const answer = Math.round(((2 * v1 * v2) / (v1 + v2)) * 100) / 100;
    return { subtype: 'Rates & work', difficulty: 3, answer,
      prompt: `A car drives to a town at ${v1} mph and returns along the same road at ${v2} mph. What is its average speed for the round trip, in mph?`,
      explanation: `Average speed = total distance ÷ total time = 2·${v1}·${v2}/(${v1}+${v2}) = ${fmt(answer)}. Not the simple mean ${(v1 + v2) / 2}.`,
      wrong: [(v1 + v2) / 2, v2 - v1, Math.max(v1, v2) - 5] };
  },
  // Probability
  (rng) => {
    const r = randInt(rng, 2, 6), b = randInt(rng, 2, 6);
    const answer = Math.round((r / (r + b)) * ((r - 1) / (r + b - 1)) * 1000) / 1000;
    return { subtype: 'Probability', difficulty: 3, answer,
      prompt: `A bag holds ${r} red and ${b} blue marbles. Two are drawn without replacement. What is the probability that both are red? (to 3 decimals)`,
      explanation: `P = ${r}/${r + b} × ${r - 1}/${r + b - 1} = ${answer}.`,
      wrong: [Math.round((r / (r + b)) ** 2 * 1000) / 1000, Math.round((r / (r + b)) * 1000) / 1000, Math.round((2 * r) / (r + b) / 2 * 1000) / 1000 + 0.05] };
  },
  // Exponents
  (rng) => {
    const base = pick(rng, [2, 3, 5]), m = randInt(rng, 2, 5), n = randInt(rng, 2, 5);
    return { subtype: 'Exponents', difficulty: 2, answer: m + n,
      prompt: `If ${base}^${m} × ${base}^${n} = ${base}^k, what is k?`,
      explanation: `Same base: add exponents. k = ${m} + ${n} = ${m + n}.`,
      wrong: [m * n, Math.abs(m - n), m + n + 1] };
  },
  // Slope
  (rng) => {
    const x1 = randInt(rng, -4, 2), y1 = randInt(rng, -5, 5), dx = randInt(rng, 1, 4), m = pick(rng, [-3, -2, -1, 1, 2, 3, 4]);
    const x2 = x1 + dx, y2 = y1 + m * dx;
    return { subtype: 'Coordinate geometry', difficulty: 2, answer: m,
      prompt: `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
      explanation: `Slope = (y₂ − y₁)/(x₂ − x₁) = (${y2} − ${y1})/(${x2} − ${x1}) = ${m}.`,
      wrong: [-m, dx / (m * dx || 1), m * dx] };
  },
];

export function generateQuantEn(rng: Rng, id: string): Question {
  const spec = pick(rng, templates)(rng);
  const values = new Set<number>([spec.answer]);
  for (const w of shuffle(rng, spec.wrong)) {
    const v = Math.round(w * 1000) / 1000;
    if (Number.isFinite(v) && !values.has(v) && values.size < 4) values.add(v);
  }
  for (let k = 1; values.size < 4; k++) values.add(spec.answer + k * (spec.answer === 0 ? 1 : Math.max(1, Math.abs(Math.round(spec.answer / 5)))));
  const ordered = shuffle(rng, [...values]);
  return {
    id, section: 'quantEn', subtype: spec.subtype, prompt: spec.prompt, explanation: spec.explanation, difficulty: spec.difficulty,
    choices: ordered.map((v) => ({ text: fmt(v) })), answerIndex: ordered.indexOf(spec.answer), dir: 'ltr',
  };
}
