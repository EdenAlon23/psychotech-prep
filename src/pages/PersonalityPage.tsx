import { useMemo, useState } from 'react';
import { LIKERT, personalityItems } from '../data/personality';
import { getPersonalityRuns, savePersonalityRun } from '../services/storage';
import { createRng, randomSeed, shuffle } from '../utils/random';

interface Analysis {
  inconsistencies: { a: string; b: string; diff: number }[];
  lieFlags: string[];
  extremeRate: number;
  traits: { trait: string; score: number }[];
}

/** Map a raw 1–5 answer onto the trait direction. */
const traitValue = (v: number, reversed?: boolean) => (reversed ? 6 - v : v);

function analyse(answers: Record<string, number>): Analysis {
  const byPair = new Map<string, typeof personalityItems>();
  for (const it of personalityItems) if (it.pairId) byPair.set(it.pairId, [...(byPair.get(it.pairId) ?? []), it]);
  const inconsistencies: Analysis['inconsistencies'] = [];
  for (const items of byPair.values()) {
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]; const b = items[j];
        if (answers[a.id] && answers[b.id]) {
          const diff = Math.abs(traitValue(answers[a.id], a.reversed) - traitValue(answers[b.id], b.reversed));
          if (diff >= 2) inconsistencies.push({ a: a.text, b: b.text, diff });
        }
      }
  }
  const lieFlags = personalityItems.filter((it) => it.lieScale && answers[it.id] >= 4).map((it) => it.text);
  const vals = Object.values(answers);
  const extremeRate = vals.length ? vals.filter((v) => v === 1 || v === 5).length / vals.length : 0;
  const traitMap = new Map<string, number[]>();
  for (const it of personalityItems) {
    if (it.lieScale || !answers[it.id]) continue;
    traitMap.set(it.trait, [...(traitMap.get(it.trait) ?? []), traitValue(answers[it.id], it.reversed)]);
  }
  const traits = [...traitMap.entries()].map(([trait, v]) => ({ trait, score: v.reduce((s, x) => s + x, 0) / v.length }));
  return { inconsistencies, lieFlags, extremeRate, traits };
}

export default function PersonalityPage() {
  const order = useMemo(() => shuffle(createRng(randomSeed()), personalityItems), []);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const runs = useMemo(() => getPersonalityRuns(), [done]);
  const answered = Object.keys(answers).length;
  const result = done ? analyse(answers) : null;

  const finish = () => {
    savePersonalityRun({ at: Date.now(), answers });
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="page-head">
        <h1>🧠 שאלון אישיות – תרגול</h1>
        <p>אין תשובות נכונות. מה שנבדק בפועל: <b>עקביות</b> בין שאלות שמנוסחות אחרת אבל שואלות אותו דבר, ותשובות "מושלמות מדי" (סולם רצייה חברתית). התרגול עוזר להכיר את הפורמט ולראות איפה אתה לא עקבי.</p>
      </div>

      {result && (
        <div className="grid grid-2 mb">
          <div className="card">
            <h2>ניתוח עקביות</h2>
            {result.inconsistencies.length === 0 ? (
              <p className="chip good">✓ התשובות עקביות</p>
            ) : (
              <>
                <p>נמצאו {result.inconsistencies.length} זוגות לא עקביים. חשוב: לא "לתקן" כדי להיראות טוב – אלא לחשוב מה באמת נכון לגביך, ולענות על זה בשתי הניסוחים.</p>
                <ul className="list-clean small">
                  {result.inconsistencies.map((x) => <li key={x.a + x.b}>"{x.a}" ↔ "{x.b}"</li>)}
                </ul>
              </>
            )}
            <h3 className="mt">רצייה חברתית</h3>
            {result.lieFlags.length === 0 ? (
              <p className="chip good">✓ לא נמצאו תשובות "מושלמות מדי"</p>
            ) : (
              <>
                <p>הסכמת עם {result.lieFlags.length} היגדים שכמעט אף אדם לא באמת יכול להסכים איתם. מאבחנים מפרשים דפוס כזה כניסיון להציג תמונה מיופה – וזה פוגע באמינות כל השאלון.</p>
                <ul className="list-clean small">{result.lieFlags.map((t) => <li key={t}>"{t}"</li>)}</ul>
              </>
            )}
            <h3 className="mt">תשובות קיצוניות</h3>
            <p>{Math.round(result.extremeRate * 100)}% מהתשובות בקצוות (1 או 5). {result.extremeRate > 0.6 ? 'שיעור גבוה – נסו להשתמש בכל הסקאלה כשזה מתאים.' : 'תקין.'}</p>
          </div>
          <div className="card">
            <h2>פרופיל (לעיונך בלבד)</h2>
            {result.traits.map((t) => (
              <div className="bar-row" key={t.trait}>
                <span>{t.trait}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${((t.score - 1) / 4) * 100}%`, background: 'var(--primary)' }} /></div>
                <strong className="small">{t.score.toFixed(1)}</strong>
              </div>
            ))}
            <p className="small muted mt">זה לא כלי אבחוני – רק משקף את מה שענית. במבחן האמיתי: לענות בכנות, מהר יחסית (רושם ראשון), ובעקביות.</p>
            <button className="btn mt" onClick={() => { setAnswers({}); setDone(false); }}>מילוי חוזר</button>
            {runs.length > 1 && <p className="small muted">מילאת את השאלון {runs.length} פעמים.</p>}
          </div>
        </div>
      )}

      {!done && (
        <>
          <div className="card mb row spread">
            <span>ענית על {answered}/{order.length}</span>
            <div className="progress" style={{ flex: 1, minWidth: 120 }}><span style={{ width: `${(answered / order.length) * 100}%` }} /></div>
          </div>
          <div className="grid">
            {order.map((it, i) => (
              <div className="card" key={it.id}>
                <p><b>{i + 1}.</b> {it.text}</p>
                <div className="likert">
                  {LIKERT.map((label, v) => (
                    <button key={label} className={answers[it.id] === v + 1 ? 'selected' : ''} onClick={() => setAnswers((a) => ({ ...a, [it.id]: v + 1 }))}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-block mt" disabled={answered < order.length} onClick={finish}>
            {answered < order.length ? `נותרו ${order.length - answered} שאלות` : 'סיים וקבל ניתוח'}
          </button>
        </>
      )}
    </div>
  );
}
