import type { QuizPlan } from '../models/attempt';
import type { Access, FeatureKey, License, Limit, PlanId } from '../models/plan';
import { EXAMS, type ExamId } from '../data/exams';
import { currentExam } from './profile';

/**
 * Plans and their limits. The single place to change what is free and what is paid.
 *
 * Paywall is OFF unless the build sets VITE_PAYWALL=on, so today every user keeps full access.
 *
 * Passes are per exam: a pass bought for the SAT unlocks the SAT only. Limits are checked against
 * the exam the learner is currently preparing for (the profile).
 *
 * Honest limitation: this is a static site, so client-side gating can be bypassed by anyone who edits
 * localStorage. That is acceptable for a low-price product (the content itself is generated in the
 * browser anyway). If revenue justifies it, move question generation for paid modes behind an API
 * (e.g. a Supabase Edge Function that checks the license) — the rest of this file stays the same.
 */
export const PLAN_LIMITS: Record<PlanId, Record<FeatureKey, Limit>> = {
  free: {
    simulation_short: 1,      // one short simulation a day
    simulation_all: 0,
    practice_questions: 30,   // per day
    focus_practice: 0,
    mistakes_retry: null,
    interview_coach: 0,
    personality_analysis: 0,
  },
  pass: {
    simulation_short: null,
    simulation_all: null,
    practice_questions: null,
    focus_practice: null,
    mistakes_retry: null,
    interview_coach: null,
    personality_analysis: null,
  },
};

export const paywallEnabled = (): boolean => import.meta.env.VITE_PAYWALL === 'on';

const LICENSE_KEY = 'pp.license.v1';
const USAGE_KEY = 'pp.usage.v1';
/** Allow offline use for this long after the last successful license check. */
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

// ---------- License (written by services/license.ts after online validation) ----------
export function getLicense(): License | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    return raw ? (JSON.parse(raw) as License) : null;
  } catch {
    return null;
  }
}

export function saveLicense(license: License | null): void {
  try {
    if (license) localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
    else localStorage.removeItem(LICENSE_KEY);
  } catch {
    /* storage disabled: user stays on free */
  }
}

/** Pure: which plan does this license give right now, for this exam? */
export function planFromLicense(license: License | null, now = Date.now(), examId?: ExamId): PlanId {
  if (!license) return 'free';
  if (Date.parse(license.validUntil) < now) return 'free';
  if (now - license.checkedAt > OFFLINE_GRACE_MS) return 'free';
  // A pass for one exam doesn't unlock another; keys without an exam (older passes) unlock all.
  if (license.examId && examId && license.examId !== examId) return 'free';
  return license.plan;
}

export const currentPlan = (examId: ExamId = currentExam().id): PlanId =>
  (paywallEnabled() ? planFromLicense(getLicense(), Date.now(), examId) : 'pass');

/**
 * Pure: which exam a purchased product is for, from the provider's product / variant names
 * (e.g. variant "SAT" or product "Exam pass – Psychometric"). Undefined = not exam-specific.
 */
export function examFromProductName(...names: (string | null | undefined)[]): ExamId | undefined {
  const text = names.filter(Boolean).join(' ').toLowerCase();
  if (!text) return undefined;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Whole-word match (letters in any script), so "psychotech" never matches inside "psychometric".
  const has = (name: string) => new RegExp(`(^|[^\\p{L}])${escape(name.toLowerCase())}($|[^\\p{L}])`, 'u').test(text);
  return EXAMS.find((e) => [e.id, e.nameShort, e.name].some(has))?.id;
}

/** Checkout link for an exam's pass: its own link if configured, else the shared one. */
export function checkoutUrlFor(examId: ExamId, env: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>): string | undefined {
  return env[`VITE_CHECKOUT_URL_${examId.toUpperCase()}`] || env.VITE_CHECKOUT_URL || undefined;
}

// ---------- Daily usage ----------
type Usage = { day: string; counts: Partial<Record<FeatureKey, number>> };
const today = () => new Date().toISOString().slice(0, 10);

function readUsage(): Usage {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY) ?? 'null') as Usage | null;
    return u && u.day === today() ? u : { day: today(), counts: {} };
  } catch {
    return { day: today(), counts: {} };
  }
}

/** Pure decision, exported for tests. */
export function decide(limit: Limit, used: number, amount = 1): Access {
  if (limit === null) return { allowed: true, remaining: null };
  if (limit === 0) return { allowed: false, reason: 'locked' };
  const remaining = limit - used;
  return remaining >= amount ? { allowed: true, remaining: remaining - amount } : { allowed: false, reason: 'daily_limit' };
}

export function checkAccess(feature: FeatureKey, amount = 1): Access {
  return decide(PLAN_LIMITS[currentPlan()][feature], readUsage().counts[feature] ?? 0, amount);
}

export function recordUsage(feature: FeatureKey, amount = 1): void {
  const u = readUsage();
  u.counts[feature] = (u.counts[feature] ?? 0) + amount;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
}

/** Which feature (and how many units) a quiz plan consumes. */
export function featureForPlan(plan: QuizPlan): { feature: FeatureKey; amount: number } {
  const questions = plan.blocks.reduce((n, b) => n + b.questions.length, 0);
  switch (plan.mode) {
    case 'simulation':
      return { feature: plan.simulationId === 'short' ? 'simulation_short' : 'simulation_all', amount: 1 };
    case 'focus':
      return { feature: 'focus_practice', amount: 1 };
    case 'mistakes':
      return { feature: 'mistakes_retry', amount: 1 };
    default:
      return { feature: 'practice_questions', amount: questions };
  }
}
