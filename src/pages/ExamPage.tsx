import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EXAMS, EXAM_BY_ID, isExamId, type ExamDef } from '../data/exams';
import { SECTION_BY_ID } from '../data/sections';
import { getProfile } from '../services/profile';
import { sectionText, useT, type Lang } from '../i18n';

/** Per-page <title> and meta description, restored on leave (the app is a single HTML page). */
function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prev = { title: document.title, description: meta?.content ?? '' };
    document.title = title;
    if (meta) meta.content = description;
    return () => {
      document.title = prev.title;
      if (meta) meta.content = prev.description;
    };
  }, [title, description]);
}

/** "ל" + "המבחן…" → "למבחן…" (Hebrew drops the definite article after a prefix). */
const withLe = (name: string) => `ל${name.replace(/^ה(?=מבחן)/, '')}`;

const minutesOf = (e: ExamDef) => Math.round(e.simulation.blocks.reduce((s, b) => s + b.minutes, 0));
const questionsOf = (e: ExamDef) => e.simulation.blocks.reduce((s, b) => s + b.count, 0);

/** `/exams` – the catalogue, one card per exam. */
export function ExamsIndexPage() {
  const { t } = useT();
  usePageMeta(
    t('כל המבחנים · PsychoTech Prep', 'All exams · PsychoTech Prep'),
    t('הכנה חינמית לפסיכוטכני, פסיכומטרי, צו ראשון, מבחני משטרה, SAT ו-GMAT: סימולציות, תרגול מותאם ותוכנית לימוד.', 'Free prep for the SAT, GMAT and Israeli entrance and selection exams: timed practice tests, adaptive practice and a study plan.'),
  );
  return (
    <div className="stack">
      <div className="page-head">
        <h1 className="display">{t('לאיזה מבחן מתכוננים?', 'Which exam are you preparing for?')}</h1>
        <p>{t('לכל מבחן יש מבנה, סימולציה ותוכנית לימוד משלו. בחרו מבחן כדי לראות מה כולל ההכנה.', 'Each exam has its own structure, practice test and study plan. Pick one to see what the prep includes.')}</p>
      </div>
      <div className="exam-grid stagger">
        {EXAMS.map((e) => (
          <Link key={e.id} to={`/exams/${e.id}`} className="exam-card lift" lang={e.lang} dir={e.lang === 'en' ? 'ltr' : 'rtl'}>
            <span className="exam-icon">{e.icon}</span>
            <span className="exam-name">{e.name}</span>
            <span className="exam-org">{e.org}</span>
            <span className="exam-aud">{e.audience}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** `/exams/:id` – a landing page for one exam, written in that exam's language. */
export default function ExamPage() {
  const { id } = useParams();
  const { t: tUi } = useT();
  const exam = isExamId(id) ? EXAM_BY_ID[id] : null;
  const lang: Lang = exam?.lang ?? 'he';
  const t = (he: string, en: string) => (lang === 'en' ? en : he);
  usePageMeta(
    exam ? t(`הכנה ${withLe(exam.name)} · PsychoTech Prep`, `${exam.name} prep · PsychoTech Prep`) : 'PsychoTech Prep',
    exam ? exam.summary : '',
  );

  if (!exam) {
    return (
      <div className="card empty">
        <p>{tUi('המבחן לא נמצא.', 'Exam not found.')}</p>
        <Link className="btn" to="/exams">{tUi('לכל המבחנים', 'All exams')}</Link>
      </div>
    );
  }

  const isCurrent = getProfile()?.examId === exam.id;
  const startTo = isCurrent ? '/' : `/start?exam=${exam.id}`;
  const sections = [...new Set(exam.sections.map((s) => s.section))];
  const perks = [
    t(`סימולציה במבנה ${exam.nameShort}: ${exam.simulation.blocks.length} פרקים, ${questionsOf(exam)} שאלות, ~${minutesOf(exam)} דקות, טיימר לכל פרק`, `A ${exam.nameShort}-style practice test: ${exam.simulation.blocks.length} sections, ${questionsOf(exam)} questions, ~${minutesOf(exam)} minutes, a timer per section`),
    t('תרגול אדפטיבי שמכוון לכ-70% הצלחה ועולה רמה כשמשתפרים', 'Adaptive practice that aims for ~70% success and levels up as you improve'),
    t('תוכנית יומית לפי תאריך המבחן והחולשות שלך', 'A daily plan built from your exam date and weak spots'),
    t(`הערכת ציון בסולם ${exam.score.min}–${exam.score.max}`, `A score estimate on the ${exam.score.min}–${exam.score.max} scale`),
    t('מחברת טעויות וניתוח קצב לכל פרק', 'A mistakes notebook and pace analysis per section'),
  ];
  if (exam.extras.includes('interview')) perks.push(t('הכנה לראיון: שאלות, מה בודקים ותרגול STAR', 'Interview prep'));
  if (exam.extras.includes('personality')) perks.push(t('תרגול שאלון אישיות עם ניתוח עקביות', 'Personality questionnaire practice'));

  return (
    <article className="stack exam-landing" lang={lang} dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <section className="hero rise">
        <span className="orb orb-a" /><span className="orb orb-b" />
        <div className="hero-content">
        <p className="hero-eyebrow">{exam.icon} {exam.org}</p>
        <h1 className="display hero-title">{t(`הכנה ${withLe(exam.name)}`, `${exam.name} prep`)}</h1>
        <p className="hero-sub">{exam.summary}</p>
        <p className="hero-sub small">{t('למי', 'For')}: {exam.audience}</p>
        <div className="row mt">
          <Link className="btn btn-gold btn-lg" to={startTo}>{isCurrent ? t('להמשך ההכנה ←', 'Continue my prep →') : t('להתחיל להתכונן ←', 'Start preparing →')}</Link>
          <Link className="btn btn-ghost-light btn-lg" to="/exams">{t('מבחנים נוספים', 'Other exams')}</Link>
        </div>
        </div>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="display">{t('מבנה המבחן', 'Exam structure')}</h2>
          <ul className="tips">{exam.structure.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="small muted" style={{ marginBottom: 0 }}>ℹ️ {exam.officialHint}</p>
        </section>
        <section className="card">
          <h2 className="display">{t('מה כולל התרגול כאן', "What you get here")}</h2>
          <ul className="tips">{perks.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      </div>

      <section className="card">
        <h2 className="display">{t('הסימולציה', 'The practice test')}: {exam.simulation.title}</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>#</th><th>{t('פרק', 'Section')}</th><th>{t('שאלות', 'Questions')}</th><th>{t('דקות', 'Minutes')}</th></tr></thead>
            <tbody>
              {exam.simulation.blocks.map((b, i) => (
                <tr key={i}>
                  <td className="muted">{i + 1}</td>
                  <td>{SECTION_BY_ID[b.section].icon} {b.label ?? sectionText(SECTION_BY_ID[b.section], lang).title}</td>
                  <td>{b.count}</td>
                  <td>{b.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="display">{t('נושאים לתרגול', 'Practice topics')}</h2>
        <div className="grid grid-3">
          {sections.map((id) => {
            const s = sectionText(SECTION_BY_ID[id], lang);
            return (
              <div key={id} className="card section-card">
                <span className="icon">{SECTION_BY_ID[id].icon}</span>
                <h3 style={{ margin: 0 }}>{s.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{s.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="small muted center">{t('הערכות הציון באתר הן הדרכה בלבד ואינן ציון רשמי. כל השאלות מקוריות.', 'Score estimates on this site are guidance only, not an official score. All questions are original.')}</p>
    </article>
  );
}
