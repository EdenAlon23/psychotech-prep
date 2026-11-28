import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { FeatureKey } from '../models/plan';
import { checkAccess } from '../services/entitlements';
import { currentExam } from '../services/profile';
import { useT } from '../i18n';

/** Wraps a whole page or section that is part of the paid plan. Renders children when allowed. */
export default function PremiumGate({ feature, title, children }: { feature: FeatureKey; title: string; children: ReactNode }) {
  const { t } = useT();
  const access = checkAccess(feature, 0);
  if (access.allowed) return <>{children}</>;
  const exam = currentExam();
  return (
    <div className="card empty" style={{ maxWidth: 560, marginInline: 'auto' }}>
      <h2>🔒 {title}</h2>
      <p className="muted">{t(`החלק הזה כלול במנוי ${exam.nameShort}. כל התרגול הבסיסי נשאר חינמי.`, `This is part of the ${exam.nameShort} pass. Basic practice stays free.`)}</p>
      <Link className="btn" to={`/upgrade?feature=${feature}`}>{t('לפרטים ושדרוג', 'Details and upgrade')}</Link>
    </div>
  );
}
