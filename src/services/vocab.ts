import type { AnswerRecord, QuizPlan } from '../models/attempt';
import type { Question } from '../models/question';
import type { VocabCardState, VocabCategory, VocabEntry, VocabProgress, VocabStatus } from '../models/vocab';
import { hebrewQuestions } from '../data/hebrew';
import { VOCAB, vocabQuestions } from '../data/vocabulary';
import { createRng, randomSeed, shuffle } from '../utils/random';
import { getVocabProgress, saveVocabProgress } from './storage';

/**
 * Spaced repetition (Leitner system). Why Leitner and not SM-2: five fixed
 * boxes are easy to reason about, need no per-card ease factor, and are
 * plenty for a few-days-to-few-weeks exam horizon.
 *
 * box 0 = new or forgotten (due immediately)
 * box 1..4 = due after 1 / 3 / 7 / 16 days.  box >= 3 counts as "known".
 */
const DAY = 86_400_000;
const INTERVAL_MS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];
export const MAX_BOX = INTERVAL_MS.length - 1;
const KNOWN_BOX = 3;

const EMPTY: VocabCardState = { box: 0, due: 0, reviews: 0, lapses: 0 };

export function statusOf(state: VocabCardState | undefined): VocabStatus {
  if (!state || state.reviews === 0) return 'new';
  return state.box >= KNOWN_BOX ? 'known' : 'learning';
}

/** Missed in a quiz (or forgotten on a card) and not re-learned yet. */
export const isMissed = (state: VocabCardState | undefined): boolean => Boolean(state?.missedAt) && (state?.box ?? 0) < KNOWN_BOX;

export const isDue = (state: VocabCardState | undefined, now: number): boolean =>
  Boolean(state && state.reviews > 0 && state.due <= now);

/** Pure transition: returns the new state for one review. */
export function nextState(prev: VocabCardState | undefined, knew: boolean, now: number): VocabCardState {
  const s = prev ?? EMPTY;
  if (!knew) return { box: 0, due: now, reviews: s.reviews + 1, lapses: s.lapses + 1, missedAt: now };
  const box = Math.min(s.box + 1, MAX_BOX);
  return { ...s, box, due: now + INTERVAL_MS[box], reviews: s.reviews + 1, missedAt: box >= KNOWN_BOX ? undefined : s.missedAt };
}

export function recordReview(entryId: string, knew: boolean, now = Date.now()): VocabProgress {
  const p = getVocabProgress();
  const updated = { ...p, [entryId]: nextState(p[entryId], knew, now) };
  saveVocabProgress(updated);
  return updated;
}

/** "I already know this" from the reading list: jump straight to the known box. */
export function setKnown(entryId: string, known: boolean, now = Date.now()): VocabProgress {
  const p = getVocabProgress();
  const prev = p[entryId] ?? EMPTY;
  const state: VocabCardState = known
    ? { ...prev, box: KNOWN_BOX, due: now + INTERVAL_MS[KNOWN_BOX], reviews: prev.reviews + 1, missedAt: undefined }
    : { ...prev, box: 0, due: now, reviews: Math.max(prev.reviews, 1) };
  const updated = { ...p, [entryId]: state };
  saveVocabProgress(updated);
  return updated;
}

// ---------- Link to the quiz engine ----------
const entryByQuestionId = new Map(VOCAB.filter((e) => e.questionId).map((e) => [e.questionId!, e]));
const questionById = new Map<string, Question>([...hebrewQuestions, ...vocabQuestions].map((q) => [q.id, q]));

export const entryForQuestion = (questionId: string): VocabEntry | undefined => entryByQuestionId.get(questionId);

/**
 * Called when a quiz ends: a wrong answer on a glossary-linked question sends
 * that entry back to box 0 and flags it, so the next flashcard session starts
 * with exactly the words that cost points.
 */
export function applyQuizAnswers(answers: AnswerRecord[], now = Date.now()): number {
  const p = getVocabProgress();
  let touched = 0;
  for (const a of answers) {
    const entry = entryByQuestionId.get(a.questionId);
    if (!entry || a.chosenIndex < 0) continue;
    p[entry.id] = nextState(p[entry.id], a.correct, now);
    touched++;
  }
  if (touched) saveVocabProgress(p);
  return touched;
}

// ---------- Deck & quiz building ----------
export interface DeckOptions {
  categories: VocabCategory[];
  /** 'smart' = missed → due → new; 'missed' = only missed; 'all' = everything shuffled. */
  source: 'smart' | 'missed' | 'all';
  size: number;
}

export function buildDeck(progress: VocabProgress, opts: DeckOptions, now = Date.now()): VocabEntry[] {
  const rng = createRng(randomSeed());
  const pool = VOCAB.filter((e) => opts.categories.length === 0 || opts.categories.includes(e.category));
  if (opts.source === 'all') return shuffle(rng, pool).slice(0, opts.size);
  const missed = shuffle(rng, pool.filter((e) => isMissed(progress[e.id])));
  if (opts.source === 'missed') return missed.slice(0, opts.size);
  const missedIds = new Set(missed.map((e) => e.id));
  const due = shuffle(rng, pool.filter((e) => !missedIds.has(e.id) && isDue(progress[e.id], now)));
  // New cards: easiest first, so the first session builds momentum.
  const fresh = shuffle(rng, pool.filter((e) => statusOf(progress[e.id]) === 'new')).sort((a, b) => a.level - b.level);
  return [...missed, ...due, ...fresh].slice(0, opts.size);
}

export function vocabQuizPlan(entries: VocabEntry[], title = 'בוחן אוצר מילים'): QuizPlan {
  const questions = entries.map((e) => (e.questionId ? questionById.get(e.questionId) : undefined)).filter((q): q is Question => q !== undefined);
  return {
    mode: 'practice',
    title,
    immediateFeedback: true,
    blocks: [{ section: 'hebrew', title: 'אוצר מילים', questions: shuffle(createRng(randomSeed()), questions) }],
  };
}

export interface VocabSummary {
  total: number;
  known: number;
  learning: number;
  fresh: number;
  due: number;
  missed: number;
}

export function summarize(progress: VocabProgress, entries: VocabEntry[] = VOCAB, now = Date.now()): VocabSummary {
  const s: VocabSummary = { total: entries.length, known: 0, learning: 0, fresh: 0, due: 0, missed: 0 };
  for (const e of entries) {
    const st = progress[e.id];
    const status = statusOf(st);
    if (status === 'known') s.known++;
    else if (status === 'learning') s.learning++;
    else s.fresh++;
    if (isMissed(st)) s.missed++;
    else if (isDue(st, now)) s.due++;
  }
  return s;
}
