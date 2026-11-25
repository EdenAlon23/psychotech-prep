import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SECTION_BY_ID, SIMULATIONS } from '../data/sections';
import { attemptScore } from '../services/analytics';
import { simulationPlan } from '../services/questionEngine';
import { setActivePlan } from '../services/session';
import { getAttempts } from '../services/storage';

export default function SimulationsPage() {
  const navigate = useNavigate();
  const attempts = useMemo(() => getAttempts(), []);

  const start = (id: string) => {
    const plan = simulationPlan(id, attempts);
    if (!plan) return;
    setActivePlan(plan);
    navigate('/quiz');
  };

  return (
    <div>
      <div className="page-head">
        <h1>סימולציות</h1>
        <p>מבנה כמו במכון המיון: כל פרק עם זמן נפרד, בלי משוב עד הסוף. בכל סימולציה השאלות חדשות.</p>
      </div>
      <div className="grid grid-2">
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
      </div>
      <div className="card mt">
        <h3>טיפים לסימולציה</h3>
        <ul className="tips">
          <li>עשו אותה בתנאי מבחן: שקט, בלי טלפון, דף טיוטה ועט.</li>
          <li>לא להיתקע: שאלה שלוקחת יותר מפי 2 מהזמן הממוצע – לסמן 🚩, לנחש ולהמשיך.</li>
          <li>אחרי הסימולציה – עברו על כל הטעויות. הן נשמרות אוטומטית במחברת הטעויות.</li>
        </ul>
      </div>
    </div>
  );
}
