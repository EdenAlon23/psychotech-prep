import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EXAM_BY_ID } from '../data/exams';
import type { FeatureKey } from '../models/plan';
import { checkoutUrlFor, currentPlan, getLicense, paywallEnabled } from '../services/entitlements';
import { activateLicense } from '../services/license';
import { currentExam } from '../services/profile';
import { useT } from '../i18n';

const FEATURE_NAMES: Partial<Record<FeatureKey, [string, string]>> = {
  simulation_all: ['כל הסימולציות', 'all practice tests'],
  simulation_short: ['סימולציה מקוצרת', 'short practice test'],
  practice_questions: ['תרגול לפי נושאים', 'topic practice'],
  focus_practice: ['תרגול ממוקד חולשות', 'weak-spot practice'],
  interview_coach: ['הכנה לראיון', 'interview prep'],
  personality_analysis: ['ניתוח שאלון אישיות', 'personality analysis'],
};

/** One pass per exam: the page always sells the pass for the exam the learner is preparing for. */
export default function UpgradePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, locale } = useT();
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const reason = params.get('reason');
  const feature = params.get('feature') as FeatureKey | null;
  const exam = currentExam();
  const license = getLicense();
  const plan = currentPlan(exam.id);
  const checkoutUrl = checkoutUrlFor(exam.id);
  const price = import.meta.env.VITE_PASS_PRICE ?? '';
  const days = import.meta.env.VITE_PASS_DAYS ?? '90';
  const otherExamPass = license?.examId && license.examId !== exam.id ? EXAM_BY_ID[license.examId] : null;

  const reasons: Record<string, string> = {
    daily_limit: t('הגעתם למכסה היומית של המסלול החינמי. היא מתחדשת מחר — או שדרגו לגישה מלאה.', "You've reached today's free limit. It resets tomorrow — or upgrade for full access."),
    locked: t(`החלק הזה כלול במנוי ${exam.nameShort}.`, `This is part of the ${exam.nameShort} pass.`),
  };
  const perks = [
    t(`כל הסימולציות במבנה ${exam.nameShort}, בלי הגבלה`, `Unlimited ${exam.nameShort}-style practice tests`),
    t('תרגול ללא הגבלה בכל נושאי המבחן', 'Unlimited practice in every section'),
    t('תרגול אדפטיבי שמזהה את החולשות שלכם', 'Adaptive practice that targets your weak spots'),
    ...(exam.extras.includes('interview') ? [t('הכנה לראיון: שאלות, STAR ובנק סיפורים', 'Interview prep')] : []),
    ...(exam.extras.includes('personality') ? [t('ניתוח עקביות לשאלון האישיות', 'Personality questionnaire analysis')] : []),
  ];

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await activateLicense(key);
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error }); return; }
    const l = getLicense();
    if (l?.examId && l.examId !== exam.id) {
      setMsg({ ok: true, text: t(`הקוד הופעל עבור ${EXAM_BY_ID[l.examId].nameShort}. כדי להשתמש בו, החליפו מבחן.`, `Activated for the ${EXAM_BY_ID[l.examId].nameShort}. Switch exam to use it.`) });
      return;
    }
    setMsg({ ok: true, text: t('המנוי הופעל ✓', 'Pass activated ✓') });
    setTimeout(() => navigate(-1), 900);
  };

  if (!paywallEnabled()) {
    return (
      <div className="card empty" style={{ maxWidth: 560, marginInline: 'auto' }}>
        <h1>{t('כל האתר פתוח בחינם כרגע 🎉', 'Everything is free right now 🎉')}</h1>
        <p className="muted">{t('אין צורך בשדרוג.', 'No upgrade needed.')}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div className="page-head">
        <h1>{exam.icon} {t(`מנוי ${exam.nameShort}`, `${exam.nameShort} pass`)}</h1>
        {reason && <p className="chip warn">{reasons[reason] ?? ''}{feature && FEATURE_NAMES[feature] ? ` (${t(...FEATURE_NAMES[feature]!)})` : ''}</p>}
      </div>

      <div className="card">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>{t(`גישה מלאה ל-${days} יום`, `Full access for ${days} days`)}</h2>
          {price && <span className="chip primary">{price} · {t('תשלום חד-פעמי', 'one-time payment')}</span>}
        </div>
        <p className="muted small">{t(`בלי מנוי מתחדש: משלמים פעם אחת לתקופת ההכנה ל${exam.nameShort}. כל מבחן נרכש בנפרד.`, `No subscription: pay once for your ${exam.nameShort} prep period. Each exam is sold separately.`)}</p>
        <ul className="tips">{perks.map((p) => <li key={p}>{p}</li>)}</ul>
        {plan === 'pass' && license ? (
          <p className="chip good">{t('יש לכם מנוי פעיל עד', 'Your pass is active until')} {new Date(license.validUntil).toLocaleDateString(locale)}</p>
        ) : checkoutUrl ? (
          <a className="btn" href={checkoutUrl} target="_blank" rel="noopener noreferrer">{t('לרכישה ←', 'Buy →')}</a>
        ) : (
          <p className="chip">{t('הרכישה תיפתח בקרוב', 'Purchasing opens soon')}</p>
        )}
        {otherExamPass && (
          <p className="small muted mt" style={{ marginBottom: 0 }}>
            {t(`יש לכם מנוי פעיל ל${otherExamPass.nameShort}.`, `You have an active ${otherExamPass.nameShort} pass.`)}{' '}
            <Link to="/start">{t('להחלפת מבחן', 'Switch exam')}</Link>
          </p>
        )}
      </div>

      <form className="card" onSubmit={activate}>
        <label htmlFor="license">{t('כבר רכשתם? הדביקו את קוד ההפעלה מהמייל', 'Already bought? Paste the key from your email')}</label>
        <input id="license" type="text" dir="ltr" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" />
        <button className="btn mt" type="submit" disabled={busy || key.trim().length < 16}>{busy ? t('בודק…', 'Checking…') : t('הפעלה', 'Activate')}</button>
        {msg && <p className={`chip mt ${msg.ok ? 'good' : 'bad'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}
