import { useEffect, useMemo, useRef, useState } from 'react';
import { groupDynamicsTips, interviewCategories, interviewQuestions, interviewTips, starChecklist, storyPrompts } from '../data/interview';
import { getInterviewData, saveInterviewData, type InterviewData } from '../services/storage';
import { createRng, pick, randomSeed } from '../utils/random';

type Tab = 'practice' | 'bank' | 'stories' | 'tips';

export default function InterviewPage() {
  const [tab, setTab] = useState<Tab>('practice');
  const [data, setData] = useState<InterviewData>(() => getInterviewData());
  useEffect(() => saveInterviewData(data), [data]);

  return (
    <div>
      <div className="page-head">
        <h1>🗣️ ראיון עם מאבחנת</h1>
        <p>המאבחנת (פסיכולוג/ית תעסוקתי/ת) בודקת התאמה אישיותית, מוטיבציה, יושרה ועקביות. כאן מתרגלים תשובות אמיתיות – לא משננים.</p>
      </div>
      <div className="tabs">
        <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>🎤 תרגול ראיון</button>
        <button className={tab === 'bank' ? 'active' : ''} onClick={() => setTab('bank')}>📚 בנק שאלות</button>
        <button className={tab === 'stories' ? 'active' : ''} onClick={() => setTab('stories')}>📝 בנק סיפורים</button>
        <button className={tab === 'tips' ? 'active' : ''} onClick={() => setTab('tips')}>💡 טיפים ודינמיקה</button>
      </div>
      {tab === 'practice' && <PracticeTab data={data} setData={setData} />}
      {tab === 'bank' && <BankTab data={data} />}
      {tab === 'stories' && <StoriesTab data={data} setData={setData} />}
      {tab === 'tips' && <TipsTab />}
    </div>
  );
}

function PracticeTab({ data, setData }: { data: InterviewData; setData: (fn: (d: InterviewData) => InterviewData) => void }) {
  const rng = useMemo(() => createRng(randomSeed()), []);
  const [category, setCategory] = useState<string>('all');
  const pool = interviewQuestions.filter((q) => category === 'all' || q.category === category);
  const [current, setCurrent] = useState(() => pick(rng, interviewQuestions));
  const [text, setText] = useState('');
  const [checks, setChecks] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer.current);
  }, [running]);

  const nextQuestion = () => {
    const candidates = pool.filter((q) => q.id !== current.id);
    const unanswered = candidates.filter((q) => !data.answers[q.id]);
    setCurrent(pick(rng, unanswered.length ? unanswered : candidates));
    setText(''); setChecks([]); setRating(0); setSeconds(0); setRunning(false); setShowHint(false);
  };

  const save = () => {
    setData((d) => ({ ...d, answers: { ...d.answers, [current.id]: { text, checks, rating, at: Date.now() } } }));
    nextQuestion();
  };

  const prev = data.answers[current.id];
  const answeredCount = Object.keys(data.answers).length;

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="row spread mb">
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">כל הקטגוריות</option>
            {interviewCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="chip">תורגלו {answeredCount}/{interviewQuestions.length}</span>
        </div>
        <span className="chip primary">{current.category}</span>
        <h2 className="mt">{current.question}</h2>
        <div className="row mb">
          <span className={`timer${seconds > 150 ? ' low' : ''}`}>⏱ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
          <button className="btn btn-sm" onClick={() => setRunning((r) => !r)}>{running ? '⏸ עצור' : '▶ התחל לענות בקול'}</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowHint((h) => !h)}>{showHint ? 'הסתר' : 'מה בודקים?'}</button>
        </div>
        {showHint && (
          <div className="feedback good mb">
            <p><strong>מה המאבחנת בודקת:</strong> {current.measures}</p>
            <p style={{ margin: 0 }}><strong>טיפ:</strong> {current.tip}</p>
          </div>
        )}
        <p className="small muted">ענה בקול כאילו את/ה בראיון (1–2 דקות), ואז רשום נקודות עיקריות:</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="נקודות עיקריות של התשובה שלך…" />
        {prev && <p className="small muted">תשובה קודמת ({new Date(prev.at).toLocaleDateString('he-IL')}): {prev.text.slice(0, 160)}</p>}
        <div className="row spread mt">
          <button className="btn btn-ghost" onClick={nextQuestion}>דלג</button>
          <button className="btn" onClick={save}>שמור והמשך ←</button>
        </div>
      </div>
      <div className="card">
        <h3>בדיקה עצמית (STAR)</h3>
        <ul className="list-clean">
          {starChecklist.map((c) => (
            <li key={c.id}>
              <label className="row" style={{ fontWeight: 500 }}>
                <input type="checkbox" checked={checks.includes(c.id)} onChange={() => setChecks((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))} />
                {c.label}
              </label>
            </li>
          ))}
        </ul>
        <h3 className="mt">כמה התשובה הרגישה טובה?</h3>
        <div className="row">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={`chip${rating === n ? ' selected' : ''}`} onClick={() => setRating(n)}>{'★'.repeat(n)}</button>
          ))}
        </div>
        <div className="mt">
          <div className="progress"><span style={{ width: `${(checks.length / starChecklist.length) * 100}%` }} /></div>
          <p className="small muted mt">
            {checks.length >= 6 ? 'תשובה מצוינת – מובנית ומלאה.' : checks.length >= 4 ? 'טוב. חסר רכיב או שניים – ראה מה לא סימנת.' : 'כדאי לבנות את התשובה סביב דוגמה קונקרטית (STAR).'}
          </p>
        </div>
      </div>
    </div>
  );
}

function BankTab({ data }: { data: InterviewData }) {
  return (
    <div className="grid">
      {interviewCategories.map((cat) => (
        <div key={cat} className="card">
          <h2>{cat}</h2>
          <ul className="list-clean">
            {interviewQuestions.filter((q) => q.category === cat).map((q) => (
              <li key={q.id}>
                <div className="row spread"><strong>{q.question}</strong>{data.answers[q.id] && <span className="chip good">תורגל</span>}</div>
                <div className="small muted"><b>בודקים:</b> {q.measures}</div>
                <div className="small"><b>טיפ:</b> {q.tip}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StoriesTab({ data, setData }: { data: InterviewData; setData: (fn: (d: InterviewData) => InterviewData) => void }) {
  return (
    <div>
      <div className="card mb">
        <p style={{ margin: 0 }}>
          הכינו מראש 6–7 סיפורים אמיתיים מהשירות, מהלימודים או מהעבודה. סיפור טוב אחד עונה על כמה שאלות (מנהיגות + לחץ + אחריות). כתבו כל סיפור במבנה STAR.
          <span className="muted"> הסיפורים נשמרים רק בדפדפן שלך.</span>
        </p>
      </div>
      <div className="grid grid-2">
        {storyPrompts.map((s) => (
          <div key={s.id} className="card">
            <h3>{s.title}</h3>
            <p className="small muted">{s.hint}</p>
            <textarea
              value={data.stories[s.id] ?? ''}
              onChange={(e) => setData((d) => ({ ...d, stories: { ...d.stories, [s.id]: e.target.value } }))}
              placeholder={'מצב: …\nמשימה: …\nפעולה: …\nתוצאה: …\nלקח: …'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsTab() {
  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>טיפים לראיון</h2>
        <ul className="tips">{interviewTips.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      <div className="card">
        <h2>דינמיקה קבוצתית</h2>
        <ul className="tips">{groupDynamicsTips.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  );
}
