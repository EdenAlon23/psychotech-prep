import assert from 'node:assert/strict';
import type { QuizPlan } from '../src/models/attempt';
import type { Question } from '../src/models/question';

// Minimal in-memory sessionStorage so the service runs under Node.
const mem = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

const { setActivePlan, saveProgress, loadProgress, clearActivePlan, secondsLeft } = await import('../src/services/session');

const q = (id: string) => ({ id, section: 'math', subtype: 'x', difficulty: 2, prompt: id, choices: ['a', 'b', 'c', 'd'], answerIndex: 0 }) as unknown as Question;
const plan: QuizPlan = {
  mode: 'simulation', title: 't', immediateFeedback: false,
  blocks: [
    { section: 'math', title: 'A', timeLimitSec: 60, questions: [q('a1'), q('a2')] },
    { section: 'math', title: 'B', timeLimitSec: 60, questions: [q('b1')] },
  ],
};

setActivePlan(plan);
assert.equal(loadProgress(plan), null, 'fresh plan has no progress');

const base = {
  version: 1 as const, blockIdx: 1, qIdx: 0, phase: 'running' as const,
  chosen: { a1: 2, b1: 0, ghost: 1 }, revealed: [], flagged: ['a2', 'ghost'], deadline: 123,
  blockResults: [{ section: 'math' as const, total: 2, correct: 1, answered: 2, timeMs: 1, timedOut: false }],
  timesMs: { a1: 500 }, startedAt: 42,
};
saveProgress(base);
const back = loadProgress(plan)!;
assert.equal(back.blockIdx, 1);
assert.deepEqual(back.chosen, { a1: 2, b1: 0 }, 'answers for unknown questions are dropped');
assert.deepEqual(back.flagged, ['a2']);
assert.equal(back.deadline, 123);
assert.equal(back.startedAt, 42);

// Out-of-range indexes (e.g. progress from a different plan) are rejected.
saveProgress({ ...base, blockIdx: 5 });
assert.equal(loadProgress(plan), null);
saveProgress({ ...base, qIdx: 3 });
assert.equal(loadProgress(plan), null);

// Garbage never throws.
mem.set('pp.activeProgress', '{not json');
assert.equal(loadProgress(plan), null);

// Starting a new plan or finishing clears old progress.
saveProgress(base);
setActivePlan(plan);
assert.equal(loadProgress(plan), null, 'new plan resets progress');
saveProgress(base);
clearActivePlan();
assert.equal(loadProgress(plan), null, 'clear removes progress');

// Deadline-based countdown.
assert.equal(secondsLeft(10_000, 0), 10);
assert.equal(secondsLeft(10_000, 9_001), 1);
assert.equal(secondsLeft(10_000, 20_000), 0);

console.log('session tests passed');
