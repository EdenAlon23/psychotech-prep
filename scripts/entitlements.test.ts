import assert from 'node:assert/strict';
import { decide, planFromLicense, OFFLINE_GRACE_MS, featureForPlan, examFromProductName, checkoutUrlFor } from '../src/services/entitlements';
assert.deepEqual(decide(null, 999), { allowed: true, remaining: null });
assert.deepEqual(decide(0, 0), { allowed: false, reason: 'locked' });
assert.deepEqual(decide(30, 20, 10), { allowed: true, remaining: 0 });
assert.deepEqual(decide(30, 25, 10), { allowed: false, reason: 'daily_limit' });
const now = Date.parse('2026-11-27T12:00:00Z');
const lic = { key: 'k'.repeat(20), plan: 'pass' as const, validUntil: '2027-01-01T00:00:00Z', checkedAt: now - 1000 };
assert.equal(planFromLicense(lic, now), 'pass');
assert.equal(planFromLicense({ ...lic, validUntil: '2026-01-01T00:00:00Z' }, now), 'free');
assert.equal(planFromLicense({ ...lic, checkedAt: now - OFFLINE_GRACE_MS - 1 }, now), 'free');
assert.equal(planFromLicense(null, now), 'free');
assert.deepEqual(featureForPlan({ mode: 'simulation', simulationId: 'full', title: '', immediateFeedback: false, blocks: [] }), { feature: 'simulation_all', amount: 1 });
assert.deepEqual(featureForPlan({ mode: 'practice', title: '', immediateFeedback: true, blocks: [{ section: 'math', title: '', questions: [{}, {}] as never }] }), { feature: 'practice_questions', amount: 2 });
// Per-exam passes: a SAT pass unlocks the SAT only; older keys without an exam unlock everything.
const satPass = { ...lic, examId: 'sat' as const };
assert.equal(planFromLicense(satPass, now, 'sat'), 'pass');
assert.equal(planFromLicense(satPass, now, 'gmat'), 'free');
assert.equal(planFromLicense(lic, now, 'gmat'), 'pass', 'legacy all-exam key');
assert.equal(planFromLicense({ ...satPass, validUntil: '2026-01-01T00:00:00Z' }, now, 'sat'), 'free');

// Product / variant names map to exams by whole word.
assert.equal(examFromProductName('Exam pass', 'SAT'), 'sat');
assert.equal(examFromProductName('Exam pass – Psychometric'), 'psychometric');
assert.equal(examFromProductName('מנוי פסיכוטכני'), 'psychotech');
assert.equal(examFromProductName('GMAT Focus pass'), 'gmat');
assert.equal(examFromProductName('Exam pass'), undefined);
assert.equal(examFromProductName(undefined, null), undefined);
assert.equal(examFromProductName('satisfaction bundle'), undefined, 'no partial-word matches');

// Checkout links: per-exam first, shared fallback.
assert.equal(checkoutUrlFor('sat', { VITE_CHECKOUT_URL_SAT: 'https://x/sat', VITE_CHECKOUT_URL: 'https://x/all' }), 'https://x/sat');
assert.equal(checkoutUrlFor('gmat', { VITE_CHECKOUT_URL_SAT: 'https://x/sat', VITE_CHECKOUT_URL: 'https://x/all' }), 'https://x/all');
assert.equal(checkoutUrlFor('gmat', {}), undefined);
console.log('entitlement checks passed');
