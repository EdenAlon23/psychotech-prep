import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EXAMS, type ExamId } from '../data/exams';
import { examById, getProfile, saveProfile, type Profile } from '../services/profile';

const PROVIDERS = ['לא ידוע', 'אדם מילוא', 'מכון הדס', 'ענבל', 'המכון לניהול', 'נובה', 'מכון מלם', 'גיוון', 'אחר'];
const LEVELS: { v: 1 | 2 | 3; t: string; d: string }[] = [
  { v: 1, t: 'מתחיל/ה', d: 'עוד לא תרגלתי בכלל' },
  { v: 2, t: 'בינוני', d: 'תרגלתי קצת / מכיר את סוגי השאלות' },
  { v: 3, t: 'מתקדם/ת', d: 'רוצה ללטש ולשפר ציון' },
];

/** 3-step onboarding: exam → goal & date → time & level. Everything after this adapts to the answers. */
export default function StartPage() {
  const nav = useNavigate();
  const prev = getProfile();
  const [step, setStep] = useState(0);
  const [examId, setExamId] = useState<ExamId>(prev?.examId ?? 'psychotech');
  const [testDate, setTestDate] = useState(prev?.testDate ?? '');
  const [target, setTarget] = useState<string>(prev?.target?.toString() ?? '');
  const [minutes, setMinutes] = useState(prev?.minutesPerDay ?? 30);
  const [level, setLevel] = useState<1 | 2 | 3>(prev?.level ?? 2);
  const [employer, setEmployer] = useState(prev?.employer ?? '');
  const [provider, setProvider] = useState(prev?.provider ?? 'לא ידוע');
  const exam = examById(examId);
  const en = exam.lang === 'en';

  const finish = () => {
    const t = Number(target);
    const p: Profile = {
      examId, testDate, minutesPerDay: minutes, level,
      target: target && Number.isFinite(t) ? Math.min(exam.score.max, Math.max(exam.score.min, t)) : null,
      employer: exam.asksEmployer ? employer.trim().slice(0, 80) || undefined : undefined,
      provider: exam.asksEmployer && provider !== 'לא ידוע' ? provider : undefined,
      createdAt: prev?.createdAt ?? Date.now(),
    };
    saveProfile(p);
    nav('/');
  };

  return (
    <div className="onboard">
      <div className="steps" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
      </div>

      {step === 0 && (
        <section key="s0" className="page-enter">
          <p className="eyebrow">שלב 1 מתוך 3</p>
          <h1 className="display">לאיזה מבחן מתכוננים?</h1>
          <p className="muted">המערכת תתאים את הנושאים, הסימולציות, תוכנית הלימוד והערכת הציון למבחן שתבחרו.</p>
          <div className="exam-grid stagger">
            {EXAMS.map((e) => (
              <button key={e.id} className={`exam-card ${examId === e.id ? 'selected' : ''}`} onClick={() => { setExamId(e.id); setTarget(''); }} aria-pressed={examId === e.id}>
                <span className="exam-icon">{e.icon}</span>
                <span className="exam-name">{e.nameShort}</span>
                <span className="exam-org">{e.org}</span>
                <span className="exam-aud">{e.audience}</span>
              </button>
            ))}
          </div>
          <div className="row mt"><button className="btn btn-lg" onClick={() => setStep(1)}>המשך ←</button></div>
        </section>
      )}

      {step === 1 && (
        <section key="s1" className="page-enter">
          <p className="eyebrow">שלב 2 מתוך 3 · {exam.icon} {exam.nameShort}</p>
          <h1 className="display">מתי המבחן ומה המטרה?</h1>
          <div className="card form-card stagger">
            <label className="field-label">תאריך המבחן <span className="muted small">(אם ידוע)</span>
              <input className="input" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </label>
            <label className="field-label">{en ? 'Target score' : 'ציון יעד'} <span className="muted small">({exam.score.label}: {exam.score.min}–{exam.score.max})</span>
              <input className="input" type="number" inputMode="numeric" min={exam.score.min} max={exam.score.max} step={exam.score.step} value={target} onChange={(e) => setTarget(e.target.value)} placeholder={String(Math.round((exam.score.min + exam.score.max) * 0.6 / exam.score.step) * exam.score.step)} />
            </label>
            {exam.asksEmployer && (
              <>
                <label className="field-label">לאיזו חברה / תפקיד המיון?
                  <input className="input" value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="למשל: בנק, חברת הייטק, שירות המדינה" />
                </label>
                <label className="field-label">איזה מכון מאבחן?
                  <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
          <details className="card mt exam-info">
            <summary>מה יש במבחן הזה?</summary>
            <p className="muted">{exam.summary}</p>
            <ul>{exam.structure.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="small muted">{exam.officialHint}</p>
          </details>
          <div className="row mt">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>→ חזרה</button>
            <button className="btn btn-lg" onClick={() => setStep(2)}>המשך ←</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section key="s2" className="page-enter">
          <p className="eyebrow">שלב 3 מתוך 3</p>
          <h1 className="display">כמה זמן ביום, ומאיפה מתחילים?</h1>
          <div className="card form-card">
            <label className="field-label">דקות תרגול ביום: <b className="gold">{minutes}</b>
              <input type="range" min={10} max={120} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </label>
            <div className="level-grid stagger">
              {LEVELS.map((l) => (
                <button key={l.v} className={`level-card ${level === l.v ? 'selected' : ''}`} onClick={() => setLevel(l.v)} aria-pressed={level === l.v}>
                  <b>{l.t}</b><span className="small muted">{l.d}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="row mt">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>→ חזרה</button>
            <button className="btn btn-lg btn-gold" onClick={finish}>בניית התוכנית שלי ✦</button>
          </div>
        </section>
      )}
    </div>
  );
}
