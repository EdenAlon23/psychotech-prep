import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accuracyColor, BarList, LineChart } from '../components/Charts';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { attemptScore, estimatedLevel, sectionStats, simulationHistory, subtypeStats } from '../services/analytics';
import { practicePlan } from '../services/questionEngine';
import { setActivePlan } from '../services/session';
import { getAttempts } from '../services/storage';
import { sectionText, useT } from '../i18n';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const attempts = useMemo(() => getAttempts(), []);
  const { t, lang, locale } = useT();
  const stats = useMemo(() => sectionStats(attempts), [attempts]);
  const subs = useMemo(() => subtypeStats(attempts).sort((a, b) => b.weakness - a.weakness), [attempts]);
  const history = useMemo(() => simulationHistory(attempts), [attempts]);
  const allHistory = useMemo(
    () => [...attempts].sort((a, b) => a.finishedAt - b.finishedAt).slice(-20).map((a) => ({
      label: new Date(a.finishedAt).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' }), value: attemptScore(a),
    })),
    [attempts, locale],
  );

  if (attempts.length === 0) {
    return (
      <div className="card empty">
        <h2>{t('עוד אין נתונים', 'No data yet')}</h2>
        <p>{t('בצע תרגול או סימולציה – והניתוח יופיע כאן.', 'Do some practice or a practice test and your analytics will appear here.')}</p>
        <Link className="btn" to="/simulations">{t('לסימולציות', 'Practice tests')}</Link>
      </div>
    );
  }

  const practiced = SECTIONS.filter((s) => stats[s.id].total > 0).map((s) => ({ ...s, ...sectionText(s, lang) }));
  const totals = practiced.reduce((acc, s) => ({ t: acc.t + stats[s.id].total, c: acc.c + stats[s.id].correct }), { t: 0, c: 0 });
  const overall = totals.t ? totals.c / totals.t : 0;
  const lastSims = history.slice(-3);
  const trend = lastSims.length >= 2 ? lastSims[lastSims.length - 1].score - lastSims[0].score : null;

  return (
    <div className="grid" style={{ gap: '1.25rem' }}>
      <div className="page-head">
        <h1>{t('ניתוח נתונים', 'Analytics')}</h1>
        <p>{t('הניתוח מבוסס על כל השאלות שפתרת. תשובות אחרונות מקבלות משקל גבוה יותר, כדי ששיפור באמת ייראה.', 'Based on every question you have answered. Recent answers weigh more, so real improvement shows up.')}</p>
      </div>

      <div className="grid grid-4">
        <div className="card stat"><span className="value" style={{ color: accuracyColor(overall) }}>{Math.round(overall * 100)}%</span><span className="label">{t('דיוק כללי', 'Overall accuracy')}</span></div>
        <div className="card stat"><span className="value">{estimatedLevel(overall)}/9</span><span className="label">{t('דרגה משוערת (גסה)', 'Estimated level (rough)')}</span></div>
        <div className="card stat"><span className="value">{history.length}</span><span className="label">{t('סימולציות', 'Practice tests')}</span></div>
        <div className="card stat">
          <span className="value" style={{ color: trend === null ? undefined : trend >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {trend === null ? '—' : `${trend > 0 ? '+' : ''}${trend}`}
          </span>
          <span className="label">{t('מגמה (3 סימולציות אחרונות)', 'Trend (last 3 tests)')}</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>{t('ציוני סימולציות', 'Practice test scores')}</h2>
          <LineChart points={history.map((h) => ({ label: new Date(h.at).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' }), value: h.score }))} />
        </div>
        <div className="card">
          <h2>{t('כל התרגולים (20 אחרונים)', 'All sessions (last 20)')}</h2>
          <LineChart points={allHistory} />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>{t('דיוק לפי פרק', 'Accuracy by section')}</h2>
          <BarList rows={practiced.map((s) => ({ label: s.short, value: stats[s.id].accuracy, hint: `${stats[s.id].correct}/${stats[s.id].total}` }))} />
        </div>
        <div className="card">
          <h2>{t('קצב לפי פרק', 'Pace by section')}</h2>
          <table>
            <thead><tr><th>{t('פרק', 'Section')}</th><th>{t('ממוצע', 'Average')}</th><th>{t('יעד', 'Target')}</th><th>{t('שאלות', 'Questions')}</th></tr></thead>
            <tbody>
              {practiced.map((s) => {
                const avg = stats[s.id].avgTimeSec;
                return (
                  <tr key={s.id}>
                    <td>{s.icon} {s.short}</td>
                    <td><span className={`chip ${avg > s.targetSecPerQuestion * 1.3 ? 'warn' : 'good'}`}>{Math.round(avg)}{t(" שנ'", 's')}</span></td>
                    <td className="muted">{s.targetSecPerQuestion}{t(" שנ'", 's')}</td>
                    <td>{stats[s.id].total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>{t('תתי-נושאים – מהחלש לחזק', 'Topics – weakest first')}</h2>
        <p className="small muted">{t('מדד החולשה משלב שיעור טעויות (מוחלק, עם משקל לתשובות אחרונות) וקצב איטי מהיעד.', 'The weakness score combines your (smoothed, recency-weighted) error rate with pace slower than target.')}</p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>{t('פרק', 'Section')}</th><th>{t('תת-נושא', 'Topic')}</th><th>{t('דיוק', 'Accuracy')}</th><th>{t('שאלות', 'Questions')}</th><th>{t('זמן ממוצע', 'Avg time')}</th><th>{t('מדד חולשה', 'Weakness')}</th><th /></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={`${s.section}|${s.subtype}`}>
                  <td>{sectionText(SECTION_BY_ID[s.section], lang).short}</td>
                  <td>{s.subtype}</td>
                  <td style={{ color: accuracyColor(s.accuracy), fontWeight: 700 }}>{Math.round(s.accuracy * 100)}%</td>
                  <td>{s.total}</td>
                  <td>{Math.round(s.avgTimeSec)}{t(" שנ'", 's')}</td>
                  <td>
                    <div className="bar-track" style={{ width: 90 }}>
                      <div className="bar-fill" style={{ width: `${Math.min(100, s.weakness * 100)}%`, background: accuracyColor(1 - s.weakness) }} />
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => { setActivePlan(practicePlan(s.section, 10, [s.subtype], attempts, false)); navigate('/quiz'); }}>{t('תרגל', 'Practice')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>{t('היסטוריה', 'History')}</h2>
        <ul className="list-clean">
          {attempts.map((a) => (
            <li key={a.id} className="row spread">
              <Link to={`/results/${a.id}`}>{a.title}</Link>
              <span className="row small muted">
                {new Date(a.finishedAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })} · {a.answers.length} {t("ש'", 'q')}
                <span className="chip" style={{ color: accuracyColor(attemptScore(a) / 100) }}>{attemptScore(a)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
