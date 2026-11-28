import type { ExamId } from '../data/exams';

/** Commercial plans. 'pass' = one-time payment for a fixed period (fits exam prep better than a subscription). */
export type PlanId = 'free' | 'pass';

/** Every paywall point in the app, in one list. */
export type FeatureKey =
  | 'simulation_short'      // the 25-minute simulation
  | 'simulation_all'        // full / Hebrew / verbal / quantitative simulations
  | 'practice_questions'    // questions per day in topic practice
  | 'focus_practice'        // adaptive "weak spots" practice
  | 'mistakes_retry'        // retrying the mistakes notebook
  | 'interview_coach'       // interview questions, STAR, story bank
  | 'personality_analysis'; // consistency / social-desirability analysis

/** null = unlimited, 0 = locked, n = daily limit. */
export type Limit = number | null;

export interface License {
  key: string;
  plan: PlanId;
  /** ISO date; access ends here. */
  validUntil: string;
  /** Last successful online check (ms). Offline use is allowed for a grace period after it. */
  checkedAt: number;
  /** The exam this pass was bought for. Missing = all exams (keys issued before per-exam passes). */
  examId?: ExamId;
}

export type Access =
  | { allowed: true; remaining: number | null }
  | { allowed: false; reason: 'locked' | 'daily_limit' };
