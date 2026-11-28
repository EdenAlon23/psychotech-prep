// Validates every generator & bank: expected choice count, unique choices, valid key, no NaN/undefined.
// Exits non-zero on any bad question so CI blocks a broken deploy.
import { buildQuestions } from '../src/services/questionEngine';
import { SECTIONS } from '../src/data/sections';
import type { SectionId } from '../src/models/question';

/** Data Sufficiency always uses the five standard GMAT answer statements; everything else has 4 options. */
const CHOICES: Partial<Record<SectionId, number>> = { dataSufficiency: 5 };

let bad = 0; let n = 0;
for (const s of SECTIONS) {
  const expected = CHOICES[s.id] ?? 4;
  const qs = buildQuestions(s.id, s.id==='hebrew'||s.id==='analogies'||s.id==='logic' ? 500 : 3000, { seed: 7 });
  for (const q of qs) {
    n++;
    const keys = q.choices.map(c => c.text ?? JSON.stringify(c.figure));
    const problems: string[] = [];
    if (q.choices.length !== expected) problems.push(`len ${q.choices.length} (expected ${expected})`);
    if (new Set(keys).size !== keys.length) problems.push('dup');
    if (q.answerIndex < 0 || q.answerIndex >= q.choices.length) problems.push('key');
    const blob = JSON.stringify(q);
    if (/NaN|undefined|Infinity/.test(blob)) problems.push('nan');
    if (problems.length) { bad++; if (bad < 15) console.log(s.id, q.subtype, problems, q.prompt.slice(0,80), keys); }
  }
  console.log(s.id, qs.length);
}
console.log('checked', n, 'bad', bad);
if (bad > 0) process.exit(1);
