import type { FigureCell, FillKind, Question, ShapeKind } from '../models/question';
import { pick, sample, shuffle, type Rng } from '../utils/random';

/**
 * Procedural Raven-style matrices and figural series. Each attribute
 * (shape / count / fill / dot angle) gets an independent rule; the
 * missing cell is computed, so the key is guaranteed correct. Distractors
 * break exactly one rule each – the same design real test-makers use,
 * which forces you to verify *every* attribute rather than guess.
 */

const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];
const FILLS: FillKind[] = ['empty', 'striped', 'full'];
const COUNTS: (1 | 2 | 3)[] = [1, 2, 3];

const SHAPE_HE: Record<ShapeKind, string> = { circle: 'עיגול', square: 'ריבוע', triangle: 'משולש', diamond: 'מעוין', hexagon: 'משושה' };
const FILL_HE: Record<FillKind, string> = { empty: 'ריק', striped: 'מפוספס', full: 'מלא' };

type Attr = 'shape' | 'count' | 'fill' | 'dotAngle';
type RuleKind = 'const' | 'progression' | 'latin' | 'byRow';

const ATTR_HE: Record<Attr, string> = { shape: 'הצורה', count: 'מספר הצורות', fill: 'המילוי', dotAngle: 'מיקום הנקודה' };

const keyOf = (c: FigureCell): string => `${c.shape}|${c.count}|${c.fill}|${c.dotAngle ?? '-'}`;

function valuesFor(rng: Rng, attr: Attr): (string | number)[] {
  switch (attr) {
    case 'shape': return sample(rng, SHAPES, 3);
    case 'count': return rng() < 0.5 ? [1, 2, 3] : [3, 2, 1];
    case 'fill': return shuffle(rng, FILLS);
    case 'dotAngle': {
      const step = pick(rng, [45, 90]);
      const start = pick(rng, [0, 90, 180, 270]);
      return [0, 1, 2].map((i) => (start + i * step) % 360);
    }
  }
}

function describe(attr: Attr, rule: RuleKind, vals: (string | number)[]): string {
  const fmt = (v: string | number): string =>
    attr === 'shape' ? SHAPE_HE[v as ShapeKind] : attr === 'fill' ? FILL_HE[v as FillKind] : attr === 'dotAngle' ? `${v}°` : String(v);
  const list = vals.map(fmt).join(' ← ');
  switch (rule) {
    case 'const': return `${ATTR_HE[attr]} קבוע בכל המטריצה (${fmt(vals[0])}).`;
    case 'progression':
      return attr === 'dotAngle'
        ? `הנקודה מסתובבת בכל עמודה (מימין לשמאל): ${list}.`
        : `${ATTR_HE[attr]} משתנה לאורך כל שורה מימין לשמאל: ${list}.`;
    case 'latin': return `בכל שורה מופיע כל ערך של ${ATTR_HE[attr]} פעם אחת בדיוק (${vals.map(fmt).join(', ')}) – לכן בתא החסר מופיע הערך שעדיין לא הופיע בשורה.`;
    case 'byRow': return `${ATTR_HE[attr]} קבוע בתוך כל שורה ומשתנה בין השורות (${vals.map(fmt).join(', ')}).`;
  }
}

function valueAt(rule: RuleKind, vals: (string | number)[], row: number, col: number): string | number {
  switch (rule) {
    case 'const': return vals[0];
    case 'progression': return vals[col];
    case 'latin': return vals[(row + col) % 3];
    case 'byRow': return vals[row];
  }
}

function makeCell(attrs: Record<Attr, string | number | undefined>): FigureCell {
  return {
    shape: attrs.shape as ShapeKind,
    count: attrs.count as 1 | 2 | 3,
    fill: attrs.fill as FillKind,
    dotAngle: attrs.dotAngle as number | undefined,
  };
}

/** Change a single attribute of the answer to produce a "one-rule-broken" distractor. */
function alter(rng: Rng, cell: FigureCell, attr: Attr): FigureCell {
  switch (attr) {
    case 'shape': return { ...cell, shape: pick(rng, SHAPES.filter((s) => s !== cell.shape)) };
    case 'count': return { ...cell, count: pick(rng, COUNTS.filter((c) => c !== cell.count)) };
    case 'fill': return { ...cell, fill: pick(rng, FILLS.filter((f) => f !== cell.fill)) };
    case 'dotAngle': {
      const cur = cell.dotAngle ?? 0;
      return { ...cell, dotAngle: pick(rng, [45, 90, 180, 270].map((d) => (cur + d) % 360)) };
    }
  }
}

function buildOptions(rng: Rng, answer: FigureCell, attrs: Attr[], preferred: Attr[]): { choices: FigureCell[]; answerIndex: number } {
  const seen = new Set<string>([keyOf(answer)]);
  const opts: FigureCell[] = [answer];
  const order = [...shuffle(rng, preferred), ...shuffle(rng, attrs)];
  let guard = 0;
  while (opts.length < 4 && guard++ < 50) {
    const a = order[guard % order.length];
    const d = alter(rng, answer, a);
    if (!seen.has(keyOf(d))) {
      seen.add(keyOf(d));
      opts.push(d);
    }
  }
  const shuffled = shuffle(rng, opts);
  return { choices: shuffled, answerIndex: shuffled.indexOf(answer) };
}

