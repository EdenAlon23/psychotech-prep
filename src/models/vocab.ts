import type { Difficulty } from './question';

/**
 * Vocabulary ("אוצר מילים") domain types. The glossary is read-first study
 * material; each entry can also be linked to a practice question so that
 * mistakes in the quiz feed straight back into the flashcard deck.
 */
export type VocabCategory = 'words' | 'antonyms' | 'idioms' | 'connectors' | 'grammar';

export interface VocabEntry {
  id: string;
  category: VocabCategory;
  term: string;
  meaning: string;
  example?: string;
  note?: string;
  /** Sub-grouping shown in the list (e.g. connector relation "ניגוד"). */
  group?: string;
  level: Difficulty;
  /** Practice question that tests exactly this entry (if any). */
  questionId?: string;
}

export interface VocabCategoryMeta {
  id: VocabCategory;
  title: string;
  icon: string;
  description: string;
}

/**
 * Leitner box per entry. box 0 = new / forgotten, 4 = mastered.
 * `due` is a timestamp; an entry is due for review when due <= now.
 */
export interface VocabCardState {
  box: number;
  due: number;
  reviews: number;
  lapses: number;
  /** Set when answered wrong / forgotten; cleared once the entry reaches the known box. */
  missedAt?: number;
}

export type VocabProgress = Record<string, VocabCardState>;
export type VocabStatus = 'new' | 'learning' | 'known';
