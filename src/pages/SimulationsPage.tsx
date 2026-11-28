import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SECTION_BY_ID, SIMULATIONS } from '../data/sections';
import { attemptScore } from '../services/analytics';
import { examSimulationPlan, simulationPlan } from '../services/questionEngine';
import { currentExam } from '../services/profile';
import { checkAccess } from '../services/entitlements';
import { launchPlan } from '../services/launcher';
import { getAttempts } from '../services/storage';
import { useT } from '../i18n';

export default function SimulationsPage() {
  const navigate = useNavigate();
  const attempts = useMemo(() => getAttempts(), []);
  const { t } = useT();

  const start = (id: string) => {
    const plan = simulationPlan(id, attempts);
    if (!plan) return;
    launchPlan(plan, navigate);
  };

  return (
    <div>
      <div className="page-head">
        <h1>{t('סימולציות', 'Practice tests')}</h1>
        <p>{t('מבנה כמו במבחן האמיתי: כל פרק עם זמן נפרד, בלי משוב עד הסוף. בכל סימולציה השאלות חדשות.', 'Built like the real exam: each section has its own timer and there is no feedback until the end. Every test uses new questions.')}</p>
      </div>
      {(() => {
        const exam = currentExam();
        const mine = attempts.filter((a) => a.simulationId === `exam:${exam.id}`);
        const totalMin = exam.simulation.blocks.reduce((s, b) => s + b.minutes, 0);
        const totalQ = exam.simulation.blocks.reduce((s, b) => s + b.count, 0);
        return (
          <div className="card section-card featured mb rise">
            <div className="row spread"><h2 className="display" style={{ margin: 0 }}>{exam.icon} {exam.simulation.title}</h2>
              {mine.length > 0 && <span className="chip good">{t('שיא', 'Best')}: {Math.max(...mine.map(attemptScore))}%</span>}
              {!checkAccess('simulation_all', 0).allowed && <span className="chip warn">{t(`🔒 במנוי ${exam.nameShort}`, `🔒 ${exam.nameShort} pass`)}</span>}</div>
            <p className="muted" style={{ margin: 0 }}>{t(`במבנה של ${exam.name}: כל פרק עם זמן משלו, בלי משוב עד הסוף.`, `Structured like the ${exam.name}: each section timed separately, no feedback until the end.`)}</p>
            <div className="row"><span className="chip">⏱ {Math.round(totalMin)} {t("דק'", 'min')}</span><span className="chip">{totalQ} {t('שאלות', 'questions')}</span><span className="chip">{exam.simulation.blocks.length} {t('פרקים', 'sections')}</span></div>
            <div className="row"><button className="btn btn-gold" onClick={() => launchPlan(examSimulationPlan(exam, attempts), navigate)}>{t('התחלה ▶', 'Start ▶')}</button>
              {mine[0] && <Link className="btn btn-ghost" to={`/results/${mine[0].id}`}>{t('תוצאה אחרונה', 'Last result')}</Link>}</div>
          </div>
        );
      })()}
      {['psychotech', 'tzav', 'police'].includes(currentExam().id) && <div className="grid grid-2">
        {SIMULATIONS.map((sim) => {
          const mine = attempts.filter((a) => a.simulationId === sim.id);
          const best = mine.length ? Math.max(...mine.map(attemptScore)) : null;
          const totalMin = Math.round(sim.blocks.reduce((s, b) => s + b.timeLimitSec, 0) / 60);
          const totalQ = sim.blocks.reduce((s, b) => s + b.count, 0);
          return (
            <div key={sim.id} className="card section-card">
              <div className="row spread">
                <h2 style={{ margin: 0 }}>{sim.title}</h2>
                {best !== null && <span className="chip good">שיא: {best}%</span>}
                {!checkAccess(sim.id === 'short' ? 'simulation_short' : 'simulation_all', 0).allowed && <span className="chip warn">🔒 במנוי</span>}
              </div>
              <p className="muted" style={{ margin: 0 }}>{sim.description}</p>
              <div className="row">
                <span className="chip">⏱ {totalMin} דק'</span>
                <span className="chip">{totalQ} שאלות</span>
                <span className="chip">{sim.blocks.length} פרקים</span>
                {mine.length > 0 && <span className="chip">בוצעה {mine.length} פעמים</span>}
              </div>
              <ol className="small muted" style={{ margin: 0, paddingInlineStart: '1.2rem' }}>
                {sim.blocks.map((b) => (
                  <li key={b.section}>{SECTION_BY_ID[b.section].title} – {b.count} שאלות, {Math.round(b.timeLimitSec / 60 * 10) / 10} דק'</li>
                ))}
              </ol>
              <div className="row">
                <button className="btn" onClick={() => start(sim.id)}>התחל ▶</button>
                {mine[0] && <Link className="btn btn-ghost" to={`/results/${mine[0].id}`}>תוצאה אחרונה</Link>}
              </div>
            </div>
          );
        })}
      </div>}
      <div className="card mt">
        <h3>{t('טיפים לסימולציה', 'Test-day tips')}</h3>
        <ul className="tips">
          <li>{t('עשו אותה בתנאי מבחן: שקט, בלי טלפון, דף טיוטה ועט.', 'Take it under exam conditions: quiet room, no phone, scratch paper and a pen.')}</li>
          <li>{t('לא להיתקע: שאלה שלוקחת יותר מפי 2 מהזמן הממוצע – לסמן 🚩, לנחש ולהמשיך.', "Don't get stuck: if a question takes twice the average time, flag it 🚩, guess and move on.")}</li>
          <li>{t('אחרי הסימולציה – עברו על כל הטעויות. הן נשמרות אוטומטית במחברת הטעויות.', 'Afterwards, review every mistake. They are saved to the mistakes notebook automatically.')}</li>
        </ul>
      </div>
    </div>
  );
}
