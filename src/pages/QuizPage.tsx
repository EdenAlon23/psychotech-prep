import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AnswerRecord, Attempt, SectionResult } from '../models/attempt';
import { QuestionView } from '../components/QuestionView';
import { SECTION_BY_ID } from '../data/sections';
import { clearActivePlan, getActivePlan } from '../services/session';
import { markMistakeRetried, recordMistakes, saveAttempt } from '../services/storage';
import { uid } from '../utils/random';

type Phase = 'intro' | 'running';

const fmtTime = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Runs any QuizPlan. Practice-like modes reveal the answer right after
 * selection (learning); simulation mode hides feedback, allows free
 * navigation inside a block and enforces a per-block countdown (testing).
 */
export default function QuizPage() {
  const navigate = useNavigate();
  const plan = useMemo(() => getActivePlan(), []);
  const [blockIdx, setBlockIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(plan?.mode === 'simulation' ? 'intro' : 'running');
  const [qIdx, setQIdx] = useState(0);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timesRef = useRef<Record<string, number>>({});
  const qStartRef = useRef<number>(Date.now());
  const blockStartRef = useRef<number>(Date.now());
  const blockResultsRef = useRef<SectionResult[]>([]);
  const startedAtRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);

  const block = plan?.blocks[blockIdx];
  const question = block?.questions[qIdx];

  /** Accumulate time spent on the current question (supports revisiting). */
  const commitQuestionTime = useCallback(() => {
    if (!question) return;
    const now = Date.now();
    timesRef.current[question.id] = (timesRef.current[question.id] ?? 0) + (now - qStartRef.current);
    qStartRef.current = now;
  }, [question]);

  const finishAll = useCallback(() => {
    if (!plan || finishedRef.current) return;
    finishedRef.current = true;
    // In a simulation an unanswered question counts (as wrong) – like the real test.
    // In practice modes, questions you never reached are simply dropped.
    const questions = plan.blocks
      .flatMap((b) => b.questions)
      .filter((q) => plan.mode === 'simulation' || (chosen[q.id] ?? -1) >= 0);
    const answers: AnswerRecord[] = questions.map((q) => {
      const c = chosen[q.id] ?? -1;
      return {
        questionId: q.id, section: q.section, subtype: q.subtype, difficulty: q.difficulty,
        chosenIndex: c, correct: c === q.answerIndex, timeMs: Math.round(timesRef.current[q.id] ?? 0),
      };
    });
    const attempt: Attempt = {
      id: uid(), mode: plan.mode, title: plan.title, simulationId: plan.simulationId,
      startedAt: startedAtRef.current, finishedAt: Date.now(), answers,
      sectionResults: blockResultsRef.current, questions,
    };
    saveAttempt(attempt);
    if (plan.mode === 'mistakes') {
      answers.forEach((a) => a.chosenIndex >= 0 && markMistakeRetried(a.questionId, a.correct));
    } else {
      recordMistakes(
        questions
          .filter((q) => (chosen[q.id] ?? -1) !== q.answerIndex)
          .map((q) => ({ question: q, chosenIndex: chosen[q.id] ?? -1 })),
      );
    }
    clearActivePlan();
    navigate(`/results/${attempt.id}`, { replace: true });
  }, [plan, chosen, navigate]);

  const endBlock = useCallback((timedOut: boolean) => {
    if (!plan || !block) return;
    commitQuestionTime();
    const correct = block.questions.filter((q) => chosen[q.id] === q.answerIndex).length;
    const answered = block.questions.filter((q) => (chosen[q.id] ?? -1) >= 0).length;
    blockResultsRef.current = [
      ...blockResultsRef.current,
      { section: block.section, total: block.questions.length, correct, answered, timeMs: Date.now() - blockStartRef.current, timedOut },
    ];
    if (blockIdx + 1 < plan.blocks.length) {
      setBlockIdx((b) => b + 1);
      setQIdx(0);
      setTimeLeft(null);
      setPhase(plan.mode === 'simulation' ? 'intro' : 'running');
      blockStartRef.current = Date.now();
      qStartRef.current = Date.now();
    } else {
      finishAll();
    }
  }, [plan, block, blockIdx, chosen, commitQuestionTime, finishAll]);

  // Start block timer when a block begins running.
  useEffect(() => {
    if (phase !== 'running' || !block) return;
    blockStartRef.current = Date.now();
    qStartRef.current = Date.now();
    setTimeLeft(block.timeLimitSec ?? null);
  }, [phase, blockIdx, block]);

  // Countdown tick.
  useEffect(() => {
    if (phase !== 'running' || timeLeft === null) return;
    if (timeLeft <= 0) {
      endBlock(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, endBlock]);

  const goTo = useCallback((i: number) => {
    commitQuestionTime();
    setQIdx(i);
  }, [commitQuestionTime]);

  const select = useCallback((i: number) => {
    if (!question || !plan) return;
    if (plan.immediateFeedback && revealed.has(question.id)) return;
    setChosen((c) => ({ ...c, [question.id]: i }));
    if (plan.immediateFeedback) {
      commitQuestionTime();
      setRevealed((r) => new Set(r).add(question.id));
    }
  }, [question, plan, revealed, commitQuestionTime]);

  const next = useCallback(() => {
    if (!block) return;
    if (qIdx + 1 < block.questions.length) goTo(qIdx + 1);
    else endBlock(false);
  }, [block, qIdx, goTo, endBlock]);

  // Keyboard: 1-4 select, Enter = next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'running' || !question) return;
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= question.choices.length) select(n - 1);
      if (e.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question, select, next]);

  if (!plan || !block) {
    return (
      <div className="card empty">
        <p>אין תרגול פעיל.</p>
        <Link className="btn" to="/">חזרה לדף הבית</Link>
      </div>
    );
  }

  if (block.questions.length === 0) {
    return (
      <div className="card empty">
        <p>לא נמצאו שאלות לבחירה הזו.</p>
        <Link className="btn" to="/practice">חזרה</Link>
      </div>
    );
  }

  const meta = SECTION_BY_ID[block.section];
  const totalQuestions = plan.blocks.reduce((s, b) => s + b.questions.length, 0);
  const doneBefore = plan.blocks.slice(0, blockIdx).reduce((s, b) => s + b.questions.length, 0);

  if (phase === 'intro') {
    return (
      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="row spread">
          <span className="chip primary">פרק {blockIdx + 1} מתוך {plan.blocks.length}</span>
          <span className="chip">{block.questions.length} שאלות · {fmtTime(block.timeLimitSec ?? 0)} דקות</span>
        </div>
        <h1 className="mt">{meta.icon} {block.title}</h1>
        <p>{meta.description}</p>
        <h3>אסטרטגיה לפרק</h3>
        <ul className="tips">{meta.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="muted small">בסימולציה אין משוב במהלך הפרק. אפשר לנווט בין השאלות ולסמן שאלות לחזרה (🚩). כשהזמן נגמר – הפרק נסגר אוטומטית.</p>
        <button className="btn btn-block mt" onClick={() => setPhase('running')}>התחל פרק ▶</button>
      </div>
    );
  }

  const isRevealed = plan.immediateFeedback && question ? revealed.has(question.id) : false;
  const answeredCount = block.questions.filter((q) => (chosen[q.id] ?? -1) >= 0).length;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="quiz-top">
        <div>
          <div className="small muted">{plan.title}</div>
          <strong>{meta.icon} {block.title}</strong>
        </div>
        <div className="row">
          <span className="chip">{qIdx + 1}/{block.questions.length}</span>
          {timeLeft !== null && <span className={`timer${timeLeft <= 30 ? ' low' : ''}`}>⏱ {fmtTime(timeLeft)}</span>}
        </div>
      </div>
      <div className="progress mb"><span style={{ width: `${((doneBefore + qIdx) / totalQuestions) * 100}%` }} /></div>

      <div className="card">
        {question && (
          <QuestionView key={question.id} question={question} selected={chosen[question.id] ?? -1} onSelect={select} reveal={isRevealed} />
        )}
        <div className="row spread mt">
          <div className="row">
            {plan.mode === 'simulation' && qIdx > 0 && <button className="btn btn-ghost" onClick={() => goTo(qIdx - 1)}>→ הקודמת</button>}
            {plan.mode === 'simulation' && question && (
              <button
                className="btn btn-ghost"
                onClick={() => setFlagged((f) => { const n = new Set(f); if (n.has(question.id)) n.delete(question.id); else n.add(question.id); return n; })}
              >
                {flagged.has(question.id) ? '🚩 מסומנת' : '🏳 סמן לחזרה'}
              </button>
            )}
          </div>
          <div className="row">
            {plan.mode === 'simulation' ? (
              <>
                {qIdx + 1 < block.questions.length && <button className="btn" onClick={next}>הבאה ←</button>}
                <button className={qIdx + 1 < block.questions.length ? 'btn btn-ghost' : 'btn'} onClick={() => {
                  const unanswered = block.questions.length - answeredCount;
                  if (unanswered === 0 || window.confirm(`נותרו ${unanswered} שאלות ללא מענה. לסיים את הפרק?`)) endBlock(false);
                }}>
                  סיים פרק ✓
                </button>
              </>
            ) : (
              <button className="btn" onClick={next} disabled={!isRevealed}>
                {qIdx + 1 < block.questions.length ? 'הבאה ←' : blockIdx + 1 < plan.blocks.length ? 'לחלק הבא ←' : 'סיום וצפייה בתוצאות'}
              </button>
            )}
          </div>
        </div>
        <p className="small muted mt" style={{ marginBottom: 0 }}>קיצורים: <kbd>1</kbd>–<kbd>4</kbd> לבחירה, <kbd>Enter</kbd> לשאלה הבאה.</p>
      </div>

      {plan.mode === 'simulation' && (
        <div className="q-nav" aria-label="ניווט בין שאלות">
          {block.questions.map((q, i) => (
            <button
              key={q.id}
              className={[(chosen[q.id] ?? -1) >= 0 ? 'answered' : '', i === qIdx ? 'current' : '', flagged.has(q.id) ? 'flagged' : ''].join(' ')}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="center mt">
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (window.confirm('לצאת? ההתקדמות בתרגול הנוכחי תישמר כפי שהיא.')) {
            for (let i = blockIdx; i < plan.blocks.length; i++) {
              if (i > blockIdx) blockResultsRef.current.push({ section: plan.blocks[i].section, total: plan.blocks[i].questions.length, correct: 0, answered: 0, timeMs: 0, timedOut: false });
            }
            commitQuestionTime();
            finishAll();
          }
        }}>יציאה ושמירה</button>
      </div>
    </div>
  );
}
