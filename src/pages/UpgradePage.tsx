import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { FeatureKey } from '../models/plan';
import { currentPlan, getLicense, paywallEnabled } from '../services/entitlements';
import { activateLicense } from '../services/license';

const REASONS: Record<string, string> = {
  daily_limit: 'הגעתם למכסה היומית של המסלול החינמי. היא מתחדשת מחר — או שדרגו לגישה מלאה.',
  locked: 'החלק הזה כלול במנוי המבחן.',
};

const FEATURE_NAMES: Partial<Record<FeatureKey, string>> = {
  simulation_all: 'כל הסימולציות',
  simulation_short: 'סימולציה מקוצרת',
  practice_questions: 'תרגול לפי נושאים',
  focus_practice: 'תרגול ממוקד חולשות',
  interview_coach: 'הכנה לראיון',
  personality_analysis: 'ניתוח שאלון אישיות',
};

const PERKS = [
  '5 סימולציות מלאות עם טיימר לכל פרק, בלי הגבלה',
  'תרגול ללא הגבלה בכל 8 הפרקים',
  'תרגול אדפטיבי שמזהה את החולשות שלכם',
  'הכנה לראיון עם מאבחנת: 35 שאלות, STAR ובנק סיפורים',
  'ניתוח עקביות לשאלון האישיות',
];

export default function UpgradePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const reason = params.get('reason');
  const feature = params.get('feature') as FeatureKey | null;
  const license = getLicense();
  const plan = currentPlan();
  const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL;
  const price = import.meta.env.VITE_PASS_PRICE ?? '';
  const days = import.meta.env.VITE_PASS_DAYS ?? '90';

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await activateLicense(key);
    setBusy(false);
    setMsg(error ? { ok: false, text: error } : { ok: true, text: 'המנוי הופעל ✓' });
    if (!error) setTimeout(() => navigate(-1), 900);
  };

  if (!paywallEnabled()) {
    return (
      <div className="card empty" style={{ maxWidth: 560, marginInline: 'auto' }}>
        <h1>כל האתר פתוח בחינם כרגע 🎉</h1>
        <p className="muted">אין צורך בשדרוג.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div className="page-head">
        <h1>מנוי מבחן</h1>
        {reason && <p className="chip warn">{REASONS[reason] ?? ''}{feature && FEATURE_NAMES[feature] ? ` (${FEATURE_NAMES[feature]})` : ''}</p>}
      </div>

      <div className="card">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>גישה מלאה ל-{days} יום</h2>
          {price && <span className="chip primary">{price} · תשלום חד-פעמי</span>}
        </div>
        <p className="muted small">בלי מנוי מתחדש: משלמים פעם אחת לתקופת ההכנה.</p>
        <ul className="tips">{PERKS.map((p) => <li key={p}>{p}</li>)}</ul>
        {plan === 'pass' && license ? (
          <p className="chip good">יש לכם מנוי פעיל עד {new Date(license.validUntil).toLocaleDateString('he-IL')}</p>
        ) : checkoutUrl ? (
          <a className="btn" href={checkoutUrl} target="_blank" rel="noopener noreferrer">לרכישה ←</a>
        ) : (
          <p className="chip">הרכישה תיפתח בקרוב</p>
        )}
      </div>

      <form className="card" onSubmit={activate}>
        <label htmlFor="license">כבר רכשתם? הדביקו את קוד ההפעלה מהמייל</label>
        <input id="license" type="text" dir="ltr" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" />
        <button className="btn mt" type="submit" disabled={busy || key.trim().length < 16}>{busy ? 'בודק…' : 'הפעלה'}</button>
        {msg && <p className={`chip mt ${msg.ok ? 'good' : 'bad'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}
