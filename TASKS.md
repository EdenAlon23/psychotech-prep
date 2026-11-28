# Multi-exam platform — remaining steps (branch `feature/multi-exam-platform`)

Done (step 1): exam catalogue `src/data/exams.ts` (psychotechnic, psychometric, Tzav Rishon/Dapar, police, SAT, GMAT),
English bank, `quantEn` + `dataSufficiency` generators, LTR questions, `npm test` content checks.

## Step 2 — personalization
- [x] `src/services/profile.ts`: { examId, testDate, targetScore, level 1–3, minutesPerDay, employer?, provider?, roleType?, components[] } in localStorage `pp.profile.v1`.
- [x] `/start` onboarding: pick exam (cards from EXAMS), date, target, minutes/day; job tests also ask employer, assessment company and components (cognitive / personality / interview / group).
- [x] Adaptive difficulty `src/services/adaptive.ts`: Elo-style ability per section from AnswerRecord.difficulty; `buildQuestions` prefers questions near the ability.
- [x] Study plan `src/services/plan.ts`: days until test → daily tasks weighted by exam section weight × weakness; full simulation weekly; taper 2 days before.
- [x] Score estimate per exam (`exam.score`), always labelled "הערכה".

## Step 3 — exam-aware UI
- [x] Header exam switcher; Home = countdown, today's plan, estimated score, strengths/weaknesses.
- [x] Practice/Simulations/Analytics show only the current exam's sections; simulations from `exam.simulation`.
- [x] `/exams/:id` landing pages (SEO, marketing), English UI for SAT/GMAT.
- [x] Luxury redesign + entrance/page-transition animations (respect prefers-reduced-motion), mobile-first.
- [ ] Paywall per exam pass (reuse entitlements.ts).

Rules: keep generators computing their own keys; every new generator gets a loop test in scripts/content.test.ts.
