import type { Question } from '../models/question';
import { FigureBoard, FigureSvg } from './FigureView';

const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה'];

interface Props {
  question: Question;
  selected: number;
  onSelect?: (index: number) => void;
  /** When true: lock choices and colour them correct/wrong. */
  reveal: boolean;
}

/** Presentational only – no state, no timers. Reused by quiz, review and mistakes screens. */
export function QuestionView({ question: q, selected, onSelect, reveal }: Props) {
  const isFigure = q.choices.some((c) => c.figure);
  const hebrewBlock = q.codeBlock && /[֐-׿]/.test(q.codeBlock) && q.section === 'attention' && q.subtype === 'ספירת תווים';
  return (
    <div dir={q.dir} lang={q.dir === 'ltr' ? 'en' : undefined}>
      {q.passage && <div className="passage">{q.passage}</div>}
      <div className="question-prompt">{q.prompt}</div>
      {q.codeBlock && <div className={`code-block${hebrewBlock ? ' hebrew' : ''}`}>{q.codeBlock}</div>}
      {q.figure && <FigureBoard visual={q.figure} qid={q.id} />}
      <div className={`choices${isFigure ? ' figures' : ''}`} role="radiogroup">
        {q.choices.map((c, i) => {
          let cls = 'choice';
          if (isFigure) cls += ' figure-choice';
          if (reveal) {
            if (i === q.answerIndex) cls += ' correct';
            else if (i === selected) cls += ' wrong';
          } else if (i === selected) cls += ' selected';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === selected}
              className={cls}
              disabled={reveal || !onSelect}
              onClick={() => onSelect?.(i)}
            >
              <span className="letter">{LETTERS[i]}</span>
              {c.figure ? (
                <div className="fig-cell" style={{ width: '100%', border: 'none' }}>
                  <FigureSvg cell={c.figure} uid={`${q.id}-c${i}`} />
                </div>
              ) : (
                <span>{c.text}</span>
              )}
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className={`feedback ${selected === q.answerIndex ? 'good' : 'bad'}`}>
          <strong>{selected === q.answerIndex ? '✓ נכון!' : selected < 0 ? '⏭ לא נענתה' : '✗ לא נכון'}</strong>{' '}
          <span>{q.explanation}</span>
        </div>
      )}
    </div>
  );
}
