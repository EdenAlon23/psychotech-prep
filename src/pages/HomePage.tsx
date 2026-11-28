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
import { DeveloperCard } from '../components/DeveloperCard';
import { sectionText, useT } from '../i18n';

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  return now;
}

const LEVEL_NAME = { he: ['', 'בסיס', 'בינוני', 'מתקדם'], en: ['', 'basic', 'medium', 'advanced'] };

export default function HomePage() {
  const navigate = useNavigate();
  const profile = useMemo(() => getProfile(), []);
  const attempts = useMemo(() => getAttempts(), []);
  const stats = useMemo(() => sectionStats(attempts), [attempts]);
  const recs = useMemo(() => recommendations(attempts), [attempts]);
  const mistakes = useMemo(() => getMistakes().length, []);
  const now = useNow();
  const { t, lang, locale } = useT();

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
            <h1 className="display hero-title">{t('התוכנית שלך', 'Your study plan')}<br /><span className="gold-text">{t(`למבחן ${exam.nameShort}`, `for the ${exam.nameShort}`)}</span></h1>
            <p className="hero-sub">{exam.summary}</p>
            <div className="row mt">
              <button className="btn btn-gold btn-lg" onClick={() => start(examSimulationPlan(exam, attempts))}>{t('▶ סימולציה מלאה', '▶ Full practice test')}</button>
              <button className="btn btn-ghost-light btn-lg" onClick={() => start(focusPlan(attempts))}>{t('🎯 תרגול ממוקד', '🎯 Focused practice')}</button>
            </div>
          </div>
          <div className="hero-side stagger">
            {plan.daysLeft !== null && plan.daysLeft >= 0 ? (
              <div className="glass-tile"><span className="tile-num">{plan.daysLeft}</span><span className="tile-lbl">{t('ימים למבחן', 'days to the exam')}</span></div>
            ) : (
              <Link to="/start" className="glass-tile"><span className="tile-num">📅</span><span className="tile-lbl">{t('הגדרת תאריך מבחן', 'Set your exam date')}</span></Link>
            )}
            <div className="glass-tile">
              <span className="tile-num">{estimate ? estimate.value : '—'}</span>
              <span className="tile-lbl">{estimate ? `${exam.score.label}${estimate.confidence === 'low' ? t(' · ראשונית', ' · early') : ''}` : t('הערכת ציון אחרי 10 שאלות', 'Score estimate after 10 questions')}</span>
              {profile.target && <span className="tile-sub">{t('יעד', 'Target')}: {profile.target}</span>}
            </div>
          </div>
        </div>
        <div className="hero-credit"><DeveloperCard /></div>
      </section>

      {/* Today's plan */}
      <section className="card rise rise-1">
        <div className="row spread">
          <h2 className="display" style={{ margin: 0 }}>{plan.taper ? t('יומיים למבחן: חזרה קלה ומנוחה', 'Two days to go: light review and rest') : plan.simulationDay ? t('היום: סימולציה מלאה', 'Today: full practice test') : t('התוכנית להיום', "Today's plan")}</h2>
          <span className="chip">{profile.minutesPerDay} {t('דק׳ ביום', 'min / day')}</span>
        </div>
        {plan.simulationDay && (
          <div className="row spread mt featured card" style={{ padding: '.9rem 1rem' }}><p className="muted" style={{ margin: 0 }}>{t('פעם בשבוע סימולציה בתנאי אמת, כדי למדוד התקדמות ולהתרגל ללחץ הזמן. אין זמן? התרגולים למטה.', 'Once a week, a timed test under real conditions to measure progress and get used to the clock. No time? Use the drills below.')}</p>
            <button className="btn btn-gold" onClick={() => start(examSimulationPlan(exam, attempts))}>{t('סימולציה ▶', 'Start test ▶')}</button></div>
        )}
        {(
          <ul className="plan-list stagger">
            {plan.items.map((it) => {
              const meta = { ...SECTION_BY_ID[it.section], ...sectionText(SECTION_BY_ID[it.section], lang) };
              const ab = sectionAbility(attempts, it.section, profile.level).ability;
              return (
                <li key={it.section}>
                  <span className="plan-icon">{meta.icon}</span>
                  <div className="grow">
                    <b>{meta.title}</b>
                    <span className="small muted"> · {it.count} {t('שאלות', 'questions')} · ~{it.minutes} {t('דק׳', 'min')} · {t('רמה', 'level')} {LEVEL_NAME[lang][Math.round(Math.min(3, Math.max(1, ab)))]}</span>
                    {it.reason === 'נקודת חולשה' && <span className="chip warn small-chip">{t('נקודת חולשה', 'weak spot')}</span>}
                  </div>
                  <button className="btn btn-sm" onClick={() => start(practicePlan(it.section, it.count, [], attempts, false))}>{t('התחל', 'Start')}</button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small muted" style={{ marginTop: '.75rem', marginBottom: 0 }}>{t('רמת הקושי מותאמת אליך: המערכת מכוונת לכ-70% הצלחה, ועולה רמה כשמשתפרים.', 'Difficulty adapts to you: it aims for about 70% success and steps up as you improve.')}</p>
      </section>

      {/* Stats */}
      <section className="grid grid-4 stagger">
        <div className="card stat"><span className="value">{totalAnswers}</span><span className="label">{t('שאלות שנפתרו', 'questions answered')}</span></div>
        <div className="card stat"><span className="value">{totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0}%</span><span className="label">{t('דיוק כללי', 'overall accuracy')}</span></div>
        <div className="card stat"><span className="value">{practiceDays(attempts)}</span><span className="label">{t('ימי תרגול', 'practice days')}</span></div>
        <Link to="/mistakes" className="card stat" style={{ color: 'inherit' }}><span className="value">{mistakes}</span><span className="label">{t('במחברת הטעויות ←', 'in the mistakes notebook →')}</span></Link>
      </section>

      {examRecs.length > 0 && (
        <section className="card reveal">
          <h2 className="display">{t('💡 המלצות עבורך', '💡 Recommended for you')}</h2>
          <ul className="list-clean">
            {examRecs.map((r) => (
              <li key={r.text} className="row spread">
                <span>{r.text}</span>
                {r.section && <button className="btn btn-sm btn-ghost" onClick={() => start(practicePlan(r.section!, 10, r.subtype ? [r.subtype] : [], attempts, false))}>{t('תרגל', 'Practice')}</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sections of this exam */}
      <section>
        <div className="row spread mb">
          <h2 className="display" style={{ margin: 0 }}>{t('נושאי המבחן', 'Exam sections')}</h2>
          <Link to="/practice">{t('לכל אפשרויות התרגול ←', 'All practice options →')}</Link>
        </div>
        <div className="grid grid-3">
          {sections.map((id) => {
            const s = { ...SECTION_BY_ID[id], ...sectionText(SECTION_BY_ID[id], lang) };
            const st = stats[id];
            return (
              <div key={id} className="card section-card lift reveal">
                <div className="row spread">
                  <span className="icon">{s.icon}</span>
                  {st && st.total > 0 ? <span className="chip" style={{ color: accuracyColor(st.accuracy) }}>{Math.round(st.accuracy * 100)}% · {st.total} {t("ש'", 'q')}</span> : <span className="chip">{t('טרם תורגל', 'not practiced')}</span>}
                </div>
                <h3 style={{ margin: 0 }}>{s.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{s.description}</p>
                <div className="progress"><span style={{ width: `${(st?.accuracy ?? 0) * 100}%`, background: accuracyColor(st?.accuracy ?? 0) }} /></div>
                <button className="btn btn-sm" onClick={() => start(practicePlan(id, 10, [], attempts, false))}>{t('תרגול מותאם (10)', 'Adaptive practice (10)')}</button>
              </div>
            );
          })}
          {sections.includes('hebrew') && (
            <Link to="/vocab" className="card section-card lift reveal" style={{ color: 'inherit' }}>
              <span className="icon">📚</span><h3 style={{ margin: 0 }}>אוצר מילים לעברית</h3>
              <p className="small muted" style={{ margin: 0 }}>דף לימוד להדפסה, כרטיסיות עם חזרה מרווחת ובוחן. מילים שטעית בהן חוזרות אוטומטית.</p>
            </Link>
          )}
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
          <div className="row spread"><h2 className="display" style={{ margin: 0 }}>{t('פעילות אחרונה', 'Recent activity')}</h2><Link to="/analytics">{t('לניתוח המלא ←', 'Full analytics →')}</Link></div>
          <ul className="list-clean">
            {attempts.slice(0, 5).map((a) => (
              <li key={a.id} className="row spread">
                <Link to={`/results/${a.id}`}>{a.title}</Link>
                <span className="row small muted">
                  {new Date(a.finishedAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
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
