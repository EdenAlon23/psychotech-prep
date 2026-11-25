import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionView } from '../components/QuestionView';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import type { SectionId } from '../models/question';
import { mistakesPlan } from '../services/questionEngine';
import { setActivePlan } from '../services/session';
import { getMistakes, removeMistake } from '../services/storage';
import { shuffle, createRng, randomSeed } from '../utils/random';

export default function MistakesPage() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const mistakes = useMemo(() => getMistakes(), [version]);
  const [section, setSection] = useState<SectionId | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const filtered = mistakes.filter((m) => section === 'all' || m.question.section === section);

  const retry = () => {
    const qs = shuffle(createRng(randomSeed()), filtered.map((m) => m.question)).slice(0, 20);
    setActivePlan(mistakesPlan(qs));
    navigate('/quiz');
  };

  return (
    <div>
      <div className="page-head">
        <h1>מחברת טעויות</h1>
        <p>כל שאלה שטעית בה נשמרת כאן. כשתענה עליה נכון פעמיים ברצף בחזרה – היא "תסיים" ותצא מהמחברת.</p>
      </div>
      <div className="row spread mb">
        <div className="tabs" style={{ margin: 0 }}>
          <button className={section === 'all' ? 'active' : ''} onClick={() => setSection('all')}>הכול ({mistakes.length})</button>
          {SECTIONS.map((s) => {
            const n = mistakes.filter((m) => m.question.section === s.id).length;
            return n > 0 ? <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>{s.icon} {s.short} ({n})</button> : null;
          })}
        </div>
        {filtered.length > 0 && <button className="btn" onClick={retry}>תרגל שוב ({Math.min(20, filtered.length)})</button>}
      </div>
      {filtered.length === 0 && <div className="card empty">אין טעויות במחברת 🎉</div>}
      <div className="grid">
        {filtered.map((m) => (
          <div key={m.question.id} className="card">
            <div className="row spread">
              <div className="row">
                <span className="chip">{SECTION_BY_ID[m.question.section].short} · {m.question.subtype}</span>
                {m.fixedCount > 0 && <span className="chip good">✓ נענתה נכון {m.fixedCount}×</span>}
                <span className="small muted">{new Date(m.at).toLocaleDateString('he-IL')}</span>
              </div>
              <div className="row">
                <button className="btn btn-sm btn-ghost" onClick={() => setOpen(open === m.question.id ? null : m.question.id)}>{open === m.question.id ? 'הסתר' : 'הצג'}</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { removeMistake(m.question.id); setVersion((v) => v + 1); }}>הסר</button>
              </div>
            </div>
            {open === m.question.id ? (
              <div className="mt"><QuestionView question={m.question} selected={m.chosenIndex} reveal /></div>
            ) : (
              <p className="mt" style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{m.question.prompt.slice(0, 140)}{m.question.prompt.length > 140 ? '…' : ''}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
