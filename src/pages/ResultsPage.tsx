import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BarList, Ring } from '../components/Charts';
import { QuestionView } from '../components/QuestionView';
import { SECTION_BY_ID } from '../data/sections';
import type { SectionId } from '../models/question';
import { attemptScore, estimatedLevel } from '../services/analytics';
import { mistakesPlan, practicePlan } from '../services/questionEngine';
import { setActivePlan } from '../services/session';
import { getAttempt, getAttempts } from '../services/storage';
import { entryForQuestion } from '../services/vocab';
import { sectionText, useT } from '../i18n';

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const attempt = useMemo(() => (id ? getAttempt(id) : undefined), [id]);
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong');
  const { t, lang, locale } = useT();
  const sec = (id: SectionId) => sectionText(SECTION_BY_ID[id], lang);

  const analysis = useMemo(() => {
    if (!attempt) return null;
    const bySection = new Map<SectionId, { total: number; correct: number; time: number }>();
    const bySubtype = new Map<string, { total: number; correct: number }>();
    for (const a of attempt.answers) {
      const s = bySection.get(a.section) ?? { total: 0, correct: 0, time: 0 };
      s.total++; s.correct += a.correct ? 1 : 0; s.time += a.timeMs;
      bySection.set(a.section, s);
      const k = `${sectionText(SECTION_BY_ID[a.section], lang).short} · ${a.subtype}`;
      const t = bySubtype.get(k) ?? { total: 0, correct: 0 };
      t.total++; t.correct += a.correct ? 1 : 0;
      bySubtype.set(k, t);
    }
    const weakSubs = [...bySubtype.entries()].filter(([, v]) => v.correct / v.total < 0.6).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
    const strongSubs = [...bySubtype.entries()].filter(([, v]) => v.total >= 2 && v.correct === v.total);
    return { bySection, bySubtype, weakSubs, strongSubs };
  }, [attempt, lang]);

  if (!attempt || !analysis) {
    return <div className="card empty"><p>{t('התוצאה לא נמצאה.', 'Result not found.')}</p><Link className="btn" to="/">{t('לדף הבית', 'Back to home')}</Link></div>;
  }

  const score = attemptScore(attempt);
  const accuracy = score / 100;
  const unanswered = attempt.answers.filter((a) => a.chosenIndex < 0).length;
  const totalTimeMin = Math.round((attempt.finishedAt - attempt.startedAt) / 60000);
  const questionsById = new Map(attempt.questions.map((q) => [q.id, q]));
  const reviewList = attempt.answers.filter((a) => (filter === 'wrong' ? !a.correct : true));
  const wrongQuestions = attempt.answers.filter((a) => !a.correct).map((a) => questionsById.get(a.questionId)).filter((q) => q !== undefined);
  const attempts = getAttempts();
  const missedWords = attempt.answers.filter((a) => !a.correct && entryForQuestion(a.questionId)).length;

  return (
    <div className="grid" style={{ gap: '1.25rem' }}>
      <div className="card">
        <div className="row spread" style={{ alignItems: 'center' }}>
          <div>
            <span className="chip primary">{attempt.mode === 'simulation' ? t('סימולציה', 'Practice test') : attempt.mode === 'focus' ? t('תרגול ממוקד', 'Focused practice') : attempt.mode === 'mistakes' ? t('חזרה על טעויות', 'Mistakes review') : t('תרגול', 'Practice')}</span>
            <h1 className="mt">{attempt.title}</h1>
            <p className="muted">
              {new Date(attempt.finishedAt).toLocaleString(locale)} · {totalTimeMin} {t('דקות', 'min')} · {attempt.answers.length} {t('שאלות', 'questions')}
              {unanswered > 0 && ` · ${unanswered} ${t('ללא מענה', 'unanswered')}`}
            </p>
          </div>
          <div className="row">
            <Ring value={accuracy} size={110} label={t('ציון', 'Score')} />
            {attempt.mode === 'simulation' && (
              <div className="stat center">
                <span className="value">{estimatedLevel(accuracy)}/9</span>
                <span className="label">{t('דרגה משוערת*', 'Estimated level*')}</span>
              </div>
            )}
          </div>
        </div>
        {attempt.mode === 'simulation' && (
          <p className="small muted" style={{ margin: 0 }}>{t('* הערכה גסה בלבד לפי אחוז ההצלחה. מכוני המיון מנרמלים מול אוכלוסיית נבחנים, ולכן זה לא ציון רשמי.', '* A rough estimate from your accuracy only. Official scores are scaled against other test takers, so this is not an official score.')}</p>
        )}
      </div>

      {missedWords > 0 && (
        <div className="card row spread prep-cta">
          <div>
            <h3 style={{ margin: 0 }}>📚 {missedWords} מילים וביטויים שטעית בהם נוספו לכרטיסיות</h3>
            <p className="small muted" style={{ margin: 0 }}>שנן אותם עכשיו, כשהטעות עוד טרייה. זה הזמן שבו הזיכרון נבנה הכי טוב.</p>
          </div>
          <Link className="btn btn-sm" to="/vocab?mode=cards&focus=missed">לחזרה על המילים</Link>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h2>{t('לפי פרק', 'By section')}</h2>
          <BarList
            rows={[...analysis.bySection.entries()].map(([s, v]) => ({
              label: sec(s).short, value: v.correct / v.total,
              hint: `${v.correct}/${v.total} · ${Math.round(v.time / v.total / 1000)}${t(" שנ' לשאלה", 's per question')}`,
            }))}
          />
          <table className="mt">
            <thead><tr><th>{t('פרק', 'Section')}</th><th>{t('נכונות', 'Correct')}</th><th>{t('זמן ממוצע', 'Avg time')}</th><th>{t('יעד', 'Target')}</th></tr></thead>
            <tbody>
              {[...analysis.bySection.entries()].map(([s, v]) => {
                const avg = Math.round(v.time / v.total / 1000);
                const target = SECTION_BY_ID[s].targetSecPerQuestion;
                return (
                  <tr key={s}>
                    <td>{sec(s).title}</td>
                    <td>{v.correct}/{v.total}</td>
                    <td><span className={`chip ${avg > target * 1.3 ? 'warn' : 'good'}`}>{avg}{t(" שנ'", 's')}</span></td>
                    <td className="muted">{target}{t(" שנ'", 's')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>{t('משוב', 'Feedback')}</h2>
          {analysis.weakSubs.length > 0 ? (
            <>
              <h3>{t('🔻 לחיזוק', '🔻 To strengthen')}</h3>
              <ul className="list-clean">
                {analysis.weakSubs.slice(0, 6).map(([k, v]) => {
                  const [short, sub] = k.split(' · ');
                  const section = Object.values(SECTION_BY_ID).find((m) => sectionText(m, lang).short === short)!;
                  return (
                    <li key={k} className="row spread">
                      <span>{k} <span className="muted small">({v.correct}/{v.total})</span></span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setActivePlan(practicePlan(section.id, 10, [sub], attempts, false)); navigate('/quiz'); }}>{t('תרגל', 'Practice')}</button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : <p>{t('✨ אין תת-נושא עם פחות מ-60% הצלחה. מעולה!', '✨ No topic below 60% accuracy. Great work!')}</p>}
          {analysis.strongSubs.length > 0 && (
            <>
              <h3 className="mt">{t('✅ חזק', '✅ Strong')}</h3>
              <div className="row">{analysis.strongSubs.map(([k]) => <span key={k} className="chip good">{k}</span>)}</div>
            </>
          )}
          {unanswered > 0 && <p className="mt">{t(`⏱ נשארו ${unanswered} שאלות ללא מענה – עבדו על קצב: לנחש ולהמשיך במקום להיתקע.`, `⏱ ${unanswered} questions left unanswered – work on pace: guess and move on instead of getting stuck.`)}</p>}
          <div className="row mt">
            {wrongQuestions.length > 0 && (
              <button className="btn" onClick={() => { setActivePlan(mistakesPlan(wrongQuestions)); navigate('/quiz'); }}>
                {t('פתור שוב את הטעויות', 'Retry the mistakes')} ({wrongQuestions.length})
              </button>
            )}
            <Link className="btn btn-ghost" to="/analytics">{t('ניתוח מצטבר', 'Overall analytics')}</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>{t('סקירת שאלות', 'Question review')}</h2>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={filter === 'wrong' ? 'active' : ''} onClick={() => setFilter('wrong')}>{t('טעויות בלבד', 'Mistakes only')}</button>
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('הכול', 'All')}</button>
          </div>
        </div>
        {attempt.questions.length === 0 && <p className="muted">{t('פרטי השאלות של ניסיון ישן זה כבר לא שמורים.', 'Question details for this older attempt are no longer stored.')}</p>}
        {reviewList.length === 0 && attempt.questions.length > 0 && <p className="mt">{t('אין טעויות להציג 🎉', 'No mistakes to show 🎉')}</p>}
        {reviewList.map((a, i) => {
          const q = questionsById.get(a.questionId);
          if (!q) return null;
          return (
            <div key={a.questionId} className="mt" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div className="row small muted mb">
                <span>#{i + 1}</span><span className="chip">{sec(q.section).short} · {q.subtype}</span>
                <span>{Math.round(a.timeMs / 1000)}{t(" שנ'", 's')}</span>
              </div>
              <QuestionView question={q} selected={a.chosenIndex} reveal />
            </div>
          );
        })}
      </div>
    </div>
  );
}
