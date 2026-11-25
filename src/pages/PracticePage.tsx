import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SectionId } from '../models/question';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { subtypeStats } from '../services/analytics';
import { bankSize, focusPlan, isGenerated, practicePlan, subtypesOf } from '../services/questionEngine';
import { setActivePlan } from '../services/session';
import { getAttempts } from '../services/storage';
import { accuracyColor } from '../components/Charts';

export default function PracticePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attempts = useMemo(() => getAttempts(), []);
  const section = (params.get('s') as SectionId | null) ?? 'analogies';
  const meta = SECTION_BY_ID[section] ?? SECTIONS[0];
  const subtypes = useMemo(() => subtypesOf(meta.id), [meta.id]);
  const stByKey = useMemo(() => new Map(subtypeStats(attempts).map((s) => [`${s.section}|${s.subtype}`, s])), [attempts]);
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(false);

  const choose = (id: SectionId) => {
    setParams({ s: id });
    setSelected([]);
  };
  const toggle = (st: string) => setSelected((s) => (s.includes(st) ? s.filter((x) => x !== st) : [...s, st]));

  const start = () => {
    setActivePlan(practicePlan(meta.id, count, selected, attempts, timed));
    navigate('/quiz');
  };

  return (
    <div>
      <div className="page-head">
        <h1>תרגול לפי נושאים</h1>
        <p>בחר נושא ותת-נושא. בתרגול מקבלים משוב והסבר מיד אחרי כל שאלה.</p>
      </div>

      <div className="card mb row spread">
        <div>
          <h3 style={{ margin: 0 }}>🎯 תרגול ממוקד חולשות</h3>
          <p className="small muted" style={{ margin: 0 }}>המערכת בוחרת שאלות לפי תתי-הנושאים שבהם הדיוק והקצב שלך הכי חלשים.</p>
        </div>
        <button className="btn" onClick={() => { setActivePlan(focusPlan(attempts)); navigate('/quiz'); }}>התחל (20 שאלות)</button>
      </div>

      <div className="tabs">
        {SECTIONS.map((s) => (
          <button key={s.id} className={s.id === meta.id ? 'active' : ''} onClick={() => choose(s.id)}>
            {s.icon} {s.short}
          </button>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>{meta.icon} {meta.title}</h2>
          <p className="muted">{meta.description}</p>
          <p className="small muted">
            {isGenerated(meta.id) ? '♾️ שאלות שנוצרות אוטומטית – מספר בלתי מוגבל של וריאציות.' : `📚 מאגר של ${bankSize(meta.id)} שאלות מקוריות (קודם כל שאלות שעוד לא ראית).`}
          </p>
          <h3>תתי-נושאים <span className="small muted">(ללא בחירה = הכול)</span></h3>
          <div className="row mb">
            {subtypes.map((st) => {
              const s = stByKey.get(`${meta.id}|${st}`);
              return (
                <button key={st} className={`chip${selected.includes(st) ? ' selected' : ''}`} onClick={() => toggle(st)} title={s ? `${s.total} שאלות` : 'טרם תורגל'}>
                  {st}
                  {s && <span style={{ color: selected.includes(st) ? '#fff' : accuracyColor(s.accuracy) }}>· {Math.round(s.accuracy * 100)}%</span>}
                </button>
              );
            })}
          </div>
          <div className="row mb">
            <label htmlFor="cnt">מספר שאלות</label>
            <select id="cnt" value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 100 }}>
              {[5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label className="row" style={{ fontWeight: 600 }}>
              <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> עם טיימר (~{meta.targetSecPerQuestion} שנ' לשאלה)
            </label>
          </div>
          <button className="btn btn-block" onClick={start}>התחל תרגול ▶</button>
        </div>
        <div className="card">
          <h3>📌 איך לפתור</h3>
          <ul className="tips">{meta.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
