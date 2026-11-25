// Validates every generator & bank: 4 unique choices, valid key, no NaN/undefined.
import { buildQuestions } from '../src/services/questionEngine';
import { SECTIONS } from '../src/data/sections';
let bad = 0; let n = 0;
for (const s of SECTIONS) {
  const qs = buildQuestions(s.id, s.id==='hebrew'||s.id==='analogies'||s.id==='logic' ? 500 : 3000, { seed: 7 });
  for (const q of qs) {
    n++;
    const keys = q.choices.map(c => c.text ?? JSON.stringify(c.figure));
    const problems: string[] = [];
    if (q.choices.length !== 4) problems.push('len ' + q.choices.length);
    if (new Set(keys).size !== keys.length) problems.push('dup');
    if (q.answerIndex < 0 || q.answerIndex >= q.choices.length) problems.push('key');
    const blob = JSON.stringify(q);
    if (/NaN|undefined|Infinity/.test(blob)) problems.push('nan');
    if (problems.length) { bad++; if (bad < 15) console.log(s.id, q.subtype, problems, q.prompt.slice(0,80), keys); }
  }
  console.log(s.id, qs.length);
}
console.log('checked', n, 'bad', bad);