function generateMatrix(rng: Rng, id: string): Question {
  const useDot = rng() < 0.45;
  const attrs: Attr[] = useDot ? ['shape', 'count', 'fill', 'dotAngle'] : ['shape', 'count', 'fill'];
  const varyingCount = pick(rng, [1, 2, 2, 3]);
  const varying = sample(rng, attrs, varyingCount);
  const rules = {} as Record<Attr, RuleKind>;
  const vals = {} as Record<Attr, (string | number)[]>;
  for (const a of attrs) {
    rules[a] = varying.includes(a)
      ? a === 'dotAngle' ? 'progression' : pick(rng, ['progression', 'latin', 'byRow'] as RuleKind[])
      : 'const';
    vals[a] = valuesFor(rng, a);
  }
  // Avoid a degenerate puzzle where all varying attributes are 'byRow' (answer = any cell of row 3)
  if (varying.every((a) => rules[a] === 'byRow')) rules[varying[0]] = 'latin';

  const cells: (FigureCell | null)[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const attrsAt = {} as Record<Attr, string | number | undefined>;
      for (const a of ['shape', 'count', 'fill', 'dotAngle'] as Attr[])
        attrsAt[a] = attrs.includes(a) ? valueAt(rules[a], vals[a], r, c) : undefined;
      cells.push(makeCell(attrsAt));
    }
  const answer = cells[8]!;
  cells[8] = null;
  const { choices, answerIndex } = buildOptions(rng, answer, attrs, varying);
  const explanation = [
    ...varying.map((a) => describe(a, rules[a], vals[a])),
    ...attrs.filter((a) => !varying.includes(a)).map((a) => describe(a, 'const', vals[a])),
  ].join(' ');
  return {
    id, section: 'figures', subtype: varyingCount >= 3 ? 'מטריצה – 3 חוקים' : varyingCount === 2 ? 'מטריצה – 2 חוקים' : 'מטריצה – חוק אחד',
    difficulty: varyingCount as 1 | 2 | 3,
    prompt: 'איזו צורה משלימה את המטריצה? (קוראים מימין לשמאל ומלמעלה למטה)',
    figure: { layout: 'matrix', cells },
    choices: choices.map((f) => ({ figure: f })),
    answerIndex,
    explanation,
  };
}

function generateSeries(rng: Rng, id: string): Question {
  const shapeA = pick(rng, SHAPES);
  const shapeB = pick(rng, SHAPES.filter((s) => s !== shapeA));
  const alternateShape = rng() < 0.4;
  const step = pick(rng, [45, 90, -90, 135]);
  const startAngle = pick(rng, [0, 90, 180, 270]);
  const countCycle = rng() < 0.5;
  const fillAlt = rng() < 0.5;
  const fillPair = sample(rng, FILLS, 2);
  const baseFill = pick(rng, FILLS);
  const baseCount = pick(rng, COUNTS);
  const N = 6;
  const seq: FigureCell[] = Array.from({ length: N }, (_, i) => ({
    shape: alternateShape ? (i % 2 === 0 ? shapeA : shapeB) : shapeA,
    count: countCycle ? COUNTS[i % 3] : baseCount,
    fill: fillAlt ? fillPair[i % 2] : baseFill,
    dotAngle: (((startAngle + i * step) % 360) + 360) % 360,
  }));
  const answer = seq[N - 1];
  const attrs: Attr[] = ['shape', 'count', 'fill', 'dotAngle'];
  const changing: Attr[] = ['dotAngle', ...(alternateShape ? (['shape'] as Attr[]) : []), ...(countCycle ? (['count'] as Attr[]) : []), ...(fillAlt ? (['fill'] as Attr[]) : [])];
  const { choices, answerIndex } = buildOptions(rng, answer, attrs, changing);
  const parts = [
    `הנקודה זזה ב-${Math.abs(step)}° ${step > 0 ? 'עם כיוון השעון' : 'נגד כיוון השעון'} בכל צעד.`,
    alternateShape ? `הצורה מתחלפת: ${SHAPE_HE[shapeA]}, ${SHAPE_HE[shapeB]}.` : '',
    countCycle ? 'מספר הצורות עולה במחזוריות 1→2→3.' : '',
    fillAlt ? `המילוי מתחלף: ${FILL_HE[fillPair[0]]}, ${FILL_HE[fillPair[1]]}.` : '',
  ].filter(Boolean);
  const nChanging = changing.length;
  return {
    id, section: 'figures', subtype: 'סדרה צורנית',
    difficulty: nChanging >= 3 ? 3 : nChanging === 2 ? 2 : 1,
    prompt: 'איזו צורה ממשיכה את הסדרה? (מימין לשמאל)',
    figure: { layout: 'series', cells: [...seq.slice(0, N - 1), null] },
    choices: choices.map((f) => ({ figure: f })),
    answerIndex,
    explanation: parts.join(' '),
  };
}

export function generateFigure(rng: Rng, id: string): Question {
  return rng() < 0.65 ? generateMatrix(rng, id) : generateSeries(rng, id);
}
