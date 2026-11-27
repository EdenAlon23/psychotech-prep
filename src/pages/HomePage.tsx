import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { accuracyColor } from '../components/Charts';
import { SECTION_BY_ID } from '../data/sections';
import { attemptScore, practiceDays, recommendations, sectionStats } from '../services/analytics';
import { examSimulationPlan, focusPlan, practicePlan } from '../services/questionEngine';
import { launchPlan } from '../services/launcher';
import { getAttempts, getMistakes } from '../services/storage';
import { estimateScore, examById, examSections, getProfile, sectionAbility, todaysPlan } from '../services/profile';
import type { QuizPlan } from '../models/attempt';

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  return now;
}

const LEVEL_NAME = ['', 'בסיס', 'בינוני', 'מתקדם'];

export default function HomePage() {
  const navigate = useNavigate();
  const profile = useMemo(() => getProfile(), []);
  const attempts = useMemo(() => getAttempts(), []);
  const stats = useMemo(() => sectionStats(attempts), [attempts]);
  const recs = useMemo(() => recommendations(attempts), [attempts]);
  const mistakes = useMemo(() => getMistakes().length, []);
  const now = useNow();

  if (!profile) return <Navigate to="/start" replace />;
  const exam = examById(profile.examId);
  const sections = examSections(exam);
  const plan = todaysPlan(exam, attempts, profile, new Date(now));
  const estimate = estimateScore(exam, attempts, profile.level);
  const totalAnswers = attempts.reduce((s, a) => s + a.answers.length, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.answers.filter((x) => x.correct).length, 0);
  const start = (p: QuizPlan) => launchPlan(p, navigate);
  const examRecs = recs.filter((r) => !r.section || sections.includes(r.section));

  return (
    <div className="stack">
      {/* Hero */}
      <section className="hero rise">
        <span className="orb orb-a" /><span className="orb orb-b" />
        <div className="hero-grid">
          <div>
            <p className="hero-eyebrow">{exam.icon} {exam.name}</p>
            <h1 className="display hero-title">התוכנית שלך<br /><span className="gold-text">למבחן {exam.nameShort}</span></h1>
            <p className="hero-sub">{exam.summary}</p>
            <div className="row mt">
              <button className="btn btn-gold btn-lg" onClick={() => start(examSimulationPlan(exam, attempts))}>▶ סימולציה מלאה</button>
              <button className="btn btn-ghost-light btn-lg" onClick={() => start(focusPlan(attempts))}>🎯 תרגול ממוקד</button>
            </div>
          </div>
          <div className="hero-side stagger">
            {plan.daysLeft !== null && plan.daysLeft >= 0 ? (
              <div className="glass-tile"><span className="tile-num">{plan.daysLeft}</span><span className="tile-lbl">ימים למבחן</span></div>
            ) : (
              <Link to="/start" className="glass-tile"><span className="tile-num">📅</span><span className="tile-lbl">הגדרת תאריך מבחן</span></Link>
            )}
            <div className="glass-tile">
              <span className="tile-num">{estimate ? estimate.value : '—'}</span>
              <span className="tile-lbl">{estimate ? `${exam.score.label}${estimate.confidence === 'low' ? ' · ראשונית' : ''}` : 'הערכת ציון אחרי 10 שאלות'}</span>
              {profile.target && <span className="tile-sub">יעד: {profile.target}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Today's plan */}
      <section className="card rise rise-1">
        <div className="row spread">
          <h2 className="display" style={{ margin: 0 }}>{plan.taper ? 'יומיים למבחן: חזרה קלה ומנוחה' : plan.simulationDay ? 'היום: סימולציה מלאה' : 'התוכנית להיום'}</h2>
          <span className="chip">{profile.minutesPerDay} דק׳ ביום</span>
        </div>
        {plan.simulationDay && (
          <div className="row spread mt featured card" style={{ padding: '.9rem 1rem' }}><p className="muted" style={{ margin: 0 }}>פעם בשבוע סימולציה בתנאי אמת, כדי למדוד התקדמות ולהתרגל ללחץ הזמן. אין זמן? התרגולים למטה.</p>
            <button className="btn btn-gold" onClick={() => start(examSimulationPlan(exam, attempts))}>סימולציה ▶</button></div>
        )}
        {(
          <ul className="plan-list stagger">
            {plan.items.map((it) => {
              const meta = SECTION_BY_ID[it.section];
              const ab = sectionAbility(attempts, it.section, profile.level).ability;
              return (
                <li key={it.section}>
                  <span className="plan-icon">{meta.icon}</span>
                  <div className="grow">
                    <b>{meta.title}</b>
                    <span className="small muted"> · {it.count} שאלות · ~{it.minutes} דק׳ · רמה {LEVEL_NAME[Math.round(Math.min(3, Math.max(1, ab)))]}</span>
                    {it.reason === 'נקודת חולשה' && <span className="chip warn small-chip">נקודת חולשה</span>}
                  </div>
                  <button className="btn btn-sm" onClick={() => start(practicePlan(it.section, it.count, [], attempts, false))}>התחל</button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small muted" style={{ marginTop: '.75rem', marginBottom: 0 }}>רמת הקושי מותאמת אליך: המערכת מכוונת לכ-70% הצלחה, ועולה רמה כשמשתפרים.</p>
      </section>

      {/* Stats */}
      <section className="grid grid-4 stagger">
        <div className="card stat"><span className="value">{totalAnswers}</span><span className="label">שאלות שנפתרו</span></div>
        <div className="card stat"><span className="value">{totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0}%</span><span className="label">דיוק כללי</span></div>
        <div className="card stat"><span className="value">{practiceDays(attempts)}</span><span className="label">ימי תרגול</span></div>
        <Link to="/mistakes" className="card stat" style={{ color: 'inherit' }}><span className="value">{mistakes}</span><span className="label">במחברת הטעויות ←</span></Link>
      </section>

      {examRecs.length > 0 && (
        <section className="card reveal">
          <h2 className="display">💡 המלצות עבורך</h2>
          <ul className="list-clean">
            {examRecs.map((r) => (
              <li key={r.text} className="row spread">
                <span>{r.text}</span>
                {r.section && <button className="btn btn-sm btn-ghost" onClick={() => start(practicePlan(r.section!, 10, r.subtype ? [r.subtype] : [], attempts, false))}>תרגל</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sections of this exam */}
      <section>
        <div className="row spread mb">
          <h2 className="display" style={{ margin: 0 }}>נושאי המבחן</h2>
          <Link to="/practice">לכל אפשרויות התרגול ←</Link>
        </div>
        <div className="grid grid-3">
          {sections.map((id) => {
            const s = SECTION_BY_ID[id];
            const st = stats[id];
            return (
              <div key={id} className="card section-card lift reveal">
                <div className="row spread">
                  <span className="icon">{s.icon}</span>
                  {st && st.total > 0 ? <span className="chip" style={{ color: accuracyColor(st.accuracy) }}>{Math.round(st.accuracy * 100)}% · {st.total} ש'</span> : <span className="chip">טרם תורגל</span>}
                </div>
                <h3 style={{ margin: 0 }}>{s.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{s.description}</p>
                <div className="progress"><span style={{ width: `${(st?.accuracy ?? 0) * 100}%`, background: accuracyColor(st?.accuracy ?? 0) }} /></div>
                <button className="btn btn-sm" onClick={() => start(practicePlan(id, 10, [], attempts, false))}>תרגול מותאם (10)</button>
              </div>
            );
          })}
          {exam.extras.includes('interview') && (
            <Link to="/interview" className="card section-card lift reveal" style={{ color: 'inherit' }}>
              <span className="icon">🗣️</span><h3 style={{ margin: 0 }}>ראיון עם מאבחנת</h3>
              <p className="small muted" style={{ margin: 0 }}>בנק שאלות, מה בודקים בכל שאלה, תרגול תשובות STAR ובנק סיפורים.</p>
            </Link>
          )}
          {exam.extras.includes('personality') && (
            <Link to="/personality" className="card section-card lift reveal" style={{ color: 'inherit' }}>
              <span className="icon">🧠</span><h3 style={{ margin: 0 }}>שאלון אישיות</h3>
              <p className="small muted" style={{ margin: 0 }}>תרגול השאלון + ניתוח עקביות ופריטי "רצייה חברתית".</p>
            </Link>
          )}
        </div>
      </section>

      {attempts.length > 0 && (
        <section className="card reveal">
          <div className="row spread"><h2 className="display" style={{ margin: 0 }}>פעילות אחרונה</h2><Link to="/analytics">לניתוח המלא ←</Link></div>
          <ul className="list-clean">
            {attempts.slice(0, 5).map((a) => (
              <li key={a.id} className="row spread">
                <Link to={`/results/${a.id}`}>{a.title}</Link>
                <span className="row small muted">
                  {new Date(a.finishedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                  <span className="chip" style={{ color: accuracyColor(attemptScore(a) / 100) }}>{attemptScore(a)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
