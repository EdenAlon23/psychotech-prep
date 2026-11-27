import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accuracyColor } from '../components/Charts';
import { SECTIONS } from '../data/sections';
import { attemptScore, practiceDays, recommendations, sectionStats } from '../services/analytics';
import { focusPlan, practicePlan, simulationPlan } from '../services/questionEngine';
import { setActivePlan } from '../services/session';
import { getAttempts, getMistakes, getSettings } from '../services/storage';
import type { QuizPlan } from '../models/attempt';
import { DeveloperCard } from '../components/DeveloperCard';

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const target = targetIso ? new Date(`${targetIso}T08:00:00`).getTime() : 0;
  const diff = Math.max(0, target - now);
  return { days: Math.floor(diff / 86_400_000), hours: Math.floor((diff % 86_400_000) / 3_600_000), past: target < now };
}

export default function HomePage() {
  const navigate = useNavigate();
  const attempts = useMemo(() => getAttempts(), []);
  const settings = useMemo(() => getSettings(), []);
  const stats = useMemo(() => sectionStats(attempts), [attempts]);
  const recs = useMemo(() => recommendations(attempts), [attempts]);
  const mistakes = useMemo(() => getMistakes().length, []);
  const countdown = useCountdown(settings.examDate);
  const totalAnswers = attempts.reduce((s, a) => s + a.answers.length, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.answers.filter((x) => x.correct).length, 0);

  const start = (plan: QuizPlan) => {
    setActivePlan(plan);
    navigate('/quiz');
  };

  return (
    <div className="grid" style={{ gap: '1.25rem' }}>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <div className="hero-eyebrow">PSYCHOTECH PREP · FREE PRACTICE</div>
            <h1>הכנה למבחנים הפסיכוטכניים {settings.name ? `· ${settings.name}` : ''}</h1>
            <p>לצו ראשון (דפ"ר), למבחני המיון של משטרת ישראל ולכל מבחן פסיכוטכני ממוחשב: סימולציות מלאות עם זמן, תרגול לפי נושאים, מעקב התקדמות ותרגול ממוקד לפי החולשות שלך. חינם.</p>
            <div className="row mt">
              <button className="btn" onClick={() => { const p = simulationPlan('full', attempts); if (p) start(p); }}>▶ סימולציה מלאה</button>
              <button className="btn btn-ghost" onClick={() => start(focusPlan(attempts))}>🎯 תרגול ממוקד</button>
            </div>
            <div className="row mt">
              {settings.examDate ? (
                countdown.past ? (
                  <span className="small">יום המבחן הגיע – בהצלחה! · <Link to="/settings" style={{ color: '#fff' }}>שינוי תאריך</Link></span>
                ) : (
                  <>
                    <span className="small" style={{ opacity: 0.85 }}>עד המבחן:</span>
                    <div className="countdown">
                      <div><b>{countdown.days}</b>ימים</div>
                      <div><b>{countdown.hours}</b>שעות</div>
                    </div>
                    <Link to="/settings" className="small" style={{ color: '#fff', opacity: 0.8 }}>שינוי</Link>
                  </>
                )
              ) : (
                <Link to="/settings" className="small" style={{ color: '#fff', opacity: 0.85 }}>📅 הגדר תאריך מבחן לספירה לאחור</Link>
              )}
            </div>
          </div>
          <DeveloperCard />
        </div>
      </section>

      <section className="grid grid-4">
        <div className="card stat"><span className="value">{totalAnswers}</span><span className="label">שאלות שנפתרו</span></div>
        <div className="card stat"><span className="value">{totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0}%</span><span className="label">דיוק כללי</span></div>
        <div className="card stat"><span className="value">{practiceDays(attempts)}</span><span className="label">ימי תרגול</span></div>
        <Link to="/mistakes" className="card stat" style={{ color: 'inherit' }}><span className="value">{mistakes}</span><span className="label">במחברת הטעויות ←</span></Link>
      </section>

      <section className="card">
        <h2>💡 המלצות עבורך</h2>
        <ul className="list-clean">
          {recs.map((r) => (
            <li key={r.text} className="row spread">
              <span>{r.text}</span>
              {r.section && (
                <button className="btn btn-sm btn-ghost" onClick={() => start(practicePlan(r.section!, 10, r.subtype ? [r.subtype] : [], attempts, false))}>
                  תרגל
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="row spread mb">
          <h2 style={{ margin: 0 }}>נושאי המבחן</h2>
          <Link to="/practice">לכל אפשרויות התרגול ←</Link>
        </div>
        <div className="grid grid-3">
          {SECTIONS.map((s) => {
            const st = stats[s.id];
            return (
              <div key={s.id} className="card section-card">
                <div className="row spread">
                  <span className="icon">{s.icon}</span>
                  {st.total > 0 ? <span className="chip" style={{ color: accuracyColor(st.accuracy) }}>{Math.round(st.accuracy * 100)}% · {st.total} ש'</span> : <span className="chip">טרם תורגל</span>}
                </div>
                <h3 style={{ margin: 0 }}>{s.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{s.description}</p>
                <div className="progress"><span style={{ width: `${st.accuracy * 100}%`, background: accuracyColor(st.accuracy) }} /></div>
                <button className="btn btn-sm" onClick={() => start(practicePlan(s.id, 10, [], attempts, false))}>תרגול מהיר (10)</button>
              </div>
            );
          })}
          <Link to="/vocab" className="card section-card" style={{ color: 'inherit' }}>
            <span className="icon">📚</span>
            <h3 style={{ margin: 0 }}>אוצר מילים לעברית</h3>
            <p className="small muted" style={{ margin: 0 }}>דף לימוד להדפסה, כרטיסיות עם חזרה מרווחת ובוחן. מילים שטעית בהן חוזרות אוטומטית.</p>
          </Link>
          <Link to="/interview" className="card section-card" style={{ color: 'inherit' }}>
            <span className="icon">🗣️</span>
            <h3 style={{ margin: 0 }}>ראיון עם מאבחנת</h3>
            <p className="small muted" style={{ margin: 0 }}>בנק שאלות, מה בודקים בכל שאלה, תרגול תשובות STAR ובנק סיפורים.</p>
          </Link>
          <Link to="/personality" className="card section-card" style={{ color: 'inherit' }}>
            <span className="icon">🧠</span>
            <h3 style={{ margin: 0 }}>שאלון אישיות</h3>
            <p className="small muted" style={{ margin: 0 }}>תרגול השאלון + ניתוח עקביות ופריטי "רצייה חברתית".</p>
          </Link>
        </div>
      </section>

      {attempts.length > 0 && (
        <section className="card">
          <div className="row spread"><h2 style={{ margin: 0 }}>פעילות אחרונה</h2><Link to="/analytics">לניתוח המלא ←</Link></div>
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
