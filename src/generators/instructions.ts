import type { Question } from '../models/question';
import { pick, randInt, sample, shuffle, type Rng } from '../utils/random';

/**
 * "הבנת הוראות" – the candidate gets a short data set and a conditional rule.
 * Everything here is computed, so the answer key is always right and there
 * are endless variations. Choices are the data items themselves (like the
 * real test where you mark one of the shown items).
 */

const WORDS = [
  'שולחן', 'מחשב', 'חלון', 'ספר', 'כביש', 'מטוס', 'עיפרון', 'גינה', 'מעיל', 'שעון',
  'תפוח', 'מדבר', 'אוניה', 'כדור', 'מפתח', 'רכבת', 'עננים', 'נהר', 'כיסא', 'מנורה',
  'דלת', 'חתול', 'ים', 'גשר', 'שמש', 'ירח', 'פרח', 'מגדל', 'שוטר', 'מצלמה',
];

const ordinal = ['הראשון', 'השני', 'השלישי', 'הרביעי'];
const ordinalF = ['הראשונה', 'השנייה', 'השלישית', 'הרביעית'];

function numbersRule(rng: Rng, id: string): Question {
  // Four distinct numbers; rule picks one of them via a condition
  let nums: number[];
  do {
    nums = sample(rng, Array.from({ length: 40 }, (_, i) => i + 2), 4);
  } while (new Set(nums).size < 4);
  const sumFirstLast = nums[0] + nums[3];
  const threshold = randInt(rng, 25, 50);
  const cond = sumFirstLast > threshold;
  const evens = nums.filter((n) => n % 2 === 0);
  // Branch targets must be uniquely defined
  const useMax = rng() < 0.5;
  const thenTarget = useMax ? Math.max(...nums) : Math.min(...nums);
  const finalThen = useMax ? 'את המספר הגדול ביותר' : 'את המספר הקטן ביותר';
  const elseTarget = evens.length === 1 ? evens[0] : nums[1];
  const elseText = evens.length === 1 ? 'את המספר הזוגי היחיד' : 'את המספר השני ברשימה';
  const answer = cond ? thenTarget : elseTarget;
  return {
    id, section: 'instructions', subtype: 'תנאי על מספרים', difficulty: 2,
    prompt: `לפניך המספרים: ${nums.join(' , ')}.\nאם סכום המספר הראשון והמספר האחרון גדול מ-${threshold} – סמן ${finalThen}. אחרת – סמן ${elseText}.`,
    choices: nums.map((n) => ({ text: String(n) })),
    answerIndex: nums.indexOf(answer),
    explanation: `${nums[0]} + ${nums[3]} = ${sumFirstLast}, ${cond ? `גדול מ-${threshold} ⇐ מסמנים ${finalThen}: ${answer}` : `לא גדול מ-${threshold} ⇐ מסמנים ${elseText}: ${answer}`}.`,
  };
}

function wordsLetterRule(rng: Rng, id: string): Question {
  const words = sample(rng, WORDS, 4);
  const pos = randInt(rng, 0, 1); // first or second letter
  const targetIdx = randInt(rng, 0, 3);
  const letter = words[targetIdx][pos];
  const matching = words.filter((w) => w[pos] === letter);
  const ok = matching.length === 1;
  const fallbackIdx = (targetIdx + 2) % 4;
  const answer = ok ? words[targetIdx] : words.reduce((a, b) => (b.length > a.length ? b : a));
  const longestUnique = words.filter((w) => w.length === answer.length).length === 1;
  if (!ok && !longestUnique) return wordsLengthRule(rng, id, words, fallbackIdx);
  return {
    id, section: 'instructions', subtype: 'תנאי על מילים', difficulty: 2,
    prompt: `לפניך המילים: ${words.join(' , ')}.\nאם יש בדיוק מילה אחת שהאות ${pos === 0 ? 'הראשונה' : 'השנייה'} בה היא "${letter}" – סמן אותה. אחרת – סמן את המילה הארוכה ביותר.`,
    choices: words.map((w) => ({ text: w })),
    answerIndex: words.indexOf(answer),
    explanation: ok
      ? `רק "${answer}" מקיימת את התנאי (אות ${pos === 0 ? 'ראשונה' : 'שנייה'} "${letter}").`
      : `יותר ממילה אחת מתחילה כך (${matching.join(', ')}), ולכן מסמנים את הארוכה ביותר: "${answer}".`,
  };
}

