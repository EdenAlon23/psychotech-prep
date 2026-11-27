import assert from 'node:assert/strict';
import { generateQuantEn } from '../src/generators/quantEn';
import { generateDataSufficiency } from '../src/generators/dataSufficiency';
import { englishQuestions } from '../src/data/english';
import { EXAMS } from '../src/data/exams';
import { SECTION_BY_ID } from '../src/data/sections';
import { createRng } from '../src/utils/random';

// Every generated question: valid key, 4–5 distinct choices, finite numbers.
for (const [name, gen] of [['quantEn', generateQuantEn], ['dataSufficiency', generateDataSufficiency]] as const) {
  const rng = createRng(7);
  for (let i = 0; i < 2000; i++) {
    const q = gen(rng, `${name}-${i}`);
    assert.ok(q.answerIndex >= 0 && q.answerIndex < q.choices.length, `${name} key out of range`);
    const texts = q.choices.map((c) => c.text);
    assert.equal(new Set(texts).size, texts.length, `${name} duplicate choices: ${q.prompt} ${texts}`);
    assert.ok(!texts.some((t) => /NaN|Infinity|undefined/.test(t ?? '')), `${name} bad number: ${texts}`);
    assert.equal(q.dir, 'ltr');
  }
}
for (const q of englishQuestions) assert.equal(new Set(q.choices.map((c) => c.text)).size, 4, `duplicate in ${q.id}`);
// Every exam only references sections that exist, and its simulation fits its sections.
for (const e of EXAMS) {
  for (const s of e.sections) assert.ok(SECTION_BY_ID[s.section], `${e.id}: unknown section ${s.section}`);
  for (const b of e.simulation.blocks) assert.ok(e.sections.some((s) => s.section === b.section), `${e.id}: simulation uses ${b.section}`);
  assert.ok(e.score.max > e.score.min);
}
console.log(`content checks passed (${englishQuestions.length} English items, ${EXAMS.length} exams)`);
