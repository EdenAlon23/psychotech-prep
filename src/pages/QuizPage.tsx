import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AnswerRecord, Attempt, SectionResult } from '../models/attempt';
import { QuestionView } from '../components/QuestionView';
import { SECTION_BY_ID } from '../data/sections';
import { clearActivePlan, getActivePlan, loadProgress, saveProgress, secondsLeft } from '../services/session';
import { markMistakeRetried, recordMistakes, saveAttempt } from '../services/storage';
import { applyQuizAnswers } from '../services/vocab';
import { uid } from '../utils/random';
import { sectionText, useT } from '../i18n';

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
  const { t, lang } = useT();
  // Progress saved before a refresh / accidental reload of this same plan.
  const [restored] = useState(() => (plan ? loadProgress(plan) : null));
  const [blockIdx, setBlockIdx] = useState(restored?.blockIdx ?? 0);
  const [phase, setPhase] = useState<Phase>(restored?.phase ?? (plan?.mode === 'simulation' ? 'intro' : 'running'));
  const [qIdx, setQIdx] = useState(restored?.qIdx ?? 0);
  const [chosen, setChosen] = useState<Record<string, number>>(restored?.chosen ?? {});
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set(restored?.revealed));
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set(restored?.flagged));
  /** Absolute end of the block countdown: survives reloads and doesn't drift in background tabs. */
  const [deadline, setDeadline] = useState<number | null>(restored?.deadline ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [showResumed, setShowResumed] = useState(restored !== null);
  const timesRef = useRef<Record<string, number>>(restored?.timesMs ?? {});
  const qStartRef = useRef<number>(0);
  const blockStartRef = useRef<number>(0);
  const blockResultsRef = useRef<SectionResult[]>(restored?.blockResults ?? []);
  const startedAtRef = useRef<number>(restored?.startedAt ?? 0);
  const finishedRef = useRef(false);
  const timeLeft = deadline === null ? null : secondsLeft(deadline, now);

  useEffect(() => {
    const t = Date.now();
    qStartRef.current = t;
    if (!startedAtRef.current) startedAtRef.current = t;
  }, []);

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
    // Words answered wrong go back to the start of the flashcard deck.
    applyQuizAnswers(answers);
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
      setDeadline(null);
      setPhase(plan.mode === 'simulation' ? 'intro' : 'running');
      blockStartRef.current = Date.now();
      qStartRef.current = Date.now();
    } else {
      finishAll();
    }
  }, [plan, block, blockIdx, chosen, commitQuestionTime, finishAll]);

  // Start the block timer when a block begins running (a restored block keeps its deadline).
  useEffect(() => {
    if (phase !== 'running' || !block) return;
    const t = Date.now();
    qStartRef.current = t;
    const limitMs = (block.timeLimitSec ?? 0) * 1000;
    setDeadline((d) => {
      if (d !== null) { blockStartRef.current = d - limitMs; return d; }
      blockStartRef.current = t;
      return block.timeLimitSec ? t + limitMs : null;
    });
  }, [phase, blockIdx, block]);

  // Countdown tick: re-read the clock rather than decrementing, so the timer stays exact.
  useEffect(() => {
    if (phase !== 'running' || deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase, deadline]);

  useEffect(() => {
    if (phase === 'running' && timeLeft !== null && timeLeft <= 0) endBlock(true);
  }, [timeLeft, phase, endBlock]);

  // Persist progress on every change so a refresh resumes at the same question.
  const persist = useCallback(() => {
    if (!plan || finishedRef.current) return;
    saveProgress({
      version: 1, blockIdx, qIdx, phase, chosen,
      revealed: [...revealed], flagged: [...flagged], deadline,
      blockResults: blockResultsRef.current, timesMs: timesRef.current, startedAt: startedAtRef.current,
    });
  }, [plan, blockIdx, qIdx, phase, chosen, revealed, flagged, deadline]);

  useEffect(() => { persist(); }, [persist]);

  // On reload / tab close, also bank the time spent on the current question.
  useEffect(() => {
    const onHide = () => { commitQuestionTime(); persist(); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [commitQuestionTime, persist]);

  // Closing the tab mid-simulation loses the session (sessionStorage), so ask first.
  useEffect(() => {
    if (plan?.mode !== 'simulation' || phase !== 'running') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [plan, phase]);

  useEffect(() => {
    if (!showResumed) return;
    const t = setTimeout(() => setShowResumed(false), 5000);
    return () => clearTimeout(t);
  }, [showResumed]);

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
        <p>{t('אין תרגול פעיל.', 'No active practice.')}</p>
        <Link className="btn" to="/">{t('חזרה לדף הבית', 'Back to home')}</Link>
      </div>
    );
  }

  if (block.questions.length === 0) {
    return (
      <div className="card empty">
        <p>{t('לא נמצאו שאלות לבחירה הזו.', 'No questions match this selection.')}</p>
        <Link className="btn" to="/practice">{t('חזרה', 'Back')}</Link>
      </div>
    );
  }

  const meta = { ...SECTION_BY_ID[block.section], ...sectionText(SECTION_BY_ID[block.section], lang) };
  const totalQuestions = plan.blocks.reduce((s, b) => s + b.questions.length, 0);
  const doneBefore = plan.blocks.slice(0, blockIdx).reduce((s, b) => s + b.questions.length, 0);

  if (phase === 'intro') {
    return (
      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="row spread">
          <span className="chip primary">{t(`פרק ${blockIdx + 1} מתוך ${plan.blocks.length}`, `Section ${blockIdx + 1} of ${plan.blocks.length}`)}</span>
          <span className="chip">{block.questions.length} {t('שאלות', 'questions')} · {fmtTime(block.timeLimitSec ?? 0)} {t('דקות', 'minutes')}</span>
        </div>
        <h1 className="mt">{meta.icon} {block.title}</h1>
        <p>{meta.description}</p>
        <h3>{t('אסטרטגיה לפרק', 'Strategy for this section')}</h3>
        <ul className="tips">{meta.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="muted small">{t('בסימולציה אין משוב במהלך הפרק. אפשר לנווט בין השאלות ולסמן שאלות לחזרה (🚩). כשהזמן נגמר – הפרק נסגר אוטומטית.', 'No feedback during a test section. You can move between questions and flag them for review (🚩). When time runs out, the section closes automatically.')}</p>
        <button className="btn btn-block mt" onClick={() => setPhase('running')}>{t('התחל פרק ▶', 'Start section ▶')}</button>
      </div>
    );
  }

  const isRevealed = plan.immediateFeedback && question ? revealed.has(question.id) : false;
  const answeredCount = block.questions.filter((q) => (chosen[q.id] ?? -1) >= 0).length;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {showResumed && (
        <div className="resume-note" role="status">
          <span>{t('↺ חזרת למקום שבו עצרת', '↺ Picked up where you left off')}{timeLeft !== null ? t(' – הטיימר המשיך לרוץ', ' – the timer kept running') : ''}.</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowResumed(false)} aria-label={t('סגירת ההודעה', 'Dismiss')}>✕</button>
        </div>
      )}
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
            {plan.mode === 'simulation' && qIdx > 0 && <button className="btn btn-ghost" onClick={() => goTo(qIdx - 1)}>{t('→ הקודמת', '← Previous')}</button>}
            {plan.mode === 'simulation' && question && (
              <button
                className="btn btn-ghost"
                onClick={() => setFlagged((f) => { const n = new Set(f); if (n.has(question.id)) n.delete(question.id); else n.add(question.id); return n; })}
              >
                {flagged.has(question.id) ? t('🚩 מסומנת', '🚩 Flagged') : t('🏳 סמן לחזרה', '🏳 Flag for review')}
              </button>
            )}
          </div>
          <div className="row">
            {plan.mode === 'simulation' ? (
              <>
                {qIdx + 1 < block.questions.length && <button className="btn" onClick={next}>{t('הבאה ←', 'Next →')}</button>}
                <button className={qIdx + 1 < block.questions.length ? 'btn btn-ghost' : 'btn'} onClick={() => {
                  const unanswered = block.questions.length - answeredCount;
                  if (unanswered === 0 || window.confirm(t(`נותרו ${unanswered} שאלות ללא מענה. לסיים את הפרק?`, `${unanswered} questions are unanswered. Finish the section?`))) endBlock(false);
                }}>
                  {t('סיים פרק ✓', 'Finish section ✓')}
                </button>
              </>
            ) : (
              <button className="btn" onClick={next} disabled={!isRevealed}>
                {qIdx + 1 < block.questions.length ? t('הבאה ←', 'Next →') : blockIdx + 1 < plan.blocks.length ? t('לחלק הבא ←', 'Next part →') : t('סיום וצפייה בתוצאות', 'Finish and see results')}
              </button>
            )}
          </div>
        </div>
        <p className="small muted mt" style={{ marginBottom: 0 }}>{t('קיצורים:', 'Shortcuts:')} <kbd>1</kbd>–<kbd>{question?.choices.length ?? 4}</kbd> {t('לבחירה', 'to choose')}, <kbd>Enter</kbd> {t('לשאלה הבאה.', 'for the next question.')}</p>
      </div>

      {plan.mode === 'simulation' && (
        <div className="q-nav" aria-label={t('ניווט בין שאלות', 'Question navigator')}>
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
          if (window.confirm(t('לצאת? ההתקדמות בתרגול הנוכחי תישמר כפי שהיא.', 'Leave? Your progress so far will be saved.'))) {
            for (let i = blockIdx; i < plan.blocks.length; i++) {
              if (i > blockIdx) blockResultsRef.current.push({ section: plan.blocks[i].section, total: plan.blocks[i].questions.length, correct: 0, answered: 0, timeMs: 0, timedOut: false });
            }
            commitQuestionTime();
            finishAll();
          }
        }}>{t('יציאה ושמירה', 'Save and exit')}</button>
      </div>
    </div>
  );
}
