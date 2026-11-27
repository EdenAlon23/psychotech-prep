import type { NavigateFunction } from 'react-router-dom';
import type { QuizPlan } from '../models/attempt';
import { checkAccess, featureForPlan, recordUsage } from './entitlements';
import { setActivePlan } from './session';

/**
 * The one way pages start a quiz. Keeps the paywall decision out of the pages (they only build plans)
 * and guarantees every entry point is counted the same way.
 */
export function launchPlan(plan: QuizPlan, navigate: NavigateFunction): void {
  const { feature, amount } = featureForPlan(plan);
  const access = checkAccess(feature, amount);
  if (!access.allowed) {
    navigate(`/upgrade?feature=${feature}&reason=${access.reason}`);
    return;
  }
  recordUsage(feature, amount);
  setActivePlan(plan);
  navigate('/quiz');
}
