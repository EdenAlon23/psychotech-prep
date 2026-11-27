import type { Attempt, QuizBlock, QuizPlan } from '../models/attempt';
import type { Question, SectionId } from '../models/question';
import { analogyQuestions } from '../data/analogies';
import { hebrewQuestions } from '../data/hebrew';
import { logicQuestions } from '../data/logic';
import { SECTION_BY_ID, SIMULATIONS } from '../data/sections';
import { generateAttention } from '../generators/attention';
import { generateFigure } from '../generators/figures';
import { generateInstructions } from '../generators/instructions';
import { generateMath } from '../generators/math';
import { generateDataSufficiency } from '../generators/dataSufficiency';
import { generateQuantEn } from '../generators/quantEn';
import { englishQuestions } from '../data/english';
import { generateNumberSeries } from '../generators/numberSeries';
import { createRng, randomSeed, shuffle, type Rng } from '../utils/random';
import { subtypeStats } from './analytics';

/**
 * Strategy per section: procedural generators (infinite, always-correct keys)
 * or curated banks (language content can't be generated reliably).
 * Adding a section = adding one entry here (Open/Closed).
 */
type Generator = (rng: Rng, id: string) => Question;

const GENERATORS: Partial<Record<SectionId, Generator>> = {
  instructions: generateInstructions,
  numberSeries: generateNumberSeries,
  math: generateMath,
  figures: generateFigure,
  attention: generateAttention,
  quantEn: generateQuantEn,
  dataSufficiency: generateDataSufficiency,
};

const BANKS: Partial<Record<SectionId, Question[]>> = {
  analogies: analogyQuestions,
  logic: logicQuestions,
  hebrew: hebrewQuestions,
  english: englishQuestions,
};

export const isGenerated = (section: SectionId): boolean => section in GENERATORS;

/** Subtypes available per section (for practice filters). Generated ones are sampled once. */
export function subtypesOf(section: SectionId): string[] {
  const bank = BANKS[section];
  if (bank) return [...new Set(bank.map((q) => q.subtype))];
  const gen = GENERATORS[section]!;
  const rng = createRng(12345);
  const set = new Set<string>();
  for (let i = 0; i < 300; i++) set.add(gen(rng, 'probe').subtype);
  return [...set];
}

export const bankSize = (section: SectionId): number | null => BANKS[section]?.length ?? null;

interface BuildOptions {
  subtypes?: string[];
  /** Ids answered before – unseen bank questions are preferred. */
  seenIds?: Set<string>;
  seed?: number;
}

export function buildQuestions(section: SectionId, count: number, opts: BuildOptions = {}): Question[] {
  const rng = createRng(opts.seed ?? randomSeed());
  const filterOk = (q: Question) => !opts.subtypes?.length || opts.subtypes.includes(q.subtype);
  const gen = GENERATORS[section];
  if (gen) {
    const out: Question[] = [];
    const runId = Math.floor(rng() * 1e9).toString(36);
    for (let i = 0; out.length < count && i < count * 60; i++) {
      const q = gen(rng, `${section}-${runId}-${i}`);
      if (filterOk(q)) out.push(q);
    }
    return out;
  }
  const bank = (BANKS[section] ?? []).filter(filterOk);
  const seen = opts.seenIds ?? new Set<string>();
  // Unseen first (shuffled), then seen (shuffled) – maximises exposure to new items.
  const ordered = [...shuffle(rng, bank.filter((q) => !seen.has(q.id))), ...shuffle(rng, bank.filter((q) => seen.has(q.id)))];
  const picked = ordered.slice(0, count);
  // Keep reading-comprehension questions of the same passage adjacent.
  return picked.sort((a, b) => Number(Boolean(a.passage)) - Number(Boolean(b.passage)) || (a.passage ?? '').localeCompare(b.passage ?? ''));
}

export const seenIdsFrom = (attempts: Attempt[]): Set<string> => new Set(attempts.flatMap((a) => a.answers.map((x) => x.questionId)));

export function practicePlan(section: SectionId, count: number, subtypes: string[], attempts: Attempt[], timed: boolean): QuizPlan {
  const meta = SECTION_BY_ID[section];
  return {
    mode: 'practice',
    title: `תרגול – ${meta.title}`,
    immediateFeedback: true,
    blocks: [{
      section, title: meta.title,
      timeLimitSec: timed ? Math.round(count * meta.targetSecPerQuestion) : undefined,
      questions: buildQuestions(section, count, { subtypes, seenIds: seenIdsFrom(attempts) }),
    }],
  };
}

export function simulationPlan(simId: string, attempts: Attempt[]): QuizPlan | null {
  const sim = SIMULATIONS.find((s) => s.id === simId);
  if (!sim) return null;
  const seen = seenIdsFrom(attempts);
  return {
    mode: 'simulation',
    title: sim.title,
    simulationId: sim.id,
    immediateFeedback: false,
    blocks: sim.blocks.map<QuizBlock>((b) => ({
      section: b.section,
      title: SECTION_BY_ID[b.section].title,
      timeLimitSec: b.timeLimitSec,
      questions: buildQuestions(b.section, b.count, { seenIds: seen }),
    })),
  };
}

/**
 * Adaptive focus session: allocate questions proportionally to each
 * subtype's weakness score, so the worst topics get the most reps while
 * strong topics still get occasional maintenance questions.
 */
export function focusPlan(attempts: Attempt[], total = 20): QuizPlan {
  const stats = subtypeStats(attempts).filter((s) => s.total >= 2).sort((a, b) => b.weakness - a.weakness).slice(0, 6);
  const seen = seenIdsFrom(attempts);
  const blocks: QuizBlock[] = [];
  if (stats.length === 0) {
    // Cold start: a balanced sampler across sections.
    for (const s of ['analogies', 'numberSeries', 'figures', 'math', 'instructions'] as SectionId[])
      blocks.push({ section: s, title: SECTION_BY_ID[s].title, questions: buildQuestions(s, 4, { seenIds: seen }) });
  } else {
    const sum = stats.reduce((acc, s) => acc + s.weakness, 0);
    for (const s of stats) {
      const n = Math.max(2, Math.round((s.weakness / sum) * total));
      const qs = buildQuestions(s.section, n, { subtypes: [s.subtype], seenIds: seen });
      if (qs.length) blocks.push({ section: s.section, title: `${SECTION_BY_ID[s.section].title} – ${s.subtype}`, questions: qs });
    }
  }
  return { mode: 'focus', title: 'תרגול ממוקד חולשות', immediateFeedback: true, blocks };
}

export function mistakesPlan(questions: Question[]): QuizPlan {
  return {
    mode: 'mistakes',
    title: 'חזרה על טעויות',
    immediateFeedback: true,
    blocks: [{ section: questions[0]?.section ?? 'analogies', title: 'מחברת טעויות', questions }],
  };
}
