import type { Question } from '../models/question';
import { pick, randInt, shuffle, type Rng } from '../utils/random';

const DIGITS = '0123456789';
const LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת';
const LATIN = 'ABCDEFGHJKLMNPRSTUVWXYZ';

const randomString = (rng: Rng, alphabet: string, len: number): string =>
  Array.from({ length: len }, () => alphabet[Math.floor(rng() * alphabet.length)]).join('');

/** Introduce one subtle change: swap adjacent chars or replace one char. */
function mutate(rng: Rng, s: string, alphabet: string): string {
  const chars = s.split('');
  const i = randInt(rng, 0, chars.length - 2);
  if (rng() < 0.5 && chars[i] !== chars[i + 1]) {
    [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
  } else {
    let c = chars[i];
    while (c === chars[i]) c = alphabet[Math.floor(rng() * alphabet.length)];
    chars[i] = c;
  }
  return chars.join('');
}

/** "How many of the pairs are identical?" – classic clerical-accuracy task. */
function identicalPairs(rng: Rng, id: string): Question {
  const alphabet = pick(rng, [DIGITS, LATIN, DIGITS + LATIN]);
  const len = randInt(rng, 6, 9);
  const pairs = Array.from({ length: 5 }, () => {
    const a = randomString(rng, alphabet, len);
    const same = rng() < 0.5;
    return { a, b: same ? a : mutate(rng, a, alphabet), same };
  });
  const answer = pairs.filter((p) => p.same).length;
  const options = shuffle(rng, [...new Set([answer, ...shuffle(rng, [0, 1, 2, 3, 4, 5]).filter((x) => x !== answer)])].slice(0, 4));
  return {
    id, section: 'attention', subtype: 'זוגות זהים', difficulty: 2,
    prompt: 'כמה מהזוגות הבאים זהים לחלוטין?',
    codeBlock: pairs.map((p) => `${p.a}    ${p.b}`).join('\n'),
    choices: options.map((o) => ({ text: String(o) })),
    answerIndex: options.indexOf(answer),
    explanation: `הזוגות הזהים: ${pairs.map((p, i) => (p.same ? i + 1 : null)).filter((x) => x !== null).join(', ') || 'אין'}. טיפ: השוו בקבוצות של 3 תווים ולא את כל המחרוזת במבט אחד.`,
  };
}

/** Count occurrences of a target symbol in a noisy row. */
function countSymbol(rng: Rng, id: string): Question {
  const alphabet = pick(rng, [DIGITS, LETTERS]);
  const target = alphabet[Math.floor(rng() * alphabet.length)];
  const row = randomString(rng, alphabet, 36);
  const answer = row.split('').filter((c) => c === target).length;
  const opts = shuffle(rng, [answer, answer + 1, answer - 1 < 0 ? answer + 3 : answer - 1, answer + 2]);
  const grouped = row.match(/.{1,6}/g)!.join(' ');
  return {
    id, section: 'attention', subtype: 'ספירת תווים', difficulty: 2,
    prompt: `כמה פעמים מופיע התו "${target}" בשורה?`,
    codeBlock: grouped,
    choices: opts.map((o) => ({ text: String(o) })),
    answerIndex: opts.indexOf(answer),
    explanation: `התו "${target}" מופיע ${answer} פעמים. טיפ: עברו קבוצה-קבוצה וספרו על האצבעות/בטיוטה – אל תסמכו על מבט כללי.`,
  };
}

/** Find the row that differs from the reference. */
function findDifferent(rng: Rng, id: string): Question {
  const alphabet = pick(rng, [DIGITS, LATIN]);
  const ref = randomString(rng, alphabet, randInt(rng, 8, 11));
  const diffIdx = randInt(rng, 0, 3);
  const rows = [0, 1, 2, 3].map((i) => (i === diffIdx ? mutate(rng, ref, alphabet) : ref));
  return {
    id, section: 'attention', subtype: 'מציאת השונה', difficulty: 1,
    prompt: 'איזו שורה שונה מהאחרות?',
    codeBlock: rows.map((r, i) => `${i + 1})  ${r}`).join('\n'),
    choices: [1, 2, 3, 4].map((n) => ({ text: `שורה ${n}` })),
    answerIndex: diffIdx,
    explanation: `שורה ${diffIdx + 1}: ${rows[diffIdx]} לעומת ${ref}.`,
  };
}

/** Code-table substitution – tests working memory + accuracy under time. */
function codeTable(rng: Rng, id: string): Question {
  const symbols = shuffle(rng, ['★', '●', '▲', '■', '◆', '♥', '✚', '☾']).slice(0, 6);
  const digits = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
  const table = symbols.map((s, i) => `${s}=${digits[i]}`).join('  ');
  const seq = Array.from({ length: 4 }, () => randInt(rng, 0, 5));
  const answer = seq.map((i) => digits[i]).join('');
  const wrong = new Set<string>();
  while (wrong.size < 3) {
    const w = mutate(rng, answer, digits.join(''));
    if (w !== answer) wrong.add(w);
  }
  const opts = shuffle(rng, [answer, ...wrong]);
  return {
    id, section: 'attention', subtype: 'טבלת קוד', difficulty: 2,
    prompt: `לפי טבלת הקוד, מה הקוד של הרצף: ${seq.map((i) => symbols[i]).join(' ')} ?`,
    codeBlock: table,
    choices: opts.map((o) => ({ text: o })),
    answerIndex: opts.indexOf(answer),
    explanation: `${seq.map((i) => `${symbols[i]}=${digits[i]}`).join(', ')} ⇐ ${answer}.`,
  };
}

const generators = [identicalPairs, countSymbol, findDifferent, codeTable];

export function generateAttention(rng: Rng, id: string): Question {
  return pick(rng, generators)(rng, id);
}
