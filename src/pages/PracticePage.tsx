import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { SectionId } from '../models/question';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { subtypeStats } from '../services/analytics';
import { bankSize, focusPlan, isGenerated, practicePlan, subtypesOf } from '../services/questionEngine';
import { launchPlan } from '../services/launcher';
import { getAttempts } from '../services/storage';
import { accuracyColor } from '../components/Charts';
import { currentExam, examSections } from '../services/profile';
import { getVocabProgress } from '../services/storage';
import { summarize } from '../services/vocab';
import { sectionText, useT } from '../i18n';

export default function PracticePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attempts = useMemo(() => getAttempts(), []);
  const allowed = useMemo(() => examSections(currentExam()), []);
  const section = (params.get('s') as SectionId | null) ?? allowed[0] ?? 'analogies';
  const { t, lang } = useT();
  const base = SECTION_BY_ID[section] ?? SECTIONS[0];
  const meta = { ...base, ...sectionText(base, lang) };
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
    launchPlan(practicePlan(meta.id, count, selected, attempts, timed), navigate);
  };

  return (
    <div>
      <div className="page-head">
        <h1>{t('תרגול לפי נושאים', 'Practice by topic')}</h1>
        <p>{t('בחר נושא ותת-נושא. בתרגול מקבלים משוב והסבר מיד אחרי כל שאלה.', 'Pick a section and topics. Practice gives feedback and an explanation right after each question.')}</p>
      </div>

      <div className="card mb row spread">
        <div>
          <h3 style={{ margin: 0 }}>{t('🎯 תרגול ממוקד חולשות', '🎯 Weak-spot practice')}</h3>
          <p className="small muted" style={{ margin: 0 }}>{t('המערכת בוחרת שאלות לפי תתי-הנושאים שבהם הדיוק והקצב שלך הכי חלשים.', 'Questions are picked from the topics where your accuracy and pace are weakest.')}</p>
        </div>
        <button className="btn" onClick={() => launchPlan(focusPlan(attempts), navigate)}>{t('התחל (20 שאלות)', 'Start (20 questions)')}</button>
      </div>

      <div className="tabs">
        {SECTIONS.filter((s) => allowed.includes(s.id)).map((s) => (
          <button key={s.id} className={s.id === meta.id ? 'active' : ''} onClick={() => choose(s.id)}>
            {s.icon} {sectionText(s, lang).short}
          </button>
        ))}
      </div>

      {meta.id === 'hebrew' && <VocabCta />}

      <div className="grid grid-2">
        <div className="card">
          <h2>{meta.icon} {meta.title}</h2>
          <p className="muted">{meta.description}</p>
          <p className="small muted">
            {isGenerated(meta.id) ? t('♾️ שאלות שנוצרות אוטומטית – מספר בלתי מוגבל של וריאציות.', '♾️ Generated questions – unlimited variations.') : t(`📚 מאגר של ${bankSize(meta.id)} שאלות מקוריות (קודם כל שאלות שעוד לא ראית).`, `📚 A bank of ${bankSize(meta.id)} original questions (unseen ones first).`)}
          </p>
          <h3>{t('תתי-נושאים', 'Topics')} <span className="small muted">{t('(ללא בחירה = הכול)', '(none selected = all)')}</span></h3>
          <div className="row mb">
            {subtypes.map((st) => {
              const s = stByKey.get(`${meta.id}|${st}`);
              return (
                <button key={st} className={`chip${selected.includes(st) ? ' selected' : ''}`} onClick={() => toggle(st)} title={s ? `${s.total} ${t('שאלות', 'questions')}` : t('טרם תורגל', 'not practiced')}>
                  {st}
                  {s && <span style={{ color: selected.includes(st) ? '#fff' : accuracyColor(s.accuracy) }}>· {Math.round(s.accuracy * 100)}%</span>}
                </button>
              );
            })}
          </div>
          <div className="row mb">
            <label htmlFor="cnt">{t('מספר שאלות', 'Questions')}</label>
            <select id="cnt" value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 100 }}>
              {[5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label className="row" style={{ fontWeight: 600 }}>
              <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> {t(`עם טיימר (~${meta.targetSecPerQuestion} שנ' לשאלה)`, `Timed (~${meta.targetSecPerQuestion}s per question)`)}
            </label>
          </div>
          <button className="btn btn-block" onClick={start}>{t('התחל תרגול ▶', 'Start practice ▶')}</button>
        </div>
        <div className="card">
          <h3>{t('📌 איך לפתור', '📌 How to solve')}</h3>
          <ul className="tips">{meta.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

/** Shown before Hebrew practice: read the glossary first, then answer. */
function VocabCta() {
  const s = useMemo(() => summarize(getVocabProgress()), []);
  const toReview = s.missed + s.due;
  return (
    <div className="card mb row spread prep-cta">
      <div>
        <h3 style={{ margin: 0 }}>📚 לפני שעונים: עבור על אוצר המילים</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {s.total} מילים, ביטויים ומילות קישור מתוך השאלות · {s.known} ידועים
          {toReview > 0 ? ` · ${toReview} לחזרה היום` : ''}
        </p>
      </div>
      <div className="row">
        <Link className="btn btn-ghost btn-sm" to="/vocab?mode=read">דף לימוד</Link>
        <Link className="btn btn-sm" to="/vocab?mode=cards">{toReview > 0 ? `חזרה (${toReview})` : 'כרטיסיות'}</Link>
      </div>
    </div>
  );
}
