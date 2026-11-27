import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { FeatureKey } from '../models/plan';
import { checkAccess } from '../services/entitlements';

/** Wraps a whole page or section that is part of the paid plan. Renders children when allowed. */
export default function PremiumGate({ feature, title, children }: { feature: FeatureKey; title: string; children: ReactNode }) {
  const access = checkAccess(feature, 0);
  if (access.allowed) return <>{children}</>;
  return (
    <div className="card empty" style={{ maxWidth: 560, marginInline: 'auto' }}>
      <h2>🔒 {title}</h2>
      <p className="muted">החלק הזה כלול במנוי המבחן. כל התרגול הבסיסי נשאר חינמי.</p>
      <Link className="btn" to={`/upgrade?feature=${feature}`}>לפרטים ושדרוג</Link>
    </div>
  );
}
