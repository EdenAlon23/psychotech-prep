import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { VocabCategory, VocabEntry, VocabProgress } from '../models/vocab';
import { VOCAB, VOCAB_CATEGORIES } from '../data/vocabulary';
import { Flashcards } from '../components/vocab/Flashcards';
import { VocabList } from '../components/vocab/VocabList';
import { buildDeck, isMissed, recordReview, setKnown, statusOf, summarize, vocabQuizPlan, type DeckOptions } from '../services/vocab';
import { setActivePlan } from '../services/session';
import { getVocabProgress } from '../services/storage';

type Mode = 'read' | 'cards' | 'quiz';
type StatusFilter = 'all' | 'new' | 'learning' | 'known' | 'missed';

const MODES: { id: Mode; label: string }[] = [
  { id: 'read', label: '📖 דף לימוד' },
  { id: 'cards', label: '🃏 כרטיסיות' },
  { id: 'quiz', label: '✍️ בוחן' },
];

const QUIZ_CATEGORIES: VocabCategory[] = ['words', 'antonyms', 'idioms', 'connectors'];

/** Strip niqqud & quotes so "תושייה" matches "תושיה"-style searches. */
const normalize = (s: string) => s.replace(/[֑-ׇ"״'׳]/g, '').replace(/י{2}/g, 'י').replace(/ו{2}/g, 'ו').toLowerCase();

export default function VocabPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as Mode) || 'read';
  const [progress, setProgress] = useState<VocabProgress>(() => getVocabProgress());
  const [cats, setCats] = useState<VocabCategory[]>(() => {
    const c = params.get('c') as VocabCategory | null;
    return c && VOCAB_CATEGORIES.some((x) => x.id === c) ? [c] : [];
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>(params.get('focus') === 'missed' ? 'missed' : 'all');
  const [hideMeaning, setHideMeaning] = useState(false);

  // Flashcard session
  const [deckSource, setDeckSource] = useState<DeckOptions['source']>(params.get('focus') === 'missed' ? 'missed' : 'smart');
  const [deckSize, setDeckSize] = useState(20);
  const [deck, setDeck] = useState<VocabEntry[] | null>(null);
  const [lastResult, setLastResult] = useState<{ knew: VocabEntry[]; forgot: VocabEntry[] } | null>(null);

  // Quiz
  const [quizSource, setQuizSource] = useState<'weak' | 'all'>('weak');
  const [quizCount, setQuizCount] = useState(15);

  const setMode = (m: Mode) => { setParams((p) => { p.set('mode', m); p.delete('focus'); return p; }, { replace: true }); setDeck(null); setLastResult(null); };
  const toggleCat = (c: VocabCategory) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const inCats = useMemo(() => VOCAB.filter((e) => cats.length === 0 || cats.includes(e.category)), [cats]);
  const summary = useMemo(() => summarize(progress, inCats), [progress, inCats]);
  const totalSummary = useMemo(() => summarize(progress), [progress]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return inCats.filter((e) => {
      if (q && !normalize(`${e.term} ${e.meaning} ${e.example ?? ''}`).includes(q)) return false;
      if (status === 'all') return true;
      if (status === 'missed') return isMissed(progress[e.id]);
      return statusOf(progress[e.id]) === status;
    });
  }, [inCats, query, status, progress]);

  const startDeck = () => {
    const d = buildDeck(progress, { categories: cats, source: deckSource, size: deckSize });
    setLastResult(null);
    setDeck(d.length ? d : null);
  };

  const startQuiz = (entries?: VocabEntry[]) => {
    const pool = entries ?? inCats.filter((e) => QUIZ_CATEGORIES.includes(e.category) && e.questionId);
    const weakFirst = quizSource === 'weak' && !entries
      ? [...pool].sort((a, b) => rank(progress, a) - rank(progress, b))
      : pool;
    const chosen = entries ?? (quizSource === 'weak' ? weakFirst.slice(0, quizCount) : shuffleSlice(pool, quizCount));
    const plan = vocabQuizPlan(chosen);
    if (plan.blocks[0].questions.length === 0) return;
    setActivePlan(plan);
    navigate('/quiz');
  };

  const quizPool = inCats.filter((e) => QUIZ_CATEGORIES.includes(e.category) && e.questionId);
  const pct = (n: number) => (totalSummary.total ? Math.round((n / totalSummary.total) * 100) : 0);

  return (
    <div>
      <div className="page-head">
        <h1>📚 אוצר מילים לפרק העברית</h1>
        <p>כל המילים, הביטויים ומילות הקישור שמופיעים בשאלות העברית, במקום אחד. קרא לפני התרגול, שנן בכרטיסיות ובדוק את עצמך בבוחן. מילים שטעית בהן בתרגול חוזרות לכרטיסיות אוטומטית.</p>
      </div>

      <section className="grid grid-4 mb">
        <div className="card stat"><span className="value">{totalSummary.total}</span><span className="label">פריטים במאגר</span></div>
        <div className="card stat"><span className="value" style={{ color: 'var(--good)' }}>{totalSummary.known}</span><span className="label">ידועים ({pct(totalSummary.known)}%)</span></div>
        <div className="card stat"><span className="value" style={{ color: 'var(--warn)' }}>{totalSummary.due + totalSummary.missed}</span><span className="label">לחזרה היום</span></div>
        <div className="card stat"><span className="value" style={{ color: 'var(--bad)' }}>{totalSummary.missed}</span><span className="label">טעית בתרגול</span></div>
      </section>
      <div className="vocab-meter mb no-print" aria-label="התקדמות">
        <span style={{ width: `${pct(totalSummary.known)}%`, background: 'var(--good)' }} />
        <span style={{ width: `${pct(totalSummary.learning)}%`, background: 'var(--warn)' }} />
      </div>

      <div className="tabs no-print">
        {MODES.map((m) => <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => setMode(m.id)}>{m.label}</button>)}
      </div>

      <div className="card mb no-print">
        <div className="row">
          <span className="small muted" style={{ fontWeight: 700 }}>נושאים:</span>
          <button className={`chip${cats.length === 0 ? ' selected' : ''}`} onClick={() => setCats([])}>הכול</button>
          {VOCAB_CATEGORIES.filter((c) => mode !== 'quiz' || c.id !== 'grammar').map((c) => (
            <button key={c.id} className={`chip${cats.includes(c.id) ? ' selected' : ''}`} onClick={() => toggleCat(c.id)}>
              {c.icon} {c.title}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ margin: '0.6rem 0 0' }}>
          בבחירה: {summary.total} פריטים · {summary.known} ידועים · {summary.learning} בלמידה · {summary.fresh} חדשים
        </p>
      </div>

      {mode === 'read' && (
        <>
          <div className="card mb no-print vocab-toolbar">
            <input type="search" placeholder="🔍 חיפוש מילה, פירוש או דוגמה…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש" />
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="סינון לפי מצב">
              <option value="all">כל המצבים</option>
              <option value="new">חדשים</option>
              <option value="learning">בלמידה</option>
              <option value="known">ידועים</option>
              <option value="missed">טעיתי בהם</option>
            </select>
            <label className="row small" style={{ fontWeight: 600 }}>
              <input type="checkbox" checked={hideMeaning} onChange={(e) => setHideMeaning(e.target.checked)} /> הסתר פירושים (בחן את עצמך)
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ הדפס / שמור PDF</button>
          </div>
          <p className="print-only print-title">PsychoTech Prep · דף אוצר מילים לפרק העברית</p>
          <VocabList
            entries={visible}
            progress={progress}
            hideMeaning={hideMeaning}
            onToggleKnown={(id, known) => setProgress(setKnown(id, known))}
          />
        </>
      )}

      {mode === 'cards' && (
        <div className="card">
          {deck ? (
            <Flashcards
              key={deck.map((d) => d.id).join()}
              deck={deck}
              onReview={(e, knew) => setProgress(recordReview(e.id, knew))}
              onFinish={(r) => { setLastResult(r); setDeck(null); }}
            />
          ) : (
            <>
              {lastResult && (
                <div className="feedback good mb">
                  <b>סיימת סבב!</b> ידעת {lastResult.knew.length} מתוך {lastResult.knew.length + lastResult.forgot.length} בפעם הראשונה.
                  {lastResult.forgot.length > 0 && (
                    <div className="row mt">
                      <span className="small">לחזק את מה ששכחת:</span>
                      <button className="btn btn-sm" onClick={() => startQuiz(lastResult.forgot.filter((e) => e.questionId))} disabled={!lastResult.forgot.some((e) => e.questionId)}>בוחן על {lastResult.forgot.length} המילים האלה</button>
                    </div>
                  )}
                </div>
              )}
              <h2>🃏 כרטיסיות עם חזרה מרווחת</h2>
              <p className="muted">רואים מילה, מנסים להיזכר בפירוש, הופכים ומסמנים "ידעתי" או "לא ידעתי". מילה שידעת תחזור אחרי יום, 3 ימים, שבוע ו-16 יום. מילה ששכחת חוזרת עוד באותו סבב.</p>
              <div className="row mb">
                <label htmlFor="src">אילו כרטיסים</label>
                <select id="src" value={deckSource} onChange={(e) => setDeckSource(e.target.value as DeckOptions['source'])} style={{ width: 'auto' }}>
                  <option value="smart">חכם: טעויות ← לחזרה היום ← חדשים</option>
                  <option value="missed">רק מילים שטעיתי בהן ({summary.missed})</option>
                  <option value="all">אקראי מכל המאגר</option>
                </select>
                <label htmlFor="size">כמות</label>
                <select id="size" value={deckSize} onChange={(e) => setDeckSize(Number(e.target.value))} style={{ width: 90 }}>
                  {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button className="btn btn-block" onClick={startDeck} disabled={deckSource === 'missed' && summary.missed === 0}>
                {deckSource === 'missed' && summary.missed === 0 ? 'אין מילים שטעית בהן 🎉' : 'התחל סבב ▶'}
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'quiz' && (
        <div className="card">
          <h2>✍️ בוחן אוצר מילים</h2>
          <p className="muted">שאלות אמריקאיות בפורמט של המבחן, עם משוב והסבר אחרי כל שאלה. התוצאות נכנסות לניתוח הנתונים, ותשובה שגויה מחזירה את המילה לכרטיסיות.</p>
          <div className="row mb">
            <label htmlFor="qsrc">אילו מילים</label>
            <select id="qsrc" value={quizSource} onChange={(e) => setQuizSource(e.target.value as 'weak' | 'all')} style={{ width: 'auto' }}>
              <option value="weak">קודם החלשות (טעויות, בלמידה, חדשות)</option>
              <option value="all">אקראי</option>
            </select>
            <label htmlFor="qcnt">שאלות</label>
            <select id="qcnt" value={quizCount} onChange={(e) => setQuizCount(Number(e.target.value))} style={{ width: 90 }}>
              {[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="small muted">{quizPool.length} שאלות זמינות בנושאים שנבחרו (כללי לשון נבדקים בפרק "דקדוק ולשון" בתרגול).</p>
          <button className="btn btn-block" onClick={() => startQuiz()} disabled={quizPool.length === 0}>התחל בוחן ▶</button>
        </div>
      )}
    </div>
  );
}

/** Lower = ask first: missed → learning → new → known. */
function rank(progress: VocabProgress, e: VocabEntry): number {
  const st = progress[e.id];
  if (isMissed(st)) return 0;
  const s = statusOf(st);
  return (s === 'learning' ? 1 : s === 'new' ? 2 : 3) + Math.random() * 0.5;
}

function shuffleSlice<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
