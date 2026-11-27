import { useState } from 'react';
import type { VocabEntry, VocabProgress } from '../../models/vocab';
import { VOCAB_CATEGORIES } from '../../data/vocabulary';
import { isMissed, statusOf } from '../../services/vocab';

interface Props {
  entries: VocabEntry[];
  progress: VocabProgress;
  hideMeaning: boolean;
  onToggleKnown: (id: string, known: boolean) => void;
}

const STATUS_LABEL = { new: 'חדש', learning: 'בלמידה', known: 'ידוע' } as const;
const LEVEL_LABEL = ['', 'בסיסי', 'בינוני', 'מתקדם'];

/** Reading view ("דף לימוד"): grouped by category, and by relation inside connectors. Print-friendly. */
export function VocabList({ entries, progress, hideMeaning, onToggleKnown }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const reveal = (id: string) => setRevealed((r) => new Set(r).add(id));

  if (entries.length === 0) return <div className="card empty">לא נמצאו מילים לפי הסינון.</div>;

  return (
    <div className="vocab-list">
      {VOCAB_CATEGORIES.map((cat) => {
        const list = entries.filter((e) => e.category === cat.id);
        if (list.length === 0) return null;
        const groups = cat.id === 'connectors' ? [...new Set(list.map((e) => e.group ?? ''))] : [''];
        return (
          <section key={cat.id} className="card vocab-section">
            <h2>{cat.icon} {cat.title} <span className="small muted">({list.length})</span></h2>
            <p className="small muted">{cat.description}</p>
            {groups.map((g) => (
              <div key={g}>
                {g && <h3 className="vocab-group">{g}</h3>}
                <ul className="vocab-items">
                  {list.filter((e) => !g || e.group === g).map((e) => {
                    const st = progress[e.id];
                    const status = statusOf(st);
                    const hidden = hideMeaning && !revealed.has(e.id);
                    return (
                      <li key={e.id} className={`vocab-item status-${status}`}>
                        <div className="vocab-head">
                          <span className="vocab-term">{cat.id === 'antonyms' ? `${e.term} ↔` : e.term}</span>
                          <span className="vocab-badges no-print">
                            {isMissed(st) && <span className="chip bad">טעית בזה</span>}
                            {status !== 'new' && <span className={`chip ${status === 'known' ? 'good' : 'warn'}`}>{STATUS_LABEL[status]}</span>}
                            <span className="chip" title="רמת קושי">{LEVEL_LABEL[e.level]}</span>
                          </span>
                        </div>
                        {hidden ? (
                          <button className="vocab-reveal no-print" onClick={() => reveal(e.id)}>הצג פירוש 👁</button>
                        ) : null}
                        <div className={`vocab-body${hidden ? ' is-hidden' : ''}`}>
                          <div className="vocab-meaning">{e.meaning}</div>
                          {e.example && <div className="vocab-example">"{e.example}"</div>}
                          {e.note && e.note !== e.meaning && <div className="vocab-note">{e.note}</div>}
                        </div>
                        {cat.id !== 'grammar' && (
                          <button className={`vocab-known no-print${status === 'known' ? ' on' : ''}`} onClick={() => onToggleKnown(e.id, status !== 'known')} aria-pressed={status === 'known'}>
                            {status === 'known' ? '✓ יודע' : 'סמן כידוע'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
