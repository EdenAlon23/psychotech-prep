import type { Question, SectionId } from './question';

export type AttemptMode = 'practice' | 'simulation' | 'focus' | 'mistakes';

export interface AnswerRecord {
  questionId: string;
  section: SectionId;
  subtype: string;
  difficulty: number;
  /** -1 = skipped / unanswered. */
  chosenIndex: number;
  correct: boolean;
  timeMs: number;
}

export interface SectionResult {
  section: SectionId;
  total: number;
  correct: number;
  answered: number;
  timeMs: number;
  timedOut: boolean;
}

export interface Attempt {
  id: string;
  mode: AttemptMode;
  title: string;
  simulationId?: string;
  startedAt: number;
  finishedAt: number;
  answers: AnswerRecord[];
  sectionResults: SectionResult[];
  /** Snapshot of the questions so results can be reviewed later (generated ones are not reproducible by id). */
  questions: Question[];
}

/** A block of a quiz: one section with its own timer (simulations) or untimed (practice). */
export interface QuizBlock {
  section: SectionId;
  title: string;
  timeLimitSec?: number;
  questions: Question[];
}

export interface QuizPlan {
  mode: AttemptMode;
  title: string;
  simulationId?: string;
  /** Practice-like modes show the answer immediately after each question. */
  immediateFeedback: boolean;
  blocks: QuizBlock[];
}

export interface MistakeEntry {
  question: Question;
  chosenIndex: number;
  at: number;
  /** Times the question was answered correctly when retried from the notebook. */
  fixedCount: number;
}
