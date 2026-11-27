import assert from 'node:assert/strict';
import { EXAMS } from '../src/data/exams';
import { buildQuestions } from '../src/services/questionEngine';
import { estimateScore, pCorrect, sectionAbility, targetDifficulty, todaysPlan, type Profile } from '../src/services/profile';
import type { Attempt, AnswerRecord } from '../src/models/attempt';

const ans = (correct: boolean, difficulty: number, section: AnswerRecord['section'] = 'math'): AnswerRecord =>
  ({ questionId: Math.random().toString(36), section, subtype: 'x', difficulty, chosenIndex: correct ? 0 : 1, correct, timeMs: 1000 });
const attempt = (answers: AnswerRecord[]): Attempt =>
  ({ id: 'a', mode: 'practice', title: 't', startedAt: 0, finishedAt: 1, answers, sectionResults: [], questions: [] });

// Ability rises with correct hard answers and falls with wrong easy ones.
const strong = sectionAbility([attempt(Array.from({ length: 30 }, () => ans(true, 3)))], 'math', 2).ability;
const weak = sectionAbility([attempt(Array.from({ length: 30 }, () => ans(false, 1)))], 'math', 2).ability;
assert.ok(strong > 2.8, `strong=${strong}`);
assert.ok(weak < 1.2, `weak=${weak}`);
assert.equal(targetDifficulty(strong), 3);
assert.equal(targetDifficulty(weak), 1);
assert.ok(pCorrect(2, 1) > pCorrect(2, 3));

// Adaptive generation actually returns mostly on-target difficulty.
for (const d of [1, 2, 3] as const) {
  const qs = buildQuestions('math', 20, { difficulty: d, seed: 7 });
  assert.equal(qs.length, 20);
  const near = qs.filter((q) => Math.abs(q.difficulty - d) <= 1).length;
  assert.ok(near === 20, `difficulty ${d}: ${near}/20 within ±1`);
}

// Score estimate stays in the exam's range and needs evidence first.
for (const exam of EXAMS) {
  assert.equal(estimateScore(exam, [], 2), null);
  const many = attempt(exam.sections.flatMap((s) => Array.from({ length: 10 }, (_, i) => ans(i % 3 !== 0, 2, s.section))));
  const e = estimateScore(exam, [many], 2)!;
  assert.ok(e.value >= exam.score.min && e.value <= exam.score.max, `${exam.id}: ${e.value}`);
}

// Plan: minutes split over the exam's sections; taper near the test.
const profile: Profile = { examId: 'psychometric', testDate: '2027-01-10', target: 650, minutesPerDay: 40, level: 2, createdAt: 0 };
const exam = EXAMS.find((e) => e.id === 'psychometric')!;
const p = todaysPlan(exam, [], profile, new Date('2027-01-04T10:00:00'));
assert.ok(p.items.length > 0 && p.items.every((i) => exam.sections.some((s) => s.section === i.section)));
assert.equal(todaysPlan(exam, [], profile, new Date('2027-01-09T10:00:00')).taper, true);
console.log('adaptive checks passed');