function wordsLengthRule(rng: Rng, id: string, words = sample(rng, WORDS, 4), idx = randInt(rng, 0, 3)): Question {
  const k = idx;
  const lenK = words[k].length;
  const shorter = words.filter((w) => w.length < lenK);
  const ans = shorter.length > 0 ? words[k] : words[(k + 1) % 4];
  return {
    id, section: 'instructions', subtype: 'תנאי על מילים', difficulty: 3,
    prompt: `לפניך המילים: ${words.join(' , ')}.\nאם קיימת ברשימה מילה קצרה יותר מהמילה ${ordinalF[k]} – סמן את המילה ${ordinalF[k]}. אחרת – סמן את המילה שאחריה (אחרי הרביעית חוזרים לראשונה).`,
    choices: words.map((w) => ({ text: w })),
    answerIndex: words.indexOf(ans),
    explanation: shorter.length > 0
      ? `"${shorter[0]}" קצרה מ"${words[k]}" (${shorter[0].length} מול ${lenK} אותיות) ⇐ מסמנים "${words[k]}".`
      : `אין מילה קצרה מ"${words[k]}" ⇐ מסמנים את הבאה אחריה: "${ans}".`,
  };
}

function positionRule(rng: Rng, id: string): Question {
  const letters = shuffle(rng, ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח']).slice(0, 4);
  const sorted = [...letters].sort((a, b) => a.localeCompare(b, 'he'));
  const alphabetical = letters.join('') === sorted.join('');
  const pickOrd = randInt(rng, 0, 3);
  const answer = alphabetical ? letters[pickOrd] : sorted[0];
  return {
    id, section: 'instructions', subtype: 'סדר ומיקום', difficulty: 2,
    prompt: `לפניך האותיות: ${letters.join(' , ')}.\nאם האותיות מסודרות לפי סדר הא"ב – סמן את האות במקום ה${ordinal[pickOrd].slice(1)}. אחרת – סמן את האות המוקדמת ביותר בא"ב.`,
    choices: letters.map((l) => ({ text: l })),
    answerIndex: letters.indexOf(answer),
    explanation: alphabetical
      ? `האותיות מסודרות לפי הא"ב ⇐ האות במקום ה${ordinal[pickOrd].slice(1)}: ${answer}.`
      : `האותיות אינן לפי סדר הא"ב ⇐ האות המוקדמת ביותר: ${answer}.`,
  };
}

function doubleConditionRule(rng: Rng, id: string): Question {
  const nums = sample(rng, Array.from({ length: 30 }, (_, i) => i + 3), 4);
  const a = nums[0];
  const b = nums[2];
  const condA = a % 3 === 0;
  const condB = b > 15;
  const both = condA && condB;
  const either = condA || condB;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const answer = both ? nums[3] : either ? max : min;
  return {
    id, section: 'instructions', subtype: 'תנאי כפול', difficulty: 3,
    prompt: `לפניך המספרים: ${nums.join(' , ')}.\nאם המספר הראשון מתחלק ב-3 וגם המספר השלישי גדול מ-15 – סמן את המספר האחרון. אם רק אחד מהתנאים מתקיים – סמן את המספר הגדול ביותר. אם אף תנאי אינו מתקיים – סמן את המספר הקטן ביותר.`,
    choices: nums.map((n) => ({ text: String(n) })),
    answerIndex: nums.indexOf(answer),
    explanation: `${a} ${condA ? 'מתחלק' : 'לא מתחלק'} ב-3; ${b} ${condB ? 'גדול' : 'אינו גדול'} מ-15 ⇐ ${both ? 'שני התנאים מתקיימים' : either ? 'רק תנאי אחד מתקיים' : 'אף תנאי אינו מתקיים'} ⇐ ${answer}.`,
  };
}

const rules = [numbersRule, wordsLetterRule, (r: Rng, id: string) => wordsLengthRule(r, id), positionRule, doubleConditionRule];

export function generateInstructions(rng: Rng, id: string): Question {
  return pick(rng, rules)(rng, id);
}
