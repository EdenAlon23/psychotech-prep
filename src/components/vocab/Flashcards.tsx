import { useCallback, useEffect, useState } from 'react';
import type { VocabEntry } from '../../models/vocab';
import { VOCAB_CATEGORY_BY_ID } from '../../data/vocabulary';

interface Props {
  deck: VocabEntry[];
  onReview: (entry: VocabEntry, knew: boolean) => void;
  onFinish: (result: { knew: VocabEntry[]; forgot: VocabEntry[] }) => void;
}

/**
 * One pass over the deck. Forgotten cards are re-queued at the end of the
 * same session (classic Leitner "box 1 again"), so the session only ends
 * once every card was recalled at least once.
 * Keyboard: Space/Enter = flip, → or 1 = didn't know, ← or 2 = knew (RTL layout).
 */
export function Flashcards({ deck, onReview, onFinish }: Props) {
  const [queue, setQueue] = useState<VocabEntry[]>(deck);
  const [flipped, setFlipped] = useState(false);
  const [knew, setKnew] = useState<VocabEntry[]>([]);
  const [forgot, setForgot] = useState<VocabEntry[]>([]);
  const card = queue[0];
  const done = deck.length - queue.length;

  const answer = useCallback((k: boolean) => {
    if (!card) return;
    onReview(card, k);
    const nextKnew = k && !forgot.some((f) => f.id === card.id) ? [...knew, card] : knew;
    const nextForgot = !k && !forgot.some((f) => f.id === card.id) ? [...forgot, card] : forgot;
    const rest = queue.slice(1);
    const nextQueue = k ? rest : [...rest, card];
    setKnew(nextKnew);
    setForgot(nextForgot);
    setFlipped(false);
    setQueue(nextQueue);
    if (nextQueue.length === 0) onFinish({ knew: nextKnew, forgot: nextForgot });
  }, [card, queue, knew, forgot, onReview, onFinish]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.closest('input, select, textarea')) return;
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && (ev.key === 'ArrowLeft' || ev.key === '2')) answer(true);
      else if (flipped && (ev.key === 'ArrowRight' || ev.key === '1')) answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, answer]);

  if (!card) return null;
  const cat = VOCAB_CATEGORY_BY_ID[card.category];
  const prompt = card.category === 'antonyms' ? `מהו ההפך של "${card.term}"?` : card.category === 'connectors' ? `איזה יחס מביעה "${card.term}"?` : card.term;

  return (
    <div className="flash-wrap">
      <div className="row spread small muted mb">
        <span>{cat.icon} {cat.title}</span>
        <span>{Math.min(done + 1, deck.length)} / {deck.length}{queue.length > deck.length - done ? ` · ${queue.length - (deck.length - done)} לחזרה` : ''}</span>
      </div>
      <div className="progress mb"><span style={{ width: `${(done / deck.length) * 100}%` }} /></div>

      <button className={`flashcard${flipped ? ' flipped' : ''}`} onClick={() => setFlipped((f) => !f)} aria-live="polite">
        <span className="flash-term">{prompt}</span>
        {flipped ? (
          <span className="flash-back">
            <span className="flash-meaning">{card.meaning}</span>
            {card.example && <span className="flash-example">"{card.example}"</span>}
            {card.note && card.note !== card.meaning && <span className="flash-note">{card.note}</span>}
          </span>
        ) : (
          <span className="flash-hint">נסה להיזכר, ואז הקש כדי לראות את התשובה</span>
        )}
      </button>

      {flipped ? (
        <div className="flash-actions">
          <button className="btn btn-danger" onClick={() => answer(false)}>✗ לא ידעתי</button>
          <button className="btn btn-good" onClick={() => answer(true)}>✓ ידעתי</button>
        </div>
      ) : (
        <button className="btn btn-block mt" onClick={() => setFlipped(true)}>הצג תשובה</button>
      )}
      <p className="small muted center mt hide-mobile">מקלדת: רווח = הפוך · → לא ידעתי · ← ידעתי</p>
    </div>
  );
}
