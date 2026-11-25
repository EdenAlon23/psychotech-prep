import type { Difficulty, Question } from '../models/question';
import { numericChoices } from '../utils/questionBuilder';
import { pick, randInt, type Rng } from '../utils/random';

interface MathSpec {
  subtype: string;
  prompt: string;
  answer: number;
  explanation: string;
  difficulty: Difficulty;
  spread?: number[];
  unit?: string;
}

const NAMES = ['דני', 'מיכל', 'יוסי', 'נועה', 'אבי', 'שירה', 'רון', 'טל', 'עומר', 'הדס'];

const templates: ((rng: Rng) => MathSpec)[] = [
  // Percent of a number
  (rng) => {
    const p = pick(rng, [10, 15, 20, 25, 30, 40, 75]);
    const base = pick(rng, [80, 120, 160, 200, 240, 360, 400, 600]);
    const answer = (p * base) / 100;
    return {
      subtype: 'אחוזים', difficulty: 1, answer,
      prompt: `כמה הם ${p}% מתוך ${base}?`,
      explanation: `${p}% = ${p}/100, ולכן ${base} × ${p}/100 = ${answer}.`,
      spread: [answer * 0.5, -answer * 0.25, 10, -10, base / 10],
    };
  },
  // Price after discount
  (rng) => {
    const price = pick(rng, [80, 120, 150, 200, 240, 300, 450]);
    const p = pick(rng, [10, 20, 25, 30, 40, 50]);
    const answer = price * (1 - p / 100);
    return {
      subtype: 'אחוזים', difficulty: 2, answer,
      prompt: `מחירה של חולצה הוא ${price} ש"ח. בעונת המבצעים ניתנה הנחה של ${p}%. מה מחירה אחרי ההנחה (בש"ח)?`,
      explanation: `ההנחה היא ${(price * p) / 100} ש"ח (${p}% מ-${price}), ולכן המחיר: ${price} − ${(price * p) / 100} = ${answer}.`,
      spread: [(price * p) / 100 - answer, 10, -10, 20, -5],
    };
  },
  // Increase then decrease – classic trap
  (rng) => {
    const p = pick(rng, [10, 20, 50]);
    const base = pick(rng, [100, 200, 400]);
    const answer = base * (1 + p / 100) * (1 - p / 100);
    return {
      subtype: 'אחוזים', difficulty: 3, answer,
      prompt: `מחיר מוצר היה ${base} ש"ח. המחיר עלה ב-${p}%, ולאחר מכן ירד ב-${p}%. מה המחיר הסופי?`,
      explanation: `אחרי העלייה: ${base * (1 + p / 100)}. הירידה מחושבת מהמחיר החדש: ${base * (1 + p / 100)} × ${(100 - p) / 100} = ${answer}. (מלכודת נפוצה: לחשוב שחוזרים ל-${base}.)`,
      spread: [base - answer, (base - answer) * 2, -(base - answer), base * 0.1],
    };
  },
  // Speed-distance-time
  (rng) => {
    const v = pick(rng, [40, 50, 60, 80, 90, 120]);
    const t = pick(rng, [1.5, 2, 2.5, 3, 4]);
    const d = v * t;
    return {
      subtype: 'דרך-מהירות-זמן', difficulty: 2, answer: t,
      prompt: `רכב נוסע במהירות קבועה של ${v} קמ"ש. כמה שעות יידרשו לו כדי לעבור ${d} ק"מ?`,
      explanation: `זמן = דרך ÷ מהירות = ${d} ÷ ${v} = ${t} שעות.`,
      spread: [0.5, -0.5, 1, -1, 1.5],
    };
  },
  // Average speed round trip
  (rng) => {
    const [v1, v2] = pick(rng, [[30, 60], [40, 60], [60, 120], [20, 30]] as const);
    const answer = (2 * v1 * v2) / (v1 + v2);
    return {
      subtype: 'דרך-מהירות-זמן', difficulty: 3, answer,
      prompt: `${pick(rng, NAMES)} נסע לעבודה במהירות ${v1} קמ"ש וחזר באותה דרך במהירות ${v2} קמ"ש. מה הייתה מהירותו הממוצעת בכל הנסיעה (בקמ"ש)?`,
      explanation: `מהירות ממוצעת = סך הדרך ÷ סך הזמן. אם הדרך d: הזמן הכולל d/${v1} + d/${v2}, ולכן הממוצע = 2·${v1}·${v2}/(${v1}+${v2}) = ${answer}. (לא ממוצע פשוט ${(v1 + v2) / 2}!)`,
      spread: [(v1 + v2) / 2 - answer, 5, -5, 10],
    };
  },
  // Joint work
  (rng) => {
    const [a, b] = pick(rng, [[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [6, 3]] as const);
    const answer = (a * b) / (a + b);
    return {
      subtype: 'הספק עבודה', difficulty: 3, answer,
      prompt: `פועל א' צובע חדר ב-${a} שעות, ופועל ב' צובע את אותו החדר ב-${b} שעות. בכמה שעות יצבעו את החדר אם יעבדו יחד?`,
      explanation: `בשעה אחת: 1/${a} + 1/${b} = ${a + b}/${a * b} מהחדר. לכן הזמן = ${a * b}/${a + b} = ${answer} שעות.`,
      spread: [(a + b) / 2 - answer, 1, -1, 2, Math.abs(a - b) - answer],
    };
  },
  // Ratio sharing
  (rng) => {
    const [r1, r2] = pick(rng, [[2, 3], [3, 5], [1, 4], [3, 7], [2, 5]] as const);
    const unit = pick(rng, [20, 30, 40, 50, 60]);
    const total = (r1 + r2) * unit;
    const answer = r2 * unit;
    const [n1, n2] = [pick(rng, NAMES.slice(0, 5)), pick(rng, NAMES.slice(5))];
    return {
      subtype: 'יחס ופרופורציה', difficulty: 2, answer,
      prompt: `${n1} ו${n2} חילקו ביניהם ${total} ש"ח ביחס של ${r1}:${r2}. כמה קיבל/ה ${n2}?`,
      explanation: `סך החלקים: ${r1}+${r2}=${r1 + r2}. חלק אחד = ${total}/${r1 + r2} = ${unit}. ל${n2}: ${r2}×${unit} = ${answer}.`,
      spread: [r1 * unit - answer, unit, -unit, total / 2 - answer],
    };
  },
  // Proportion (unit rate)
  (rng) => {
    const workers = pick(rng, [3, 4, 5, 6]);
    const days = pick(rng, [4, 6, 8, 10, 12]);
    const newWorkers = pick(rng, [2, 3, 8, 10, 12].filter((w) => (workers * days) % w === 0 && w !== workers));
    const nw = newWorkers ?? workers * 2;
    const answer = (workers * days) / nw;
    return {
      subtype: 'יחס ופרופורציה', difficulty: 2, answer,
      prompt: `${workers} פועלים מסיימים עבודה ב-${days} ימים. בכמה ימים יסיימו את אותה עבודה ${nw} פועלים (באותו קצב)?`,
      explanation: `יחס הפוך: סך העבודה = ${workers}×${days} = ${workers * days} ימי-עבודה. ${workers * days} ÷ ${nw} = ${answer}.`,
      spread: [(days * nw) / workers - answer, 1, -1, 2],
    };
  },
  // Missing value for average
  (rng) => {
    const n = pick(rng, [3, 4]);
    const target = pick(rng, [70, 75, 80, 85, 90]);
    const known = Array.from({ length: n }, () => randInt(rng, target - 15, target + 10));
    const answer = target * (n + 1) - known.reduce((s, x) => s + x, 0);
    return {
      subtype: 'ממוצעים', difficulty: 2, answer,
      prompt: `ציוני ${pick(rng, NAMES)} ב-${n} מבחנים היו: ${known.join(', ')}. איזה ציון עליו/ה לקבל במבחן הבא כדי שהממוצע של כל המבחנים יהיה ${target}?`,
      explanation: `סכום נדרש ל-${n + 1} מבחנים: ${target}×${n + 1} = ${target * (n + 1)}. סכום קיים: ${known.reduce((s, x) => s + x, 0)}. ההפרש: ${answer}.`,
      spread: [target - answer, 5, -5, 10, -10],
    };
  },
  // Ages
  (rng) => {
    const childAge = randInt(rng, 4, 12);
    const k = pick(rng, [3, 4]);
    const years = pick(rng, [2, 4, 5, 6]);
    const parentNow = childAge * k;
    const answer = parentNow + years;
    return {
      subtype: 'בעיות גיל', difficulty: 2, answer,
      prompt: `היום גיל האב גדול פי ${k} מגיל בנו. הבן בן ${childAge}. בן כמה יהיה האב בעוד ${years} שנים?`,
      explanation: `גיל האב היום: ${k}×${childAge} = ${parentNow}. בעוד ${years} שנים: ${answer}.`,
      spread: [k * (childAge + years) - answer, -years, years, 1],
    };
  },
  // Fractions of a group
  (rng) => {
    const total = pick(rng, [24, 36, 40, 48, 60, 72]);
    const [num, den] = pick(rng, [[1, 3], [1, 4], [2, 3], [3, 4], [1, 2]] as const);
    const firstGroup = (total * num) / den;
    const rest = total - firstGroup;
    const halfRest = rest / 2;
    return {
      subtype: 'שברים', difficulty: 2, answer: halfRest,
      prompt: `בכיתה ${total} תלמידים. ${num}/${den} מהם משחקים כדורגל, ומחצית מהנותרים משחקים כדורסל. כמה משחקים כדורסל?`,
      explanation: `כדורגל: ${total}×${num}/${den} = ${firstGroup}. נותרו ${rest}, ומחציתם: ${halfRest}.`,
      spread: [firstGroup - halfRest, rest - halfRest, total / 2 - halfRest, 2],
    };
  },
  // Arithmetic fluency – order of operations
  (rng) => {
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 2, 9);
    const c = randInt(rng, 2, 9);
    const d = randInt(rng, 10, 40);
    const answer = d + a * b - c;
    return {
      subtype: 'סדר פעולות', difficulty: 1, answer,
      prompt: `חשב: ${d} + ${a} × ${b} − ${c} = ?`,
      explanation: `כפל לפני חיבור וחיסור: ${a}×${b} = ${a * b}; ${d} + ${a * b} − ${c} = ${answer}.`,
      spread: [(d + a) * b - c - answer, 2, -2, 10],
    };
  },
];

export function generateMath(rng: Rng, id: string): Question {
  const spec = pick(rng, templates)(rng);
  const spread = (spec.spread ?? [1, -1, 2, 5]).map((x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 3)).filter((x) => x !== 0);
  const { choices, answerIndex } = numericChoices(rng, spec.answer, spread);
  return {
    id,
    section: 'math',
    subtype: spec.subtype,
    prompt: spec.prompt,
    choices,
    answerIndex,
    explanation: spec.explanation,
    difficulty: spec.difficulty,
  };
}
