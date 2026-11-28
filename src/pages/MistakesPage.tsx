import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionView } from '../components/QuestionView';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import type { SectionId } from '../models/question';
import { mistakesPlan } from '../services/questionEngine';
import { launchPlan } from '../services/launcher';
import { getMistakes, removeMistake } from '../services/storage';
import { shuffle, createRng, randomSeed } from '../utils/random';
import { sectionText, useT } from '../i18n';

export default function MistakesPage() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const { t, lang, locale } = useT();
  const mistakes = useMemo(() => getMistakes(), [version]);
  const [section, setSection] = useState<SectionId | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const filtered = mistakes.filter((m) => section === 'all' || m.question.section === section);

  const retry = () => {
    const qs = shuffle(createRng(randomSeed()), filtered.map((m) => m.question)).slice(0, 20);
    launchPlan(mistakesPlan(qs), navigate);
  };

  return (
    <div>
      <div className="page-head">
        <h1>{t('מחברת טעויות', 'Mistakes notebook')}</h1>
        <p>{t('כל שאלה שטעית בה נשמרת כאן. כשתענה עליה נכון פעמיים ברצף בחזרה – היא "תסיים" ותצא מהמחברת.', 'Every question you miss is saved here. Answer it correctly twice in a row on review and it graduates out of the notebook.')}</p>
      </div>
      <div className="row spread mb">
        <div className="tabs" style={{ margin: 0 }}>
          <button className={section === 'all' ? 'active' : ''} onClick={() => setSection('all')}>{t('הכול', 'All')} ({mistakes.length})</button>
          {SECTIONS.map((s) => {
            const n = mistakes.filter((m) => m.question.section === s.id).length;
            return n > 0 ? <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>{s.icon} {sectionText(s, lang).short} ({n})</button> : null;
          })}
        </div>
        {filtered.length > 0 && <button className="btn" onClick={retry}>{t('תרגל שוב', 'Retry')} ({Math.min(20, filtered.length)})</button>}
      </div>
      {filtered.length === 0 && <div className="card empty">{t('אין טעויות במחברת 🎉', 'No mistakes in the notebook 🎉')}</div>}
      <div className="grid">
        {filtered.map((m) => (
          <div key={m.question.id} className="card">
            <div className="row spread">
              <div className="row">
                <span className="chip">{sectionText(SECTION_BY_ID[m.question.section], lang).short} · {m.question.subtype}</span>
                {m.fixedCount > 0 && <span className="chip good">✓ {t('נענתה נכון', 'answered correctly')} {m.fixedCount}×</span>}
                <span className="small muted">{new Date(m.at).toLocaleDateString(locale)}</span>
              </div>
              <div className="row">
                <button className="btn btn-sm btn-ghost" onClick={() => setOpen(open === m.question.id ? null : m.question.id)}>{open === m.question.id ? t('הסתר', 'Hide') : t('הצג', 'Show')}</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { removeMistake(m.question.id); setVersion((v) => v + 1); }}>{t('הסר', 'Remove')}</button>
              </div>
            </div>
            {open === m.question.id ? (
              <div className="mt"><QuestionView question={m.question} selected={m.chosenIndex} reveal /></div>
            ) : (
              <p className="mt" dir={m.question.dir} style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{m.question.prompt.slice(0, 140)}{m.question.prompt.length > 140 ? '…' : ''}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
